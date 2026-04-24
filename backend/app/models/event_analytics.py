from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid

class EventAnalytic(Base):
    __tablename__ = "event_analytics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    action = Column(String(50), nullable=False)
    photo_id = Column(UUID(as_uuid=True), ForeignKey("photos.id", ondelete="SET NULL"), nullable=True)
    guest_name = Column(String(200), nullable=True)
    gallery_token = Column(String(32), nullable=True)
    extra_data = Column(Text, nullable=True)  # renamed from metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    event = relationship("Event", backref="analytics")