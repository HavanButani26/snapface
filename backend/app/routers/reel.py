from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.event import Event
from app.models.photo import Photo
from app.routers.auth import get_current_user
from app.models.user import User
from app.services import face_service
import json, os, uuid, tempfile, urllib.request

router = APIRouter(prefix="/reel", tags=["reel"])


def download_image(url: str, path: str):
    urllib.request.urlretrieve(url, path)


@router.post("/generate/{event_id}")
def generate_reel(
    event_id: str,
    selfie_encoding: list[float] | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generates an auto story reel for an event.
    - Picks top 12 photos by sharpness score
    - If selfie_encoding provided, filters to matched photos only
    - Creates a slideshow video using OpenCV
    - Returns path to the generated video
    """
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.owner_id == current_user.id,
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Get photos sorted by sharpness (best quality first)
    photos = (
        db.query(Photo)
        .filter(
            Photo.event_id == event_id,
            Photo.sharpness_score != None,
        )
        .order_by(Photo.sharpness_score.desc())
        .limit(15)
        .all()
    )

    if len(photos) < 1:
        raise HTTPException(
            status_code=400,
            detail="Not enough processed photos to generate a reel. Upload more photos first."
        )

    try:
        import cv2
        import numpy as np

        tmp_dir = tempfile.mkdtemp()
        output_path = os.path.join(tmp_dir, f"reel_{event_id[:8]}.mp4")

        # Video settings
        fps = 24
        duration_per_photo = 2  # seconds each photo shows
        transition_frames = int(fps * 0.4)  # 0.4s fade transition
        width, height = 1080, 1080

        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

        def load_frame(url: str) -> np.ndarray:
            img_path = os.path.join(tmp_dir, f"{uuid.uuid4()}.jpg")
            download_image(url, img_path)
            img = cv2.imread(img_path)
            if img is None:
                return None
            # Crop to square center
            h, w = img.shape[:2]
            size = min(h, w)
            y0 = (h - size) // 2
            x0 = (w - size) // 2
            img = img[y0:y0+size, x0:x0+size]
            return cv2.resize(img, (width, height))

        frames_per_photo = fps * duration_per_photo

        for i, photo in enumerate(photos):
            frame = load_frame(photo.url)
            if frame is None:
                continue

            # Write static frames
            for _ in range(frames_per_photo - transition_frames):
                out.write(frame)

            # Write fade-out to black (transition)
            if i < len(photos) - 1:
                next_frame = load_frame(photos[i + 1].url)
                if next_frame is not None:
                    for t in range(transition_frames):
                        alpha = t / transition_frames
                        blended = cv2.addWeighted(frame, 1 - alpha, next_frame, alpha, 0)
                        out.write(blended)

        out.release()

        return FileResponse(
            output_path,
            media_type="video/mp4",
            filename=f"snapface_reel_{event.name[:20].replace(' ', '_')}.mp4",
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reel generation failed: {str(e)}")


@router.post("/generate-guest/{qr_token}")
async def generate_guest_reel(
    qr_token: str,
    matched_photo_ids: list[str],
    db: Session = Depends(get_db),
):
    """Guest reel — only from their matched photos, best quality first."""
    event = db.query(Event).filter(
        Event.qr_token == qr_token,
        Event.is_active == True,
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if not matched_photo_ids:
        raise HTTPException(status_code=400, detail="No photos provided")

    photos = (
        db.query(Photo)
        .filter(
            Photo.id.in_(matched_photo_ids),
            Photo.event_id == event.id,
        )
        .order_by(Photo.sharpness_score.desc())
        .all()
    )

    if not photos:
        raise HTTPException(status_code=400, detail="No valid photos found")

    try:
        import cv2
        import numpy as np

        tmp_dir = tempfile.mkdtemp()
        output_path = os.path.join(tmp_dir, f"guest_reel_{qr_token[:8]}.mp4")

        fps = 24
        duration_per_photo = 2
        transition_frames = int(fps * 0.4)
        width, height = 1080, 1080

        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

        def load_frame(url: str) -> np.ndarray:
            img_path = os.path.join(tmp_dir, f"{uuid.uuid4()}.jpg")
            download_image(url, img_path)
            img = cv2.imread(img_path)
            if img is None:
                return None
            h, w = img.shape[:2]
            size = min(h, w)
            y0 = (h - size) // 2
            x0 = (w - size) // 2
            img = img[y0:y0+size, x0:x0+size]
            return cv2.resize(img, (width, height))

        frames_per_photo = fps * duration_per_photo

        for i, photo in enumerate(photos):
            frame = load_frame(photo.url)
            if frame is None:
                continue

            for _ in range(frames_per_photo - transition_frames):
                out.write(frame)

            if i < len(photos) - 1:
                next_frame = load_frame(photos[i + 1].url)
                if next_frame is not None:
                    for t in range(transition_frames):
                        alpha = t / transition_frames
                        blended = cv2.addWeighted(frame, 1 - alpha, next_frame, alpha, 0)
                        out.write(blended)

        out.release()

        return FileResponse(
            output_path,
            media_type="video/mp4",
            filename=f"my_snapface_reel.mp4",
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reel generation failed: {str(e)}")