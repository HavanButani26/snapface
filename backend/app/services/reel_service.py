import os
import io
import json
import uuid
import tempfile
import urllib.request
import subprocess
import math
from PIL import Image, ImageDraw, ImageFont
import numpy as np
import cv2

# ── Constants ──
ASPECT_RATIOS = {
    "9:16": (1080, 1920),
    "1:1":  (1080, 1080),
    "16:9": (1920, 1080),
}

TRANSITIONS = ["fade", "slide_left", "slide_right", "zoom_in", "flash"]

MUSIC_DIR = os.path.join(os.path.dirname(__file__), "..", "static", "music")
TRACKS_FILE = os.path.join(MUSIC_DIR, "tracks.json")


def get_tracks() -> list:
    try:
        with open(TRACKS_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return []


def download_image(url: str, path: str):
    urllib.request.urlretrieve(url, path)


def load_and_crop(img_path: str, width: int, height: int) -> np.ndarray:
    """Load image, crop to fill target dimensions."""
    img = cv2.imread(img_path)
    if img is None:
        return np.zeros((height, width, 3), dtype=np.uint8)

    h, w = img.shape[:2]
    target_ratio = width / height
    source_ratio = w / h

    if source_ratio > target_ratio:
        new_w = int(h * target_ratio)
        x = (w - new_w) // 2
        img = img[:, x:x+new_w]
    else:
        new_h = int(w / target_ratio)
        y = (h - new_h) // 2
        img = img[y:y+new_h, :]

    return cv2.resize(img, (width, height))


def apply_ken_burns(frame: np.ndarray, t: float, total: float, direction: str = "zoom_in") -> np.ndarray:
    """Apply Ken Burns pan/zoom effect."""
    h, w = frame.shape[:2]
    progress = t / max(total, 1)

    if direction == "zoom_in":
        scale = 1.0 + 0.06 * progress
    elif direction == "zoom_out":
        scale = 1.06 - 0.06 * progress
    elif direction == "pan_right":
        scale = 1.04
    elif direction == "pan_left":
        scale = 1.04
    else:
        return frame

    new_w = int(w * scale)
    new_h = int(h * scale)
    resized = cv2.resize(frame, (new_w, new_h))

    if direction in ["zoom_in", "zoom_out"]:
        x = (new_w - w) // 2
        y = (new_h - h) // 2
    elif direction == "pan_right":
        x = int((new_w - w) * progress)
        y = (new_h - h) // 2
    elif direction == "pan_left":
        x = int((new_w - w) * (1 - progress))
        y = (new_h - h) // 2
    else:
        x = 0
        y = 0

    return resized[y:y+h, x:x+w]


def add_text_overlay(frame: np.ndarray, text: str, position: str = "bottom", color=(255, 255, 255)) -> np.ndarray:
    """Add text overlay to frame."""
    if not text:
        return frame

    pil_img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    draw = ImageDraw.Draw(pil_img)

    w, h = pil_img.size
    font_size = max(32, w // 25)

    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
    except Exception:
        font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]

    padding = 20
    if position == "bottom":
        x = (w - text_w) // 2
        y = h - text_h - padding * 3

        # Semi-transparent background
        overlay = Image.new("RGBA", pil_img.size, (0, 0, 0, 0))
        overlay_draw = ImageDraw.Draw(overlay)
        overlay_draw.rectangle(
            [x - padding, y - padding, x + text_w + padding, y + text_h + padding],
            fill=(0, 0, 0, 140)
        )
        pil_img = Image.alpha_composite(pil_img.convert("RGBA"), overlay).convert("RGB")
        draw = ImageDraw.Draw(pil_img)
    elif position == "top":
        x = (w - text_w) // 2
        y = padding * 2
    elif position == "center":
        x = (w - text_w) // 2
        y = (h - text_h) // 2

    draw.text((x, y), text, font=font, fill=color)
    return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)


def add_watermark(frame: np.ndarray, watermark_text: str) -> np.ndarray:
    """Add studio watermark in corner."""
    if not watermark_text:
        return frame

    pil_img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    draw = ImageDraw.Draw(pil_img)
    w, h = pil_img.size
    font_size = max(20, w // 45)

    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", font_size)
    except Exception:
        font = ImageFont.load_default()

    text = f"© {watermark_text}"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]

    x = w - text_w - 20
    y = h - text_h - 20

    draw.text((x + 1, y + 1), text, font=font, fill=(0, 0, 0, 180))
    draw.text((x, y), text, font=font, fill=(255, 255, 255, 220))

    return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)


def make_title_frame(width: int, height: int, title: str, subtitle: str = "") -> np.ndarray:
    """Create a branded intro/outro frame."""
    frame = np.zeros((height, width, 3), dtype=np.uint8)

    pil_img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))

    # Gradient background
    for y in range(height):
        ratio = y / height
        r = int(37 + (99 - 37) * ratio)
        g = int(99 + (102 - 99) * ratio)
        b = int(235 + (241 - 235) * ratio)
        for x in range(width):
            pil_img.putpixel((x, y), (r, g, b))

    draw = ImageDraw.Draw(pil_img)
    w, h = pil_img.size

    # Title
    title_size = max(48, w // 14)
    subtitle_size = max(28, w // 24)

    try:
        title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", title_size)
        sub_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", subtitle_size)
        small_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", max(20, w // 40))
    except Exception:
        title_font = ImageFont.load_default()
        sub_font = ImageFont.load_default()
        small_font = ImageFont.load_default()

    # SnapFace branding
    brand = "SnapFace"
    bb = draw.textbbox((0, 0), brand, font=small_font)
    draw.text(((w - bb[2]) // 2, h // 6), brand, font=small_font, fill=(255, 255, 255, 180))

    # Main title
    bb = draw.textbbox((0, 0), title, font=title_font)
    draw.text(((w - bb[2]) // 2, h // 2 - bb[3] // 2 - 30), title, font=title_font, fill=(255, 255, 255))

    # Subtitle
    if subtitle:
        bb2 = draw.textbbox((0, 0), subtitle, font=sub_font)
        draw.text(((w - bb2[2]) // 2, h // 2 + 40), subtitle, font=sub_font, fill=(200, 220, 255))

    return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)


def make_transition(
    frame_a: np.ndarray,
    frame_b: np.ndarray,
    progress: float,
    transition: str,
) -> np.ndarray:
    """Blend two frames based on transition type."""
    h, w = frame_a.shape[:2]
    p = max(0.0, min(1.0, progress))

    if transition == "fade":
        return cv2.addWeighted(frame_a, 1 - p, frame_b, p, 0)

    elif transition == "slide_left":
        offset = int(w * p)
        result = np.zeros_like(frame_a)
        result[:, :w-offset] = frame_a[:, offset:]
        result[:, w-offset:] = frame_b[:, :offset]
        return result

    elif transition == "slide_right":
        offset = int(w * p)
        result = np.zeros_like(frame_a)
        result[:, offset:] = frame_a[:, :w-offset]
        result[:, :offset] = frame_b[:, w-offset:]
        return result

    elif transition == "zoom_in":
        scale = 1.0 + 0.5 * p
        new_w, new_h = int(w * scale), int(h * scale)
        zoomed = cv2.resize(frame_a, (new_w, new_h))
        x = (new_w - w) // 2
        y = (new_h - h) // 2
        zoomed_crop = zoomed[y:y+h, x:x+w]
        return cv2.addWeighted(zoomed_crop, 1 - p, frame_b, p, 0)

    elif transition == "flash":
        if p < 0.5:
            white = np.ones_like(frame_a) * 255
            return cv2.addWeighted(frame_a, 1 - p * 2, white, p * 2, 0)
        else:
            white = np.ones_like(frame_b) * 255
            return cv2.addWeighted(white, 1 - (p - 0.5) * 2, frame_b, (p - 0.5) * 2, 0)

    return frame_b


def generate_reel(
    photo_urls: list[str],
    settings: dict,
    progress_callback=None,
) -> str:
    """
    Generate a reel video from photo URLs.
    Returns path to generated video file.
    settings = {
        aspect_ratio: "9:16" | "1:1" | "16:9"
        transition: "fade" | "slide_left" | "slide_right" | "zoom_in" | "flash"
        photo_duration: int (seconds per photo, 1-5)
        title_text: str (event name for intro)
        subtitle_text: str (photographer name)
        overlay_text: str (shown on each photo)
        watermark: str (studio name)
        music_track_id: str | None
        ken_burns: bool
        show_intro: bool
        show_outro: bool
        fps: int (24 or 30)
    }
    """
    width, height = ASPECT_RATIOS.get(settings.get("aspect_ratio", "9:16"), (1080, 1920))
    fps = settings.get("fps", 24)
    photo_duration = max(1, min(5, settings.get("photo_duration", 2)))
    transition = settings.get("transition", "fade")
    transition_duration = 0.5  # seconds
    transition_frames = int(fps * transition_duration)
    photo_frames = int(fps * photo_duration)
    ken_burns = settings.get("ken_burns", True)
    show_intro = settings.get("show_intro", True)
    show_outro = settings.get("show_outro", True)
    title_text = settings.get("title_text", "")
    subtitle_text = settings.get("subtitle_text", "")
    overlay_text = settings.get("overlay_text", "")
    watermark = settings.get("watermark", "")

    tmp_dir = tempfile.mkdtemp()
    video_path = os.path.join(tmp_dir, f"reel_{uuid.uuid4().hex[:8]}.mp4")
    final_path = os.path.join(tmp_dir, f"reel_final_{uuid.uuid4().hex[:8]}.mp4")

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(video_path, fourcc, fps, (width, height))

    total_steps = len(photo_urls) + (2 if show_intro else 0) + (2 if show_outro else 0)
    current_step = 0

    ken_burns_directions = ["zoom_in", "zoom_out", "pan_right", "pan_left"]

    # ── Intro slide ──
    if show_intro and title_text:
        intro = make_title_frame(width, height, title_text, subtitle_text)
        intro_frames = int(fps * 2.5)
        for i in range(intro_frames):
            fade_in = min(1.0, i / (fps * 0.5))
            frame = cv2.addWeighted(np.zeros_like(intro), 1 - fade_in, intro, fade_in, 0)
            out.write(frame)
        current_step += 1
        if progress_callback:
            progress_callback(int(current_step / total_steps * 85))

    # ── Photo slides ──
    loaded_frames = []
    for i, url in enumerate(photo_urls):
        try:
            img_path = os.path.join(tmp_dir, f"photo_{i}.jpg")
            download_image(url, img_path)
            frame = load_and_crop(img_path, width, height)
            loaded_frames.append(frame)
        except Exception as e:
            print(f"Failed to load photo {url}: {e}")
            loaded_frames.append(np.zeros((height, width, 3), dtype=np.uint8))

    for i, frame in enumerate(loaded_frames):
        kb_dir = ken_burns_directions[i % len(ken_burns_directions)]

        for f in range(photo_frames):
            t = f / fps
            if ken_burns:
                display = apply_ken_burns(frame.copy(), f, photo_frames, kb_dir)
            else:
                display = frame.copy()

            if overlay_text:
                display = add_text_overlay(display, overlay_text, "bottom")
            if watermark:
                display = add_watermark(display, watermark)
            out.write(display)

        # Transition to next photo
        if i < len(loaded_frames) - 1:
            next_frame = loaded_frames[i + 1]
            for t in range(transition_frames):
                progress = t / transition_frames
                if ken_burns:
                    fa = apply_ken_burns(frame.copy(), photo_frames + t, photo_frames + transition_frames, kb_dir)
                    next_kb = ken_burns_directions[(i + 1) % len(ken_burns_directions)]
                    fb = apply_ken_burns(next_frame.copy(), t, photo_frames, next_kb)
                else:
                    fa = frame.copy()
                    fb = next_frame.copy()
                blended = make_transition(fa, fb, progress, transition)
                if watermark:
                    blended = add_watermark(blended, watermark)
                out.write(blended)

        current_step += 1
        if progress_callback:
            progress_callback(int((current_step / total_steps) * 85))

    # ── Outro slide ──
    if show_outro and title_text:
        outro_text = subtitle_text or "SnapFace"
        outro = make_title_frame(width, height, outro_text, "Captured with SnapFace")
        outro_frames = int(fps * 2.5)
        for i in range(outro_frames):
            fade = min(1.0, i / (fps * 0.5))
            frame = cv2.addWeighted(np.zeros_like(outro), 1 - fade, outro, fade, 0)
            out.write(frame)
        current_step += 1
        if progress_callback:
            progress_callback(90)

    out.release()

    # ── Add music with FFmpeg ──
    music_track_id = settings.get("music_track_id")
    music_url = settings.get("music_url")

    if music_track_id or music_url:
        music_path = None

        if music_track_id:
            music_path = os.path.join(MUSIC_DIR, f"{music_track_id}.mp3")
            if not os.path.exists(music_path):
                music_path = None

        if not music_path and music_url:
            try:
                music_path = os.path.join(tmp_dir, "music.mp3")
                urllib.request.urlretrieve(music_url, music_path)
            except Exception as e:
                print(f"Music download failed: {e}")
                music_path = None

        if music_path and os.path.exists(music_path):
            try:
                subprocess.run([
                    "ffmpeg", "-y",
                    "-i", video_path,
                    "-i", music_path,
                    "-c:v", "copy",
                    "-c:a", "aac",
                    "-b:a", "192k",
                    "-shortest",
                    "-af", "afade=t=in:st=0:d=1,afade=t=out:st=999:d=2",
                    final_path
                ], capture_output=True, timeout=120)
                if progress_callback:
                    progress_callback(98)
                return final_path
            except Exception as e:
                print(f"FFmpeg audio merge failed: {e}")

    # Re-encode with FFmpeg for better compatibility even without music
    try:
        subprocess.run([
            "ffmpeg", "-y",
            "-i", video_path,
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-movflags", "+faststart",
            final_path
        ], capture_output=True, timeout=120)
        if progress_callback:
            progress_callback(98)
        return final_path
    except Exception:
        return video_path