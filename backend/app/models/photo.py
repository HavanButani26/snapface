from sqlalchemy import Column, String, Float, Boolean, DateTime, Text, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid

class Photo(Base):
    __tablename__ = "photos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)

    # Cloudinary
    cloudinary_public_id = Column(String(255), nullable=False)
    url = Column(Text, nullable=False)
    thumbnail_url = Column(Text, nullable=True)

    # Face encoding — stored as array of floats (512-dim for buffalo_l)
    face_encoding = Column(ARRAY(Float), nullable=True)
    face_count = Column(Integer, default=0)

    # Emotion (our unique feature — from DeepFace)
    dominant_emotion = Column(String(50), nullable=True)  # happy, sad, angry, surprised, neutral, fear, disgust
    emotion_scores = Column(Text, nullable=True)           # JSON string of all scores

    # Quality score for auto reel selection
    sharpness_score = Column(Float, nullable=True)

    # Watermark applied?
    is_watermarked = Column(Boolean, default=False)

    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    event = relationship("Event", back_populates="photos")