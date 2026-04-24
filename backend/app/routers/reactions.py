from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models.photo_reaction import PhotoReaction
from app.models.photo import Photo
from app.models.event import Event
from app.routers.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/reactions", tags=["reactions"])

VALID_REACTIONS = ["❤️", "😍", "🔥", "👏", "😢"]


class ReactRequest(BaseModel):
    reaction: str
    gallery_token: Optional[str] = None


class PhotoReactionSummary(BaseModel):
    photo_id: str
    reactions: dict  # {"❤️": 5, "🔥": 3, ...}
    total: int
    my_reaction: Optional[str]  # what this gallery token reacted with


# ── Public routes (guest) ──

@router.post("/photo/{photo_id}")
def add_reaction(
    photo_id: str,
    payload: ReactRequest,
    db: Session = Depends(get_db),
):
    if payload.reaction not in VALID_REACTIONS:
        raise HTTPException(status_code=400, detail="Invalid reaction")

    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    # If same gallery token already reacted — toggle or change reaction
    if payload.gallery_token:
        existing = db.query(PhotoReaction).filter(
            PhotoReaction.photo_id == photo_id,
            PhotoReaction.gallery_token == payload.gallery_token,
        ).first()

        if existing:
            if existing.reaction == payload.reaction:
                # Same reaction → remove it (toggle off)
                db.delete(existing)
                db.commit()
                return {"action": "removed", "reaction": payload.reaction}
            else:
                # Different reaction → update it
                existing.reaction = payload.reaction
                db.commit()
                return {"action": "updated", "reaction": payload.reaction}

    # Add new reaction
    react = PhotoReaction(
        photo_id=photo_id,
        event_id=photo.event_id,
        gallery_token=payload.gallery_token,
        reaction=payload.reaction,
    )
    db.add(react)
    db.commit()
    return {"action": "added", "reaction": payload.reaction}


@router.get("/photo/{photo_id}")
def get_photo_reactions(
    photo_id: str,
    gallery_token: Optional[str] = None,
    db: Session = Depends(get_db),
):
    reactions = db.query(PhotoReaction).filter(
        PhotoReaction.photo_id == photo_id
    ).all()

    counts: dict = {}
    for r in reactions:
        counts[r.reaction] = counts.get(r.reaction, 0) + 1

    my_reaction = None
    if gallery_token:
        my = db.query(PhotoReaction).filter(
            PhotoReaction.photo_id == photo_id,
            PhotoReaction.gallery_token == gallery_token,
        ).first()
        if my:
            my_reaction = my.reaction

    return {
        "photo_id": photo_id,
        "reactions": counts,
        "total": sum(counts.values()),
        "my_reaction": my_reaction,
    }


@router.get("/event/{event_id}")
def get_event_reactions(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Photographer view — all reactions across the event."""
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.owner_id == current_user.id,
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    all_reactions = db.query(PhotoReaction).filter(
        PhotoReaction.event_id == event_id
    ).all()

    # Group by photo
    photo_map: dict = {}
    for r in all_reactions:
        pid = str(r.photo_id)
        if pid not in photo_map:
            photo_map[pid] = {"reactions": {}, "total": 0}
        photo_map[pid]["reactions"][r.reaction] = (
            photo_map[pid]["reactions"].get(r.reaction, 0) + 1
        )
        photo_map[pid]["total"] += 1

    # Top reacted photos
    top_reacted = sorted(
        [{"photo_id": k, **v} for k, v in photo_map.items()],
        key=lambda x: x["total"],
        reverse=True,
    )[:10]

    # Add photo details
    for item in top_reacted:
        photo = db.query(Photo).filter(Photo.id == item["photo_id"]).first()
        if photo:
            item["thumbnail_url"] = photo.thumbnail_url
            item["url"] = photo.url

    # Overall reaction counts
    overall: dict = {}
    for r in all_reactions:
        overall[r.reaction] = overall.get(r.reaction, 0) + 1

    return {
        "total_reactions": len(all_reactions),
        "overall": overall,
        "top_reacted_photos": top_reacted,
    }