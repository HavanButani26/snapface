import numpy as np
import cv2
from PIL import Image
import io

import insightface
from insightface.app import FaceAnalysis

_app = None

def get_face_app():
    global _app
    if _app is None:
        _app = FaceAnalysis(
            name="buffalo_l",
            providers=["CPUExecutionProvider"],
        )
        _app.prepare(ctx_id=-1, det_size=(640, 640))
    return _app


def bytes_to_cv2(image_bytes: bytes) -> np.ndarray:
    pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)


def extract_encodings(image_bytes: bytes) -> list[list[float]]:
    """Returns ALL face encodings found in the image."""
    app = get_face_app()
    img = bytes_to_cv2(image_bytes)
    faces = app.get(img)
    return [face.embedding.tolist() for face in faces]


def cosine_distance(a: list[float], b: list[float]) -> float:
    va = np.array(a)
    vb = np.array(b)
    return 1 - np.dot(va, vb) / (np.linalg.norm(va) * np.linalg.norm(vb) + 1e-6)


def match_face(
    selfie_encoding: list[float],
    stored_encodings: list[list[float]],
    threshold: float = 0.55,   # loosened from 0.4 → 0.55 for group photos
) -> tuple[bool, float]:
    """
    Returns (is_match, best_distance).
    Compares selfie against ALL stored encodings in a photo.
    """
    best_dist = 1.0
    for enc in stored_encodings:
        dist = cosine_distance(selfie_encoding, enc)
        if dist < best_dist:
            best_dist = dist
    return best_dist < threshold, best_dist


def compute_sharpness(image_bytes: bytes) -> float:
    img = bytes_to_cv2(image_bytes)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())