from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.database import get_db
from app.models.event import Event
from app.models.photo import Photo
from app.routers.auth import get_current_user
from app.models.user import User
import uuid
import qrcode
import io
import base64
import os

router = APIRouter(prefix="/events", tags=["events"])


# ---------- Schemas ----------

class EventCreate(BaseModel):
    name: str
    description: Optional[str] = None
    event_date: Optional[datetime] = None
    is_password_protected: bool = False
    album_password: Optional[str] = None

class EventResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    event_date: Optional[datetime]
    is_password_protected: bool
    qr_token: str
    is_active: bool
    photo_count: int
    created_at: datetime

    class Config:
        from_attributes = True

class EventUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    event_date: Optional[datetime] = None
    is_active: Optional[bool] = None


# ---------- Helpers ----------

def build_event_response(event: Event, db: Session) -> EventResponse:
    photo_count = db.query(Photo).filter(Photo.event_id == event.id).count()
    return EventResponse(
        id=str(event.id),
        name=event.name,
        description=event.description,
        event_date=event.event_date,
        is_password_protected=event.is_password_protected,
        qr_token=event.qr_token,
        is_active=event.is_active,
        photo_count=photo_count,
        created_at=event.created_at,
    )

def generate_qr_base64(data: str) -> str:
    qr = qrcode.QRCode(box_size=8, border=2)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="white", back_color="black")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


# ---------- Routes ----------

@router.post("", response_model=EventResponse, status_code=201)
def create_event(
    payload: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.routers.auth import hash_password

    qr_token = str(uuid.uuid4()).replace("-", "")[:20]

    event = Event(
        owner_id=current_user.id,
        name=payload.name,
        description=payload.description,
        event_date=payload.event_date,
        is_password_protected=payload.is_password_protected,
        album_password=hash_password(payload.album_password) if payload.album_password else None,
        qr_token=qr_token,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return build_event_response(event, db)


@router.get("", response_model=list[EventResponse])
def list_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    events = (
        db.query(Event)
        .filter(Event.owner_id == current_user.id)
        .order_by(Event.created_at.desc())
        .all()
    )
    return [build_event_response(e, db) for e in events]


@router.get("/{event_id}", response_model=EventResponse)
def get_event(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.owner_id == current_user.id
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return build_event_response(event, db)


@router.patch("/{event_id}", response_model=EventResponse)
def update_event(
    event_id: str,
    payload: EventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.owner_id == current_user.id
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(event, field, value)

    db.commit()
    db.refresh(event)
    return build_event_response(event, db)


@router.delete("/{event_id}", status_code=204)
def delete_event(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.owner_id == current_user.id
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    db.delete(event)
    db.commit()


@router.get("/{event_id}/qr")
def get_event_qr(
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

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    guest_url = f"{frontend_url}/guest/{event.qr_token}"
    qr_b64 = generate_qr_base64(guest_url)

    return {
        "qr_base64": qr_b64,
        "guest_url": guest_url,
        "qr_token": event.qr_token,
    }