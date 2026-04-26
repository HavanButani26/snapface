from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
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
import json

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

class EventCountdownUpdate(BaseModel):
    photos_ready_at: Optional[datetime] = None
    countdown_message: Optional[str] = None

class CountdownRegisterRequest(BaseModel):
    email: str
    name: Optional[str] = None


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

@router.patch("/{event_id}/countdown", response_model=EventResponse)
def update_countdown(
    event_id: str,
    payload: EventCountdownUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Set or update the photos-ready countdown for an event."""
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.owner_id == current_user.id,
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if payload.photos_ready_at is not None:
        event.photos_ready_at = payload.photos_ready_at
    if payload.countdown_message is not None:
        event.countdown_message = payload.countdown_message

    db.commit()
    db.refresh(event)
    return build_event_response(event, db)


@router.post("/{event_id}/countdown/register")
def register_for_notification(
    event_id: str,
    payload: CountdownRegisterRequest,
    db: Session = Depends(get_db),
):
    """Public — guest registers email to be notified when photos are ready."""
    event = db.query(Event).filter(
        Event.qr_token == event_id,
        Event.is_active == True,
    ).first()

    # Try by ID if not found by token
    if not event:
        event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Add email to notify list
    current_emails = []
    if event.notify_emails:
        try:
            current_emails = json.loads(event.notify_emails)
        except Exception:
            current_emails = []

    entry = {"email": payload.email, "name": payload.name or "", "registered_at": datetime.now().isoformat()}

    # Avoid duplicates
    if not any(e["email"] == payload.email for e in current_emails):
        current_emails.append(entry)
        event.notify_emails = json.dumps(current_emails)
        db.commit()

    return {"message": "You'll be notified when photos are ready!", "email": payload.email}


@router.post("/{event_id}/countdown/notify-all")
def notify_registered_guests(
    event_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send notification emails to all registered guests."""
    from app.services.email_service import send_photos_ready_email

    event = db.query(Event).filter(
        Event.id == event_id,
        Event.owner_id == current_user.id,
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if not event.notify_emails:
        raise HTTPException(status_code=400, detail="No registered guests")

    try:
        emails = json.loads(event.notify_emails)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid email list")

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    guest_url = f"{frontend_url}/guest/{event.qr_token}"

    for entry in emails:
        background_tasks.add_task(
            send_photos_ready_email,
            entry["email"],
            entry.get("name") or "Guest",
            event.name,
            current_user.studio_name or current_user.name,
            guest_url,
        )

    return {"message": f"Notifying {len(emails)} registered guests", "count": len(emails)}


@router.get("/{event_id}/countdown/registrations")
def get_registrations(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all registered guest emails for an event."""
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.owner_id == current_user.id,
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    emails = []
    if event.notify_emails:
        try:
            emails = json.loads(event.notify_emails)
        except Exception:
            pass

    return {"count": len(emails), "registrations": emails}
