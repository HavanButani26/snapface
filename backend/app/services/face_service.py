import numpy as np
import cv2
from PIL import Image
import io
import os

# InsightFace — buffalo_l model
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
    """
    Returns a list of 512-dim face encodings — one per face detected.
    Returns empty list if no faces found.
    """
    app = get_face_app()
    img = bytes_to_cv2(image_bytes)
    faces = app.get(img)
    return [face.embedding.tolist() for face in faces]


def match_face(
    selfie_encoding: list[float],
    stored_encodings: list[list[float]],
    threshold: float = 0.4,
) -> bool:
    """
    Compare selfie encoding against all face encodings in a photo.
    Returns True if any face in the photo matches the selfie.
    Cosine distance — lower = more similar. Threshold 0.4 works well for buffalo_l.
    """
    selfie_vec = np.array(selfie_encoding)
    for enc in stored_encodings:
        stored_vec = np.array(enc)
        # Cosine similarity
        cosine_sim = np.dot(selfie_vec, stored_vec) / (
            np.linalg.norm(selfie_vec) * np.linalg.norm(stored_vec) + 1e-6
        )
        # Convert to distance
        distance = 1 - cosine_sim
        if distance < threshold:
            return True
    return False


def compute_sharpness(image_bytes: bytes) -> float:
    """
    Laplacian variance — higher = sharper image.
    Used for auto reel photo selection.
    """
    img = bytes_to_cv2(image_bytes)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())