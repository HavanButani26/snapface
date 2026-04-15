from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid

class Capsule(Base):
    __tablename__ = "capsules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, unique=True)
    unlock_at = Column(DateTime(timezone=True), nullable=False)   # future date
    message = Column(Text, nullable=True)                          # optional note from photographer
    is_unlocked = Column(Boolean, default=False)
    notify_emails = Column(Text, nullable=True)                    # JSON list of guest emails to notify
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    event = relationship("Event", back_populates="capsule")