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
    """
    Runs after upload response is sent.
    Extracts face encodings + emotion + sharpness.
    """
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        return

    try:
        # Face encodings
        encodings = face_service.extract_encodings(image_bytes)
        # Sharpness
        sharpness = face_service.compute_sharpness(image_bytes)
        # Emotion
        emotion = emotion_service.detect_emotion(image_bytes)

        photo.face_encoding = encodings[0] if encodings else None
        photo.face_count = len(encodings)
        photo.sharpness_score = sharpness
        photo.dominant_emotion = emotion["dominant_emotion"]
        photo.emotion_scores = emotion["emotion_scores"]

        db.commit()
    except Exception as e:
        print(f"AI processing error for photo {photo_id}: {e}")


# ---------- Routes ----------

@router.post("/upload/{event_id}", status_code=201)
async def upload_photos(
    event_id: str,
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify event ownership
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.owner_id == current_user.id,
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    uploaded = []
    errors = []

    for file in files:
        try:
            # Validate type
            if file.content_type not in ALLOWED_TYPES:
                errors.append({"file": file.filename, "error": "Invalid file type"})
                continue

            image_bytes = await file.read()

            # Validate size
            if len(image_bytes) > MAX_SIZE_MB * 1024 * 1024:
                errors.append({"file": file.filename, "error": "File too large (max 20MB)"})
                continue

            # Upload to Cloudinary
            folder = f"snapface/{event_id}"
            result = cloudinary_service.upload_photo(image_bytes, folder=folder)

            # Save to DB (AI processing happens in background)
            photo = Photo(
                event_id=event_id,
                cloudinary_public_id=result["public_id"],
                url=result["url"],
                thumbnail_url=result["thumbnail_url"],
            )
            db.add(photo)
            db.commit()
            db.refresh(photo)

            # Queue AI processing (non-blocking)
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