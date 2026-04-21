from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models.event import Event
from app.models.photo import Photo
from app.models.user import User
from app.routers.auth import get_current_user
from app.services.reel_service import generate_reel, get_tracks
import json, asyncio, uuid

router = APIRouter(prefix="/reel", tags=["reel"])


class ReelSettings(BaseModel):
    photo_ids: list[str]
    aspect_ratio: str = "9:16"
    transition: str = "fade"
    photo_duration: int = 2
    title_text: str = ""
    subtitle_text: str = ""
    overlay_text: str = ""
    watermark: str = ""
    music_track_id: Optional[str] = None
    music_url: Optional[str] = None
    ken_burns: bool = True
    show_intro: bool = True
    show_outro: bool = True
    fps: int = 24


class GuestReelSettings(BaseModel):
    photo_ids: list[str]
    aspect_ratio: str = "9:16"
    transition: str = "fade"
    photo_duration: int = 2
    title_text: str = ""
    subtitle_text: str = ""
    overlay_text: str = ""
    music_track_id: Optional[str] = None
    music_url: Optional[str] = None
    ken_burns: bool = True
    show_intro: bool = True
    show_outro: bool = True
    fps: int = 24


@router.get("/tracks")
def list_tracks():
    """Return available music tracks."""
    return get_tracks()


@router.post("/generate/{event_id}")
def generate_event_reel(
    event_id: str,
    settings: ReelSettings,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.owner_id == current_user.id,
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    photos = db.query(Photo).filter(
        Photo.id.in_(settings.photo_ids),
        Photo.event_id == event_id,
    ).order_by(Photo.sharpness_score.desc()).all()

    if not photos:
        raise HTTPException(status_code=400, detail="No valid photos found")

    # Auto-fill event branding if not set
    s = settings.model_dump()
    if not s.get("title_text"):
        s["title_text"] = event.name
    if not s.get("subtitle_text"):
        s["subtitle_text"] = current_user.studio_name or current_user.name
    if not s.get("watermark"):
        s["watermark"] = current_user.studio_name or current_user.name

    photo_urls = [p.url for p in photos]

    try:
        output_path = generate_reel(photo_urls, s)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reel generation failed: {str(e)}")

    safe_name = event.name[:20].replace(" ", "_").replace("/", "_")
    return FileResponse(
        output_path,
        media_type="video/mp4",
        filename=f"SnapFace_{safe_name}_reel.mp4",
    )


@router.post("/generate-guest/{qr_token}")
def generate_guest_reel(
    qr_token: str,
    settings: GuestReelSettings,
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(
        Event.qr_token == qr_token,
        Event.is_active == True,
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    photos = db.query(Photo).filter(
        Photo.id.in_(settings.photo_ids),
        Photo.event_id == event.id,
    ).order_by(Photo.sharpness_score.desc()).all()

    if not photos:
        raise HTTPException(status_code=400, detail="No valid photos found")

    s = settings.model_dump()
    if not s.get("title_text"):
        s["title_text"] = event.name
    if not s.get("subtitle_text"):
        s["subtitle_text"] = event.owner.name

    photo_urls = [p.url for p in photos]

    try:
        output_path = generate_reel(photo_urls, s)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reel generation failed: {str(e)}")

    return FileResponse(
        output_path,
        media_type="video/mp4",
        filename=f"my_snapface_reel.mp4",
    )


@router.post("/generate-guest/{qr_token}/stream")
async def generate_guest_reel_stream(
    qr_token: str,
    settings: GuestReelSettings,
    db: Session = Depends(get_db),
):
    """SSE endpoint for real-time reel generation progress."""
    event = db.query(Event).filter(
        Event.qr_token == qr_token,
        Event.is_active == True,
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    photos = db.query(Photo).filter(
        Photo.id.in_(settings.photo_ids),
        Photo.event_id == event.id,
    ).order_by(Photo.sharpness_score.desc()).all()

    if not photos:
        raise HTTPException(status_code=400, detail="No photos")

    s = settings.model_dump()
    if not s.get("title_text"):
        s["title_text"] = event.name
    if not s.get("subtitle_text"):
        s["subtitle_text"] = event.owner.name

    photo_urls = [p.url for p in photos]
    progress_store = {"value": 0, "done": False, "path": None, "error": None}

    def progress_callback(pct: int):
        progress_store["value"] = pct

    import threading
    def run_generation():
        try:
            path = generate_reel(photo_urls, s, progress_callback)
            progress_store["path"] = path
            progress_store["value"] = 100
            progress_store["done"] = True
        except Exception as e:
            progress_store["error"] = str(e)
            progress_store["done"] = True

    thread = threading.Thread(target=run_generation)
    thread.start()

    async def event_stream():
        while not progress_store["done"]:
            yield f"data: {json.dumps({'progress': progress_store['value']})}\n\n"
            await asyncio.sleep(0.5)

        if progress_store["error"]:
            yield f"data: {json.dumps({'error': progress_store['error']})}\n\n"
        else:
            yield f"data: {json.dumps({'progress': 100, 'done': True, 'path': progress_store['path']})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")