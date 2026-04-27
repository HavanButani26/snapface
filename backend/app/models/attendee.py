from sqlalchemy import Column, String, Boolean, Float, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid

class Attendee(Base):
    __tablename__ = "attendees"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(200), nullable=False)
    email = Column(String(255), nullable=True)
    department = Column(String(100), nullable=True)
    employee_id = Column(String(50), nullable=True)
    reference_photo_url = Column(Text, nullable=True)
    face_encoding = Column(Text, nullable=True)  # JSON 512-dim vector
    is_present = Column(Boolean, default=False)
    matched_photo_ids = Column(Text, nullable=True)  # JSON list
    confidence = Column(Float, nullable=True)
    marked_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    event = relationship("Event", backref="attendees")