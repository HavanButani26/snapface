import cv2
import numpy as np
from PIL import Image
import io
import json


SCENE_CATEGORIES = [
    "outdoor",
    "indoor",
    "portrait",
    "group",
    "candid",
    "ceremony",
    "celebration",
    "nature",
    "night",
]


def bytes_to_pil(image_bytes: bytes) -> Image.Image:
    return Image.open(io.BytesIO(image_bytes)).convert("RGB")


def bytes_to_cv2(image_bytes: bytes) -> np.ndarray:
    pil = bytes_to_pil(image_bytes)
    return cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR)


def analyze_brightness(img_cv2: np.ndarray) -> float:
    """Average brightness 0-255."""
    gray = cv2.cvtColor(img_cv2, cv2.COLOR_BGR2GRAY)
    return float(np.mean(gray))


def analyze_colorfulness(img_cv2: np.ndarray) -> float:
    """Measure colorfulness using rg/yb method."""
    (B, G, R) = cv2.split(img_cv2.astype("float"))
    rg = np.absolute(R - G)
    yb = np.absolute(0.5 * (R + G) - B)
    std_root = np.sqrt(np.std(rg) ** 2 + np.std(yb) ** 2)
    mean_root = np.sqrt(np.mean(rg) ** 2 + np.mean(yb) ** 2)
    return float(std_root + 0.3 * mean_root)


def analyze_sky(img_cv2: np.ndarray) -> float:
    """Estimate sky presence in top third of image."""
    h, w = img_cv2.shape[:2]
    top_third = img_cv2[:h // 3, :]
    hsv = cv2.cvtColor(top_third, cv2.COLOR_BGR2HSV)

    # Blue sky range
    sky_blue_lower = np.array([90, 50, 100])
    sky_blue_upper = np.array([130, 255, 255])
    sky_mask = cv2.inRange(hsv, sky_blue_lower, sky_blue_upper)

    # White/gray sky range
    sky_gray_lower = np.array([0, 0, 180])
    sky_gray_upper = np.array([180, 30, 255])
    gray_mask = cv2.inRange(hsv, sky_gray_lower, sky_gray_upper)

    combined = cv2.bitwise_or(sky_mask, gray_mask)
    sky_ratio = float(np.sum(combined > 0)) / (top_third.shape[0] * top_third.shape[1])
    return sky_ratio


def analyze_green(img_cv2: np.ndarray) -> float:
    """Detect green/nature content."""
    hsv = cv2.cvtColor(img_cv2, cv2.COLOR_BGR2HSV)
    green_lower = np.array([35, 40, 40])
    green_upper = np.array([85, 255, 255])
    mask = cv2.inRange(hsv, green_lower, green_upper)
    return float(np.sum(mask > 0)) / (img_cv2.shape[0] * img_cv2.shape[1])


def analyze_blur(img_cv2: np.ndarray) -> float:
    """Laplacian variance — blurry images suggest candid/motion."""
    gray = cv2.cvtColor(img_cv2, cv2.COLOR_BGR2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def detect_scene(image_bytes: bytes, face_count: int = 0) -> dict:
    """
    Detect scene category using computer vision heuristics.
    Returns: { category, confidence, scores }
    """
    try:
        img = bytes_to_cv2(image_bytes)
        h, w = img.shape[:2]

        # Compute features
        brightness = analyze_brightness(img)
        colorfulness = analyze_colorfulness(img)
        sky_ratio = analyze_sky(img)
        green_ratio = analyze_green(img)
        sharpness = analyze_blur(img)

        scores = {}

        # ── Night detection ──
        if brightness < 60:
            scores["night"] = 0.85 if brightness < 40 else 0.65

        # ── Outdoor detection ──
        outdoor_score = 0.0
        if sky_ratio > 0.15:
            outdoor_score += 0.5
        if green_ratio > 0.15:
            outdoor_score += 0.3
        if brightness > 100:
            outdoor_score += 0.2
        scores["outdoor"] = min(outdoor_score, 0.95)

        # ── Indoor detection ──
        indoor_score = 0.0
        if sky_ratio < 0.05:
            indoor_score += 0.4
        if green_ratio < 0.05:
            indoor_score += 0.2
        if brightness < 150 and brightness > 50:
            indoor_score += 0.2
        if colorfulness < 30:
            indoor_score += 0.2
        scores["indoor"] = min(indoor_score, 0.90)

        # ── Portrait detection ──
        if face_count == 1:
            scores["portrait"] = 0.85
        elif face_count == 2:
            scores["portrait"] = 0.55

        # ── Group detection ──
        if face_count >= 4:
            scores["group"] = 0.90
        elif face_count == 3:
            scores["group"] = 0.70
        elif face_count == 2:
            scores["group"] = 0.45

        # ── Candid detection ──
        # Low sharpness + natural lighting suggests candid
        candid_score = 0.0
        if sharpness < 200:
            candid_score += 0.3
        if face_count >= 2 and sharpness < 500:
            candid_score += 0.2
        if brightness > 80 and sky_ratio > 0.05:
            candid_score += 0.2
        scores["candid"] = min(candid_score, 0.75)

        # ── Ceremony detection ──
        # High colorfulness + indoor + multiple faces
        ceremony_score = 0.0
        if colorfulness > 60:
            ceremony_score += 0.3
        if face_count >= 3:
            ceremony_score += 0.3
        if brightness > 120:
            ceremony_score += 0.2
        scores["ceremony"] = min(ceremony_score, 0.80)

        # ── Celebration detection ──
        celebration_score = 0.0
        if colorfulness > 70:
            celebration_score += 0.4
        if brightness > 140:
            celebration_score += 0.2
        if face_count >= 2:
            celebration_score += 0.2
        scores["celebration"] = min(celebration_score, 0.80)

        # ── Nature detection ──
        nature_score = 0.0
        if green_ratio > 0.25:
            nature_score += 0.5
        if sky_ratio > 0.10:
            nature_score += 0.2
        if face_count == 0:
            nature_score += 0.2
        if colorfulness > 50:
            nature_score += 0.1
        scores["nature"] = min(nature_score, 0.90)

        # ── Pick best category ──
        # Portrait/Group override other categories when face count is high
        if face_count >= 4 and scores.get("group", 0) >= 0.70:
            best = "group"
            confidence = scores["group"]
        elif face_count == 1 and scores.get("portrait", 0) >= 0.80:
            best = "portrait"
            confidence = scores["portrait"]
        else:
            # Among remaining, pick highest scoring
            if scores:
                best = max(scores, key=scores.get)
                confidence = scores[best]
            else:
                best = "outdoor" if sky_ratio > 0.1 else "indoor"
                confidence = 0.5

        print(f"Scene detected: {best} ({confidence:.2f}) | faces={face_count} bright={brightness:.0f} sky={sky_ratio:.2f} green={green_ratio:.2f}")

        return {
            "scene_category": best,
            "scene_confidence": round(confidence, 3),
            "scene_scores": scores,
        }

    except Exception as e:
        print(f"Scene detection error: {e}")
        return {
            "scene_category": "outdoor",
            "scene_confidence": 0.5,
            "scene_scores": {},
        }