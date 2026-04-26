import numpy as np
import cv2
from PIL import Image
import io
from itertools import combinations


def bytes_to_cv2(image_bytes: bytes) -> np.ndarray:
    pil = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR)


def compute_phash(image_bytes: bytes, hash_size: int = 16) -> np.ndarray:
    """
    Perceptual hash — similar images have similar hashes.
    Much better than pixel comparison for detecting near-duplicates.
    """
    pil = Image.open(io.BytesIO(image_bytes)).convert("L")  # grayscale
    pil = pil.resize((hash_size, hash_size), Image.LANCZOS)
    pixels = np.array(pil, dtype=float)
    mean = pixels.mean()
    return (pixels > mean).flatten()


def phash_similarity(hash_a: np.ndarray, hash_b: np.ndarray) -> float:
    """
    Returns similarity 0.0 to 1.0.
    1.0 = identical, 0.95+ = near-duplicate.
    """
    if hash_a is None or hash_b is None:
        return 0.0
    hamming = np.sum(hash_a != hash_b)
    return 1.0 - (hamming / len(hash_a))


def compute_histogram_similarity(image_bytes_a: bytes, image_bytes_b: bytes) -> float:
    """
    Color histogram similarity as secondary check.
    Helps distinguish same-scene but different-moment shots.
    """
    try:
        img_a = bytes_to_cv2(image_bytes_a)
        img_b = bytes_to_cv2(image_bytes_b)

        hist_a = cv2.calcHist([img_a], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256])
        hist_b = cv2.calcHist([img_b], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256])

        cv2.normalize(hist_a, hist_a)
        cv2.normalize(hist_b, hist_b)

        return float(cv2.compareHist(hist_a, hist_b, cv2.HISTCMP_CORREL))
    except Exception:
        return 0.0


def score_photo_quality(sharpness: float, face_count: int, dominant_emotion: str = None) -> float:
    """
    Score a photo for quality to determine which duplicate to keep.
    Higher = better to keep.
    """
    score = 0.0

    # Sharpness (most important factor)
    if sharpness:
        score += min(sharpness / 1000, 1.0) * 0.6

    # Prefer photos with faces
    if face_count > 0:
        score += 0.2

    # Prefer happy/celebration emotions
    emotion_bonus = {
        "happy": 0.2,
        "surprised": 0.1,
        "neutral": 0.05,
        "sad": 0.0,
        "angry": 0.0,
        "fear": 0.0,
        "disgust": 0.0,
    }
    if dominant_emotion:
        score += emotion_bonus.get(dominant_emotion.lower(), 0.0)

    return round(score, 4)


def find_duplicates(
    photos_data: list[dict],
    phash_threshold: float = 0.90,
    histogram_threshold: float = 0.85,
) -> list[dict]:
    """
    Find near-duplicate photos using perceptual hashing.

    photos_data: list of {
        id, sharpness_score, face_count, dominant_emotion, phash
    }

    Returns list of duplicate pairs: {
        photo_id_a, photo_id_b, similarity, recommended_keep
    }
    """
    duplicates = []
    seen_pairs = set()

    for i, photo_a in enumerate(photos_data):
        for j, photo_b in enumerate(photos_data):
            if i >= j:
                continue

            pair_key = tuple(sorted([photo_a["id"], photo_b["id"]]))
            if pair_key in seen_pairs:
                continue
            seen_pairs.add(pair_key)

            # Compare perceptual hashes
            if photo_a.get("phash") is None or photo_b.get("phash") is None:
                continue

            similarity = phash_similarity(photo_a["phash"], photo_b["phash"])

            if similarity >= phash_threshold:
                # Determine which to keep
                score_a = score_photo_quality(
                    photo_a.get("sharpness_score", 0),
                    photo_a.get("face_count", 0),
                    photo_a.get("dominant_emotion"),
                )
                score_b = score_photo_quality(
                    photo_b.get("sharpness_score", 0),
                    photo_b.get("face_count", 0),
                    photo_b.get("dominant_emotion"),
                )

                recommended_keep = photo_a["id"] if score_a >= score_b else photo_b["id"]

                duplicates.append({
                    "photo_id_a": photo_a["id"],
                    "photo_id_b": photo_b["id"],
                    "similarity": round(similarity, 4),
                    "recommended_keep": recommended_keep,
                    "score_a": score_a,
                    "score_b": score_b,
                })

                print(f"Duplicate found: {similarity:.3f} similarity | keep={'A' if recommended_keep == photo_a['id'] else 'B'}")

    return duplicates