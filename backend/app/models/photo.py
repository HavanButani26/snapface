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

    cloudinary_public_id = Column(String(255), nullable=False)
    url = Column(Text, nullable=False)
    thumbnail_url = Column(Text, nullable=True)

    face_encoding = Column(ARRAY(Float), nullable=True)
    all_face_encodings = Column(Text, nullable=True)
    face_count = Column(Integer, default=0)

    dominant_emotion = Column(String(50), nullable=True)
    emotion_scores = Column(Text, nullable=True)
    face_emotions = Column(Text, nullable=True)

    # Scene detection
    scene_category = Column(String(50), nullable=True)
    scene_confidence = Column(Float, nullable=True)

    sharpness_score = Column(Float, nullable=True)
    is_watermarked = Column(Boolean, default=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    event = relationship("Event", back_populates="photos")