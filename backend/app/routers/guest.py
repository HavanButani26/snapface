from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from app.database import get_db
from app.models.event import Event
from app.models.photo import Photo
from app.models.capsule import Capsule
from app.models.guest_gallery import GuestGallery
from app.services import face_service
from app.routers.auth import verify_password
from datetime import datetime
import json
import uuid
import secrets

router = APIRouter(prefix="/guest", tags=["guest"])


class GuestEventResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    event_date: Optional[str]
    is_password_protected: bool
    photographer_name: str
    total_photos: int
    has_capsule: bool
    capsule_is_locked: bool
    capsule_unlock_at: Optional[str]
    capsule_message: Optional[str]
    capsule_seconds_remaining: int


class MatchedPhotoResponse(BaseModel):
    id: str
    url: str
    thumbnail_url: Optional[str]
    dominant_emotion: Optional[str]
    face_count: int
    distance: float


class GalleryResponse(BaseModel):
    gallery_token: str
    gallery_url: str
    event_name: str
    photographer_name: str
    guest_name: Optional[str]
    photo_count: int
    view_count: int
    created_at: str
    photos: list[MatchedPhotoResponse]


@router.get("/event/{qr_token}", response_model=GuestEventResponse)
def get_guest_event(qr_token: str, db: Session = Depends(get_db)):
    event = db.query(Event).filter(
        Event.qr_token == qr_token,
        Event.is_active == True,
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found or inactive")

    total_photos = db.query(Photo).filter(Photo.event_id == event.id).count()

    capsule = db.query(Capsule).filter(Capsule.event_id == event.id).first()
    has_capsule = capsule is not None
    capsule_is_locked = False
    capsule_unlock_at = None
    capsule_message = None
    capsule_seconds_remaining = 0

    if capsule:
        now = datetime.now(tz=capsule.unlock_at.tzinfo)
        if not capsule.is_unlocked and now >= capsule.unlock_at:
            capsule.is_unlocked = True
            db.commit()
        capsule_is_locked = not capsule.is_unlocked
        capsule_unlock_at = capsule.unlock_at.isoformat()
        capsule_message = capsule.message
        if capsule_is_locked:
            diff = capsule.unlock_at - now
            capsule_seconds_remaining = max(0, int(diff.total_seconds()))

    return GuestEventResponse(
        id=str(event.id),
        name=event.name,
        description=event.description,
        event_date=str(event.event_date) if event.event_date else None,
        is_password_protected=event.is_password_protected,
        photographer_name=event.owner.name,
        total_photos=total_photos,
        has_capsule=has_capsule,
        capsule_is_locked=capsule_is_locked,
        capsule_unlock_at=capsule_unlock_at,
        capsule_message=capsule_message,
        capsule_seconds_remaining=capsule_seconds_remaining,
    )


@router.post("/verify-password/{qr_token}")
def verify_album_password(
    qr_token: str,
    password: str = Form(...),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(
        Event.qr_token == qr_token,
        Event.is_active == True,
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if not event.is_password_protected:
        return {"verified": True}
    if not verify_password(password, event.album_password):
        raise HTTPException(status_code=401, detail="Incorrect password")
    return {"verified": True}


@router.post("/match/{qr_token}")
async def match_selfie(
    qr_token: str,
    selfie: UploadFile = File(...),
    guest_name: Optional[str] = Form(None),
    password: Optional[str] = Form(None),
    emotion_filter: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(
        Event.qr_token == qr_token,
        Event.is_active == True,
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Capsule check
    capsule = db.query(Capsule).filter(Capsule.event_id == event.id).first()
    if capsule and not capsule.is_unlocked:
        now = datetime.now(tz=capsule.unlock_at.tzinfo)
        if now < capsule.unlock_at:
            raise HTTPException(status_code=403, detail="This album is locked in a time capsule.")
        else:
            capsule.is_unlocked = True
            db.commit()

    # Password check
    if event.is_password_protected:
        if not password:
            raise HTTPException(status_code=401, detail="Password required")
        if not verify_password(password, event.album_password):
            raise HTTPException(status_code=401, detail="Incorrect password")

    selfie_bytes = await selfie.read()
    selfie_encodings = face_service.extract_encodings(selfie_bytes)

    if not selfie_encodings:
        raise HTTPException(
            status_code=400,
            detail="No face detected in your selfie. Please try a clearer front-facing photo."
        )

    selfie_encoding = selfie_encodings[0]

    photos = db.query(Photo).filter(
        Photo.event_id == event.id,
        Photo.face_count > 0,
    ).all()

    if not photos:
        raise HTTPException(status_code=404, detail="No processed photos found yet.")

    matched = []
    for photo in photos:
        if photo.all_face_encodings:
            try:
                all_encodings = json.loads(photo.all_face_encodings)
            except Exception:
                all_encodings = [photo.face_encoding] if photo.face_encoding else []
        elif photo.face_encoding:
            all_encodings = [photo.face_encoding]
        else:
            continue

        per_face_emotions = []
        if photo.face_emotions:
            try:
                per_face_emotions = json.loads(photo.face_emotions)
            except Exception:
                pass

        best_dist = 1.0
        best_face_index = -1
        for face_idx, enc in enumerate(all_encodings):
            dist = face_service.cosine_distance(selfie_encoding, enc)
            if dist < best_dist:
                best_dist = dist
                best_face_index = face_idx

        is_match = best_dist < 0.55

        if is_match:
            person_emotion = None
            if per_face_emotions and best_face_index >= 0:
                for fe in per_face_emotions:
                    if fe.get("index") == best_face_index:
                        person_emotion = fe.get("emotion")
                        break
            if not person_emotion:
                person_emotion = photo.dominant_emotion

            matched.append({
                "id": str(photo.id),
                "url": photo.url,
                "thumbnail_url": photo.thumbnail_url,
                "dominant_emotion": person_emotion,
                "whole_photo_emotion": photo.dominant_emotion,
                "face_count": photo.face_count,
                "distance": round(best_dist, 4),
            })

    matched.sort(key=lambda x: x["distance"])

    if emotion_filter and emotion_filter != "all":
        matched = [m for m in matched if m.get("dominant_emotion") == emotion_filter]

    # ── Create guest gallery ──
    gallery_token = None
    gallery_url = None
    if matched:
        gallery_token = secrets.token_urlsafe(16)[:24]
        frontend_url = __import__("os").getenv("FRONTEND_URL", "http://localhost:3000")

        gallery = GuestGallery(
            gallery_token=gallery_token,
            event_id=event.id,
            guest_name=guest_name,
            matched_photo_ids=json.dumps([m["id"] for m in matched]),
        )
        db.add(gallery)
        db.commit()

        gallery_url = f"{frontend_url}/gallery/{gallery_token}"

    return {
        "matched": matched,
        "gallery_token": gallery_token,
        "gallery_url": gallery_url,
        "total_matched": len(matched),
    }


@router.get("/gallery/{gallery_token}", response_model=GalleryResponse)
def get_gallery(gallery_token: str, db: Session = Depends(get_db)):
    """Public route — anyone with the link can view this gallery."""
    gallery = db.query(GuestGallery).filter(
        GuestGallery.gallery_token == gallery_token
    ).first()

    if not gallery:
        raise HTTPException(status_code=404, detail="Gallery not found or expired")

    # Increment view count
    gallery.view_count += 1
    db.commit()

    # Get photos
    photo_ids = json.loads(gallery.matched_photo_ids)
    photos = db.query(Photo).filter(Photo.id.in_(photo_ids)).all()

    # Preserve original order
    photo_map = {str(p.id): p for p in photos}
    ordered_photos = [photo_map[pid] for pid in photo_ids if pid in photo_map]

    frontend_url = __import__("os").getenv("FRONTEND_URL", "http://localhost:3000")

    return GalleryResponse(
        gallery_token=gallery_token,
        gallery_url=f"{frontend_url}/gallery/{gallery_token}",
        event_name=gallery.event.name,
        photographer_name=gallery.event.owner.name,
        guest_name=gallery.guest_name,
        photo_count=len(ordered_photos),
        view_count=gallery.view_count,
        created_at=str(gallery.created_at),
        photos=[
            MatchedPhotoResponse(
                id=str(p.id),
                url=p.url,
                thumbnail_url=p.thumbnail_url,
                dominant_emotion=p.dominant_emotion,
                face_count=p.face_count,
                distance=0.0,
            )
            for p in ordered_photos
        ],
    )