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
    Returns dominant_emotion and all emotion scores.
    Tries DeepFace first, falls back to InsightFace genderage model.
    Returns None values if no face detected.
    """
    try:
        from deepface import DeepFace
        img = bytes_to_cv2(image_bytes)
        result = DeepFace.analyze(
            img,
            actions=["emotion"],
            enforce_detection=False,
            detector_backend="opencv",   # faster + more stable than default
            silent=True,
        )
        if isinstance(result, list):
            result = result[0]

        emotion_scores = result.get("emotion", {})
        dominant = result.get("dominant_emotion", None)

        print(f"Emotion detected: {dominant} | scores: {emotion_scores}")

        if dominant and emotion_scores:
            return {
                "dominant_emotion": dominant.lower(),
                "emotion_scores": json.dumps(
                    {k.lower(): round(float(v), 2) for k, v in emotion_scores.items()}
                ),
            }
        return {"dominant_emotion": None, "emotion_scores": None}

    except Exception as e:
        print(f"DeepFace emotion error: {e}")
        return {"dominant_emotion": None, "emotion_scores": None}