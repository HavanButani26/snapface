from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.event import Event
from app.models.photo import Photo
from app.models.photo_duplicate import PhotoDuplicate
from app.routers.auth import get_current_user
from app.models.user import User
from app.services.duplicate_service import compute_phash, find_duplicates
from app.services import cloudinary_service
import urllib.request
import io

router = APIRouter(prefix="/duplicates", tags=["duplicates"])


def scan_event_duplicates(event_id: str, db: Session):
    """Background task — scan all photos in event for duplicates."""
    try:
        photos = db.query(Photo).filter(
            Photo.event_id == event_id,
            Photo.sharpness_score != None,
        ).all()

        if len(photos) < 2:
            print(f"Not enough photos to scan for duplicates in event {event_id}")
            return

        print(f"Scanning {len(photos)} photos for duplicates...")

        # Download and hash all photos
        photos_data = []
        for photo in photos:
            try:
                img_bytes = urllib.request.urlopen(photo.url).read()
                phash = compute_phash(img_bytes)
                photos_data.append({
                    "id": str(photo.id),
                    "phash": phash,
                    "sharpness_score": photo.sharpness_score,
                    "face_count": photo.face_count,
                    "dominant_emotion": photo.dominant_emotion,
                })
            except Exception as e:
                print(f"Failed to process photo {photo.id}: {e}")

        # Find duplicates
        duplicate_pairs = find_duplicates(photos_data)

        # Clear old unresolved duplicates for this event
        db.query(PhotoDuplicate).filter(
            PhotoDuplicate.event_id == event_id,
            PhotoDuplicate.resolved == False,
        ).delete()
        db.commit()

        # Save new duplicates
        for pair in duplicate_pairs:
            dup = PhotoDuplicate(
                event_id=event_id,
                photo_id_a=pair["photo_id_a"],
                photo_id_b=pair["photo_id_b"],
                similarity=pair["similarity"],
                recommended_keep=pair["recommended_keep"],
            )
            db.add(dup)

        db.commit()
        print(f"Found {len(duplicate_pairs)} duplicate pairs in event {event_id}")

    except Exception as e:
        print(f"Duplicate scan error: {e}")


@router.post("/scan/{event_id}")
def scan_for_duplicates(
    event_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Trigger duplicate scan for an event."""
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.owner_id == current_user.id,
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    photo_count = db.query(Photo).filter(Photo.event_id == event_id).count()
    if photo_count < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 photos to scan")

    background_tasks.add_task(scan_event_duplicates, event_id, db)
    return {"message": f"Scanning {photo_count} photos for duplicates in background..."}


@router.get("/{event_id}")
def get_duplicates(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all duplicate pairs for an event."""
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.owner_id == current_user.id,
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    dups = db.query(PhotoDuplicate).filter(
        PhotoDuplicate.event_id == event_id,
        PhotoDuplicate.resolved == False,
    ).order_by(PhotoDuplicate.similarity.desc()).all()

    result = []
    for dup in dups:
        photo_a = db.query(Photo).filter(Photo.id == dup.photo_id_a).first()
        photo_b = db.query(Photo).filter(Photo.id == dup.photo_id_b).first()
        if not photo_a or not photo_b:
            continue

        result.append({
            "id": str(dup.id),
            "similarity": dup.similarity,
            "similarity_percent": f"{round(dup.similarity * 100, 1)}%",
            "recommended_keep": str(dup.recommended_keep) if dup.recommended_keep else None,
            "photo_a": {
                "id": str(photo_a.id),
                "url": photo_a.url,
                "thumbnail_url": photo_a.thumbnail_url,
                "sharpness_score": photo_a.sharpness_score,
                "face_count": photo_a.face_count,
                "dominant_emotion": photo_a.dominant_emotion,
                "scene_category": photo_a.scene_category,
            },
            "photo_b": {
                "id": str(photo_b.id),
                "url": photo_b.url,
                "thumbnail_url": photo_b.thumbnail_url,
                "sharpness_score": photo_b.sharpness_score,
                "face_count": photo_b.face_count,
                "dominant_emotion": photo_b.dominant_emotion,
                "scene_category": photo_b.scene_category,
            },
        })

    return {
        "total": len(result),
        "duplicates": result,
    }


@router.post("/resolve/{duplicate_id}")
def resolve_duplicate(
    duplicate_id: str,
    keep_photo_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Resolve a duplicate pair — delete one photo and mark pair as resolved.
    keep_photo_id: which photo to keep (delete the other one)
    """
    dup = db.query(PhotoDuplicate).filter(
        PhotoDuplicate.id == duplicate_id
    ).first()
    if not dup:
        raise HTTPException(status_code=404, detail="Duplicate pair not found")

    # Verify ownership
    event = db.query(Event).filter(
        Event.id == dup.event_id,
        Event.owner_id == current_user.id,
    ).first()
    if not event:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Determine which photo to delete
    delete_id = str(dup.photo_id_a) if keep_photo_id == str(dup.photo_id_b) else str(dup.photo_id_b)

    # Delete from Cloudinary + DB
    photo_to_delete = db.query(Photo).filter(Photo.id == delete_id).first()
    if photo_to_delete:
        try:
            cloudinary_service.delete_photo(photo_to_delete.cloudinary_public_id)
        except Exception as e:
            print(f"Cloudinary delete error: {e}")
        db.delete(photo_to_delete)

    # Mark as resolved
    dup.resolved = True
    db.commit()

    return {"message": "Duplicate resolved", "deleted_photo_id": delete_id}


@router.post("/resolve-all/{event_id}")
def resolve_all_duplicates(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Auto-resolve all duplicates using AI recommendations."""
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.owner_id == current_user.id,
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    dups = db.query(PhotoDuplicate).filter(
        PhotoDuplicate.event_id == event_id,
        PhotoDuplicate.resolved == False,
        PhotoDuplicate.recommended_keep != None,
    ).all()

    deleted_count = 0
    for dup in dups:
        keep_id = str(dup.recommended_keep)
        delete_id = str(dup.photo_id_a) if keep_id == str(dup.photo_id_b) else str(dup.photo_id_b)

        photo_to_delete = db.query(Photo).filter(Photo.id == delete_id).first()
        if photo_to_delete:
            try:
                cloudinary_service.delete_photo(photo_to_delete.cloudinary_public_id)
            except Exception:
                pass
            db.delete(photo_to_delete)
            deleted_count += 1

        dup.resolved = True

    db.commit()
    return {"message": f"Auto-resolved {deleted_count} duplicates using AI recommendations"}