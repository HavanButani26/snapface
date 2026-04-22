import json
import numpy as np
import cv2
from PIL import Image
import io


def bytes_to_cv2(image_bytes: bytes):
    pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)


def detect_emotion(image_bytes: bytes) -> dict:
    """
    Returns dominant_emotion and all emotion scores for the whole image.
    Used for backwards compatibility.
    """
    try:
        from deepface import DeepFace
        img = bytes_to_cv2(image_bytes)
        result = DeepFace.analyze(
            img,
            actions=["emotion"],
            enforce_detection=False,
            detector_backend="opencv",
            silent=True,
        )
        if isinstance(result, list):
            result = result[0]

        emotion_scores = result.get("emotion", {})
        dominant = result.get("dominant_emotion", None)

        print(f"Whole-image emotion: {dominant}")

        if dominant and emotion_scores:
            return {
                "dominant_emotion": dominant.lower(),
                "emotion_scores": json.dumps(
                    {k.lower(): round(float(v), 2) for k, v in emotion_scores.items()}
                ),
            }
        return {"dominant_emotion": None, "emotion_scores": None}

    except Exception as e:
        print(f"DeepFace whole-image emotion error: {e}")
        return {"dominant_emotion": None, "emotion_scores": None}


def detect_per_face_emotions(image_bytes: bytes, face_encodings: list) -> list:
    """
    Detect emotion for each face individually.

    Uses InsightFace face bounding boxes to crop each face,
    then runs DeepFace on each crop separately.

    Returns list of:
    {
        "index": int,           # index matching all_face_encodings
        "emotion": str,         # dominant emotion for THIS face
        "scores": dict,         # all emotion probabilities for THIS face
        "bbox": [x,y,w,h]      # face bounding box in original image
    }
    """
    if not face_encodings:
        return []

    try:
        from deepface import DeepFace
        from insightface.app import FaceAnalysis
        from app.services.face_service import get_face_app, bytes_to_cv2

        img = bytes_to_cv2(image_bytes)
        app = get_face_app()
        faces = app.get(img)

        if not faces:
            return []

        per_face_emotions = []

        for idx, face in enumerate(faces):
            try:
                # Get bounding box from InsightFace
                bbox = face.bbox.astype(int)
                x1, y1, x2, y2 = bbox[0], bbox[1], bbox[2], bbox[3]

                # Add padding around face crop
                h, w = img.shape[:2]
                pad = 20
                x1 = max(0, x1 - pad)
                y1 = max(0, y1 - pad)
                x2 = min(w, x2 + pad)
                y2 = min(h, y2 + pad)

                # Skip if crop is too small
                crop_w = x2 - x1
                crop_h = y2 - y1
                if crop_w < 30 or crop_h < 30:
                    per_face_emotions.append({
                        "index": idx,
                        "emotion": "neutral",
                        "scores": {},
                        "bbox": [int(x1), int(y1), int(crop_w), int(crop_h)],
                    })
                    continue

                # Crop face
                face_crop = img[y1:y2, x1:x2]

                # Run DeepFace on just this face crop
                result = DeepFace.analyze(
                    face_crop,
                    actions=["emotion"],
                    enforce_detection=False,
                    detector_backend="skip",  # skip detection since we already cropped
                    silent=True,
                )

                if isinstance(result, list):
                    result = result[0]

                emotion_scores = result.get("emotion", {})
                dominant = result.get("dominant_emotion", "neutral")

                per_face_emotions.append({
                    "index": idx,
                    "emotion": dominant.lower(),
                    "scores": {k.lower(): round(float(v), 2) for k, v in emotion_scores.items()},
                    "bbox": [int(x1), int(y1), int(crop_w), int(crop_h)],
                })

                print(f"  Face {idx}: {dominant.lower()}")

            except Exception as e:
                print(f"  Face {idx} emotion error: {e}")
                per_face_emotions.append({
                    "index": idx,
                    "emotion": "neutral",
                    "scores": {},
                    "bbox": [],
                })

        return per_face_emotions

    except Exception as e:
        print(f"Per-face emotion detection error: {e}")
        return []