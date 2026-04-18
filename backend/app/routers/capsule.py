from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.database import get_db
from app.models.event import Event
from app.models.capsule import Capsule
from app.routers.auth import get_current_user
from app.models.user import User
import json

router = APIRouter(prefix="/capsule", tags=["capsule"])


# ---------- Schemas ----------

class CapsuleCreate(BaseModel):
    unlock_at: datetime
    message: Optional[str] = None
    notify_emails: Optional[list[str]] = []

class CapsuleResponse(BaseModel):
    id: str
    event_id: str
    unlock_at: datetime
    message: Optional[str]
    is_unlocked: bool
    notify_emails: Optional[list[str]]
    created_at: datetime
    seconds_remaining: int

    class Config:
        from_attributes = True


# ---------- Helpers ----------

def build_capsule_response(capsule: Capsule) -> CapsuleResponse:
    now = datetime.utcnow().replace(tzinfo=capsule.unlock_at.tzinfo)
    diff = capsule.unlock_at - datetime.now(tz=capsule.unlock_at.tzinfo)
    seconds_remaining = max(0, int(diff.total_seconds()))
    emails = json.loads(capsule.notify_emails) if capsule.notify_emails else []
    return CapsuleResponse(
        id=str(capsule.id),
        event_id=str(capsule.event_id),
        unlock_at=capsule.unlock_at,
        message=capsule.message,
        is_unlocked=capsule.is_unlocked,
        notify_emails=emails,
        created_at=capsule.created_at,
        seconds_remaining=seconds_remaining,
    )


# ---------- Routes ----------

@router.post("/{event_id}", status_code=201)
def create_capsule(
    event_id: str,
    payload: CapsuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.owner_id == current_user.id,
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Only one capsule per event
    existing = db.query(Capsule).filter(Capsule.event_id == event_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Capsule already exists for this event")

    if payload.unlock_at <= datetime.now(tz=payload.unlock_at.tzinfo):
        raise HTTPException(status_code=400, detail="Unlock date must be in the future")

    capsule = Capsule(
        event_id=event_id,
        unlock_at=payload.unlock_at,
        message=payload.message,
        notify_emails=json.dumps(payload.notify_emails or []),
        is_unlocked=False,
    )
    db.add(capsule)
    db.commit()
    db.refresh(capsule)
    return build_capsule_response(capsule)


@router.get("/{event_id}")
def get_capsule(
    event_id: str,
    db: Session = Depends(get_db),
):
    """Public — guests can check capsule status via event_id."""
    capsule = db.query(Capsule).filter(Capsule.event_id == event_id).first()
    if not capsule:
        raise HTTPException(status_code=404, detail="No capsule found for this event")

    # Auto-unlock if time has passed
    if not capsule.is_unlocked:
        now = datetime.now(tz=capsule.unlock_at.tzinfo)
        if now >= capsule.unlock_at:
            capsule.is_unlocked = True
            db.commit()

    return build_capsule_response(capsule)


@router.delete("/{event_id}", status_code=204)
def delete_capsule(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.owner_id == current_user.id,
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    capsule = db.query(Capsule).filter(Capsule.event_id == event_id).first()
    if not capsule:
        raise HTTPException(status_code=404, detail="No capsule found")

    db.delete(capsule)
    db.commit()