from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid

class Event(Base):
    __tablename__ = "events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    event_date = Column(DateTime(timezone=True), nullable=True)

    # Countdown feature
    photos_ready_at = Column(DateTime(timezone=True), nullable=True)
    countdown_message = Column(Text, nullable=True)
    notify_emails = Column(Text, nullable=True)  # JSON list of registered emails

    is_password_protected = Column(Boolean, default=False)
    album_password = Column(String(255), nullable=True)
    qr_token = Column(String(100), unique=True, nullable=False, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="events")
    photos = relationship("Photo", back_populates="event", cascade="all, delete")
    capsule = relationship("Capsule", back_populates="event", uselist=False, cascade="all, delete")