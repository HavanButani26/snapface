from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from app.database import get_db
from app.models.event import Event
from app.models.photo import Photo
from app.routers.auth import get_current_user
from app.models.user import User
from app.services import cloudinary_service, face_service, emotion_service
import json
import os
from fastapi.responses import StreamingResponse
import zipfile
import urllib.request
import io

router = APIRouter(prefix="/photos", tags=["photos"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
MAX_SIZE_MB = 20


# ---------- Schemas ----------

class PhotoResponse(BaseModel):
    id: str
    event_id: str
    url: str
    thumbnail_url: Optional[str]
    dominant_emotion: Optional[str]
    emotion_scores: Optional[str]
    sharpness_score: Optional[float]
    face_count: int
    uploaded_at: str

    class Config:
        from_attributes = True


# ---------- Background task ----------

def process_photo_ai(photo_id: str, image_bytes: bytes, db: Session):
    import json as json_lib
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        return

    try:
        # Face encodings
        encodings = face_service.extract_encodings(image_bytes)
        sharpness = face_service.compute_sharpness(image_bytes)

        # Whole-image emotion (dominant face)
        emotion = emotion_service.detect_emotion(image_bytes)

        # Per-face emotions — run on each face individually
        per_face_emotions = []
        if encodings:
            print(f"Photo {photo_id}: detecting per-face emotions for {len(encodings)} faces")
            per_face_emotions = emotion_service.detect_per_face_emotions(image_bytes, encodings)

        photo.face_encoding = encodings[0] if encodings else None
        photo.all_face_encodings = json_lib.dumps(encodings) if encodings else None
        photo.face_count = len(encodings)
        photo.sharpness_score = sharpness
        photo.dominant_emotion = emotion["dominant_emotion"]
        photo.emotion_scores = emotion["emotion_scores"]
        photo.face_emotions = json_lib.dumps(per_face_emotions) if per_face_emotions else None

        db.commit()
        print(f"Photo {photo_id}: {len(encodings)} faces, emotions: {[f['emotion'] for f in per_face_emotions]}")

    except Exception as e:
        print(f"AI processing error for photo {photo_id}: {e}")
# ---------- Routes ----------

@router.post("/reprocess/{event_id}")
def reprocess_event_photos(
    event_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    import urllib.request
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.owner_id == current_user.id,
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    photos = db.query(Photo).filter(Photo.event_id == event_id).all()
    for photo in photos:
        try:
            image_bytes = urllib.request.urlopen(photo.url).read()
            background_tasks.add_task(
                process_photo_ai,
                str(photo.id),
                image_bytes,
                db,
            )
        except Exception as e:
            print(f"Failed to queue photo {photo.id}: {e}")

    return {"message": f"Reprocessing {len(photos)} photos in background"}

@router.get("/debug/{event_id}")
def debug_photos(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    photos = db.query(Photo).filter(Photo.event_id == event_id).all()
    return [
        {
            "id": str(p.id),
            "face_count": p.face_count,
            "dominant_emotion": p.dominant_emotion,
            "sharpness_score": p.sharpness_score,
            "has_encoding": p.face_encoding is not None,
            "has_all_encodings": p.all_face_encodings is not None,
        }
        for p in photos
    ]

from app.services.subscription_service import (
    get_or_create_subscription, check_storage_available, add_storage_used, format_bytes
)
from app.services.email_service import send_storage_limit_email

# Inside upload_photos, add BEFORE the file processing loop:
@router.post("/upload/{event_id}", status_code=201)
async def upload_photos(
    event_id: str,
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.owner_id == current_user.id,
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # ── Storage check ──
    sub = get_or_create_subscription(db, current_user)
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

    uploaded = []
    errors = []

    for file in files:
        try:
            if file.content_type not in ALLOWED_TYPES:
                errors.append({"file": file.filename, "error": "Invalid file type"})
                continue

            image_bytes = await file.read()

            if len(image_bytes) > MAX_SIZE_MB * 1024 * 1024:
                errors.append({"file": file.filename, "error": "File too large (max 20MB)"})
                continue

            # Check storage limit
            if not check_storage_available(sub, len(image_bytes)):
                # Send email notification
                background_tasks.add_task(
                    send_storage_limit_email,
                    current_user.email,
                    current_user.name,
                    format_bytes(sub.storage_used_bytes),
                    format_bytes(sub.storage_limit_bytes),
                    sub.plan_name.title(),
                    f"{frontend_url}/subscription",
                )
                errors.append({
                    "file": file.filename,
                    "error": f"Storage limit reached ({format_bytes(sub.storage_limit_bytes)}). Please upgrade your plan.",
                    "storage_limit_reached": True,
                })
                continue

            # Upload to Cloudinary
            folder = f"snapface/{event_id}"
            result = cloudinary_service.upload_photo(image_bytes, folder=folder)

            # Update storage usage
            add_storage_used(db, sub, len(image_bytes))

            photo = Photo(
                event_id=event_id,
                cloudinary_public_id=result["public_id"],
                url=result["url"],
                thumbnail_url=result["thumbnail_url"],
            )
            db.add(photo)
            db.commit()
            db.refresh(photo)

            background_tasks.add_task(
                process_photo_ai,
                str(photo.id),
                image_bytes,
                db,
            )

            uploaded.append({
                "id": str(photo.id),
                "url": photo.url,
                "thumbnail_url": photo.thumbnail_url,
                "filename": file.filename,
            })

        except Exception as e:
            errors.append({"file": file.filename, "error": str(e)})

    return {
        "uploaded": len(uploaded),
        "errors": errors,
        "photos": uploaded,
        "storage": {
            "used": format_bytes(sub.storage_used_bytes),
            "limit": format_bytes(sub.storage_limit_bytes),
            "percent": round((sub.storage_used_bytes / max(sub.storage_limit_bytes, 1)) * 100, 1),
        }
    }


@router.get("/event/{event_id}", response_model=list[PhotoResponse])
def get_event_photos(
    event_id: str,
    emotion: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.owner_id == current_user.id,
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    query = db.query(Photo).filter(Photo.event_id == event_id)

    # Emotion filter (our unique feature)
    if emotion and emotion != "all":
        query = query.filter(Photo.dominant_emotion == emotion)

    photos = query.order_by(Photo.uploaded_at.desc()).all()

    return [
        PhotoResponse(
            id=str(p.id),
            event_id=str(p.event_id),
            url=p.url,
            thumbnail_url=p.thumbnail_url,
            dominant_emotion=p.dominant_emotion,
            emotion_scores=p.emotion_scores,
            sharpness_score=p.sharpness_score,
            face_count=p.face_count,
            uploaded_at=str(p.uploaded_at),
        )
        for p in photos
    ]


@router.delete("/{photo_id}", status_code=204)
def delete_photo(
    photo_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    photo = db.query(Photo).join(Event).filter(
        Photo.id == photo_id,
        Event.owner_id == current_user.id,
    ).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    cloudinary_service.delete_photo(photo.cloudinary_public_id)
    db.delete(photo)
    db.commit()

@router.get("/download-all/{event_id}")
def download_all_photos(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download all photos of an event as a ZIP file."""
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.owner_id == current_user.id,
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    photos = db.query(Photo).filter(Photo.event_id == event_id).all()
    if not photos:
        raise HTTPException(status_code=404, detail="No photos found in this event")

    def generate_zip():
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
            for idx, photo in enumerate(photos):
                try:
                    img_data = urllib.request.urlopen(photo.url).read()
                    ext = photo.url.split(".")[-1].split("?")[0] or "jpg"
                    emotion = f"_{photo.dominant_emotion}" if photo.dominant_emotion else ""
                    filename = f"photo_{idx + 1:03d}{emotion}.{ext}"
                    zip_file.writestr(filename, img_data)
                except Exception as e:
                    print(f"Failed to add photo {photo.id} to ZIP: {e}")
        zip_buffer.seek(0)
        yield zip_buffer.read()

    safe_name = event.name[:30].replace(" ", "_").replace("/", "_")

    return StreamingResponse(
        generate_zip(),
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_name}_photos.zip"'
        }
    )
