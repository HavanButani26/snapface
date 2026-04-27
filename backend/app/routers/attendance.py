from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.database import get_db
from app.models.event import Event
from app.models.photo import Photo
from app.models.attendee import Attendee
from app.routers.auth import get_current_user
from app.models.user import User
from app.services import face_service, cloudinary_service
import json
import csv
import io

router = APIRouter(prefix="/attendance", tags=["attendance"])


# ---------- Schemas ----------

class AttendeeCreate(BaseModel):
    name: str
    email: Optional[str] = None
    department: Optional[str] = None
    employee_id: Optional[str] = None


class AttendeeResponse(BaseModel):
    id: str
    name: str
    email: Optional[str]
    department: Optional[str]
    employee_id: Optional[str]
    reference_photo_url: Optional[str]
    is_present: bool
    confidence: Optional[float]
    matched_photo_count: int
    marked_at: Optional[datetime]
    has_encoding: bool

    class Config:
        from_attributes = True


# ---------- Helpers ----------

def build_attendee_response(att: Attendee) -> AttendeeResponse:
    matched_count = 0
    if att.matched_photo_ids:
        try:
            matched_count = len(json.loads(att.matched_photo_ids))
        except Exception:
            pass

    return AttendeeResponse(
        id=str(att.id),
        name=att.name,
        email=att.email,
        department=att.department,
        employee_id=att.employee_id,
        reference_photo_url=att.reference_photo_url,
        is_present=att.is_present,
        confidence=att.confidence,
        matched_photo_count=matched_count,
        marked_at=att.marked_at,
        has_encoding=att.face_encoding is not None,
    )


def run_attendance_scan(event_id: str, db: Session):
    """
    Background task — match all attendee encodings against all event photos.
    Marks attendees as present if their face appears in any photo.
    """
    try:
        attendees = db.query(Attendee).filter(
            Attendee.event_id == event_id,
            Attendee.face_encoding != None,
        ).all()

        photos = db.query(Photo).filter(
            Photo.event_id == event_id,
            Photo.face_count > 0,
        ).all()

        print(f"Attendance scan: {len(attendees)} attendees vs {len(photos)} photos")

        for attendee in attendees:
            try:
                att_encoding = json.loads(attendee.face_encoding)
            except Exception:
                continue

            matched_photos = []
            best_confidence = 0.0

            for photo in photos:
                if not photo.all_face_encodings:
                    continue
                try:
                    photo_encodings = json.loads(photo.all_face_encodings)
                except Exception:
                    continue

                for enc in photo_encodings:
                    dist = face_service.cosine_distance(att_encoding, enc)
                    similarity = 1 - dist
                    if dist < 0.55:  # match threshold
                        matched_photos.append(str(photo.id))
                        if similarity > best_confidence:
                            best_confidence = similarity
                        break

            # Update attendee
            attendee.is_present = len(matched_photos) > 0
            attendee.matched_photo_ids = json.dumps(list(set(matched_photos)))
            attendee.confidence = round(best_confidence, 4) if matched_photos else None
            if matched_photos:
                attendee.marked_at = datetime.now()

            print(f"  {attendee.name}: {'PRESENT' if attendee.is_present else 'ABSENT'} ({len(matched_photos)} photos)")

        db.commit()
        print(f"Attendance scan complete for event {event_id}")

    except Exception as e:
        print(f"Attendance scan error: {e}")


# ---------- Routes ----------

@router.post("/{event_id}/attendees", response_model=AttendeeResponse, status_code=201)
async def add_attendee(
    event_id: str,
    name: str = Form(...),
    email: Optional[str] = Form(None),
    department: Optional[str] = Form(None),
    employee_id: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add an attendee with optional reference photo."""
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.owner_id == current_user.id,
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    photo_url = None
    face_encoding = None

    if photo:
        photo_bytes = await photo.read()

        # Upload reference photo to Cloudinary
        result = cloudinary_service.upload_photo(
            photo_bytes,
            folder=f"snapface/{event_id}/attendees",
        )
        photo_url = result["url"]

        # Extract face encoding
        encodings = face_service.extract_encodings(photo_bytes)
        if encodings:
            face_encoding = json.dumps(encodings[0])
        else:
            print(f"Warning: No face detected in reference photo for {name}")

    attendee = Attendee(
        event_id=event_id,
        name=name,
        email=email,
        department=department,
        employee_id=employee_id,
        reference_photo_url=photo_url,
        face_encoding=face_encoding,
    )
    db.add(attendee)
    db.commit()
    db.refresh(attendee)
    return build_attendee_response(attendee)


@router.get("/{event_id}/attendees", response_model=list[AttendeeResponse])
def list_attendees(
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

    attendees = db.query(Attendee).filter(
        Attendee.event_id == event_id
    ).order_by(Attendee.name).all()

    return [build_attendee_response(a) for a in attendees]


@router.delete("/{event_id}/attendees/{attendee_id}", status_code=204)
def delete_attendee(
    event_id: str,
    attendee_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.owner_id == current_user.id,
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    attendee = db.query(Attendee).filter(
        Attendee.id == attendee_id,
        Attendee.event_id == event_id,
    ).first()
    if not attendee:
        raise HTTPException(status_code=404, detail="Attendee not found")

    db.delete(attendee)
    db.commit()


@router.post("/{event_id}/scan", status_code=202)
def scan_attendance(
    event_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Trigger AI attendance scan."""
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.owner_id == current_user.id,
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    attendee_count = db.query(Attendee).filter(
        Attendee.event_id == event_id,
        Attendee.face_encoding != None,
    ).count()

    if attendee_count == 0:
        raise HTTPException(
            status_code=400,
            detail="No attendees with reference photos. Upload reference photos first."
        )

    photo_count = db.query(Photo).filter(
        Photo.event_id == event_id,
        Photo.face_count > 0,
    ).count()

    if photo_count == 0:
        raise HTTPException(
            status_code=400,
            detail="No processed event photos found. Upload and process photos first."
        )

    background_tasks.add_task(run_attendance_scan, event_id, db)

    return {
        "message": f"Scanning {attendee_count} attendees against {photo_count} photos...",
        "attendee_count": attendee_count,
        "photo_count": photo_count,
    }


@router.get("/{event_id}/report")
def get_attendance_report(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get attendance summary report."""
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.owner_id == current_user.id,
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    all_attendees = db.query(Attendee).filter(
        Attendee.event_id == event_id
    ).all()

    present = [a for a in all_attendees if a.is_present]
    absent  = [a for a in all_attendees if not a.is_present]

    # Department breakdown
    dept_stats: dict = {}
    for att in all_attendees:
        dept = att.department or "Other"
        if dept not in dept_stats:
            dept_stats[dept] = {"total": 0, "present": 0}
        dept_stats[dept]["total"] += 1
        if att.is_present:
            dept_stats[dept]["present"] += 1

    dept_breakdown = [
        {
            "department": dept,
            "total": stats["total"],
            "present": stats["present"],
            "absent": stats["total"] - stats["present"],
            "attendance_rate": round(stats["present"] / max(stats["total"], 1) * 100, 1),
        }
        for dept, stats in dept_stats.items()
    ]
    dept_breakdown.sort(key=lambda x: x["attendance_rate"], reverse=True)

    return {
        "event_name": event.name,
        "total_attendees": len(all_attendees),
        "present_count": len(present),
        "absent_count": len(absent),
        "attendance_rate": round(len(present) / max(len(all_attendees), 1) * 100, 1),
        "department_breakdown": dept_breakdown,
        "present": [build_attendee_response(a) for a in present],
        "absent": [build_attendee_response(a) for a in absent],
    }


@router.get("/{event_id}/export-csv")
def export_attendance_csv(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download attendance as CSV."""
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.owner_id == current_user.id,
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    attendees = db.query(Attendee).filter(
        Attendee.event_id == event_id
    ).order_by(Attendee.name).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "Name", "Email", "Department", "Employee ID",
        "Status", "Photos Found", "Confidence", "Marked At"
    ])

    # Rows
    for att in attendees:
        matched_count = 0
        if att.matched_photo_ids:
            try:
                matched_count = len(json.loads(att.matched_photo_ids))
            except Exception:
                pass

        writer.writerow([
            att.name,
            att.email or "",
            att.department or "",
            att.employee_id or "",
            "Present" if att.is_present else "Absent",
            matched_count,
            f"{round(att.confidence * 100, 1)}%" if att.confidence else "",
            att.marked_at.strftime("%d %b %Y %H:%M") if att.marked_at else "",
        ])

    output.seek(0)
    safe_name = event.name[:20].replace(" ", "_")

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_name}_attendance.csv"'
        }
    )