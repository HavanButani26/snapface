from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid

class GuestGallery(Base):
    __tablename__ = "guest_galleries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    gallery_token = Column(String(32), unique=True, nullable=False, index=True)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    guest_name = Column(String(200), nullable=True)
    guest_selfie_url = Column(Text, nullable=True)
    matched_photo_ids = Column(Text, nullable=False)  # JSON list of photo IDs
    view_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)

    event = relationship("Event", backref="guest_galleries")