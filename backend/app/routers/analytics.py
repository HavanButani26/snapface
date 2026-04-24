from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from app.database import get_db
from app.models.event import Event
from app.models.event_analytics import EventAnalytic
from app.models.photo import Photo
from app.models.guest_gallery import GuestGallery
from app.routers.auth import get_current_user
from app.models.user import User
from datetime import datetime, timedelta
import json

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/event/{event_id}")
def get_event_analytics(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify ownership
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.owner_id == current_user.id,
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    all_logs = db.query(EventAnalytic).filter(
        EventAnalytic.event_id == event_id
    ).all()

    # ── Summary counts ──
    qr_scans = len([l for l in all_logs if l.action == "qr_scan"])
    selfie_matches = len([l for l in all_logs if l.action == "selfie_match"])
    no_matches = len([l for l in all_logs if l.action == "no_match"])
    photo_downloads = len([l for l in all_logs if l.action == "photo_download"])
    gallery_views = len([l for l in all_logs if l.action == "gallery_view"])
    gallery_shares = len([l for l in all_logs if l.action == "gallery_share"])

    total_photos = db.query(Photo).filter(Photo.event_id == event_id).count()
    total_galleries = db.query(GuestGallery).filter(
        GuestGallery.event_id == event_id
    ).count()

    match_rate = round((selfie_matches / max(qr_scans, 1)) * 100, 1)

    # ── Daily visit trend (last 14 days) ──
    fourteen_days_ago = datetime.now() - timedelta(days=13)
    daily_visits = []
    for i in range(14):
        day = fourteen_days_ago + timedelta(days=i)
        day_logs = [
            l for l in all_logs
            if l.action == "qr_scan"
            and l.created_at.date() == day.date()
        ]
        daily_visits.append({
            "date": day.strftime("%d %b"),
            "short_date": day.strftime("%d"),
            "visits": len(day_logs),
        })

    # ── Most downloaded photos ──
    download_logs = [l for l in all_logs if l.action == "photo_download" and l.photo_id]
    download_counts: dict = {}
    for log in download_logs:
        pid = str(log.photo_id)
        download_counts[pid] = download_counts.get(pid, 0) + 1

    top_photo_ids = sorted(download_counts, key=download_counts.get, reverse=True)[:5]
    top_photos = []
    for pid in top_photo_ids:
        photo = db.query(Photo).filter(Photo.id == pid).first()
        if photo:
            top_photos.append({
                "id": pid,
                "thumbnail_url": photo.thumbnail_url,
                "url": photo.url,
                "downloads": download_counts[pid],
                "dominant_emotion": photo.dominant_emotion,
            })

    # ── Recent guest activity ──
    recent_logs = sorted(all_logs, key=lambda x: x.created_at, reverse=True)[:20]
    recent_activity = []
    for log in recent_logs:
        action_labels = {
            "qr_scan": "Visited event",
            "selfie_match": "Found their photos",
            "no_match": "No photos found",
            "photo_download": "Downloaded a photo",
            "gallery_view": "Viewed shared gallery",
            "gallery_share": "Shared gallery",
        }
        recent_activity.append({
            "action": log.action,
            "label": action_labels.get(log.action, log.action),
            "guest_name": log.guest_name or "Anonymous",
            "created_at": log.created_at.isoformat(),
            "time_ago": _time_ago(log.created_at),
        })

    # ── Hourly distribution (peak times) ──
    hourly = {}
    for log in all_logs:
        if log.action == "qr_scan":
            h = log.created_at.hour
            hourly[h] = hourly.get(h, 0) + 1

    hourly_data = [
        {"hour": f"{h:02d}:00", "visits": hourly.get(h, 0)}
        for h in range(24)
    ]

    return {
        "summary": {
            "qr_scans": qr_scans,
            "selfie_matches": selfie_matches,
            "no_matches": no_matches,
            "photo_downloads": photo_downloads,
            "gallery_views": gallery_views,
            "gallery_shares": gallery_shares,
            "total_photos": total_photos,
            "total_galleries": total_galleries,
            "match_rate": match_rate,
        },
        "daily_visits": daily_visits,
        "top_photos": top_photos,
        "recent_activity": recent_activity,
        "hourly_distribution": hourly_data,
    }


def _time_ago(dt: datetime) -> str:
    now = datetime.now(tz=dt.tzinfo) if dt.tzinfo else datetime.now()
    diff = now - dt
    seconds = int(diff.total_seconds())
    if seconds < 60:
        return "just now"
    elif seconds < 3600:
        return f"{seconds // 60}m ago"
    elif seconds < 86400:
        return f"{seconds // 3600}h ago"
    else:
        return f"{seconds // 86400}d ago"
    
def track(db, event_id, action, photo_id=None, guest_name=None, gallery_token=None, extra_data=None):
    try:
        log = EventAnalytic(
            event_id=event_id,
            action=action,
            photo_id=photo_id,
            guest_name=guest_name,
            gallery_token=gallery_token,
            extra_data=json.dumps(extra_data) if extra_data else None,
        )
        db.add(log)
        db.commit()
    except Exception as e:
        print(f"Analytics tracking error: {e}")