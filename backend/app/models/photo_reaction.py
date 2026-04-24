from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid

class PhotoReaction(Base):
    __tablename__ = "photo_reactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    photo_id = Column(UUID(as_uuid=True), ForeignKey("photos.id", ondelete="CASCADE"), nullable=False)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    gallery_token = Column(String(32), nullable=True)
    reaction = Column(String(10), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    photo = relationship("Photo", backref="reactions")
    event = relationship("Event", backref="reactions")