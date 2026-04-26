from sqlalchemy import Column, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid

class PhotoDuplicate(Base):
    __tablename__ = "photo_duplicates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    photo_id_a = Column(UUID(as_uuid=True), ForeignKey("photos.id", ondelete="CASCADE"), nullable=False)
    photo_id_b = Column(UUID(as_uuid=True), ForeignKey("photos.id", ondelete="CASCADE"), nullable=False)
    similarity = Column(Float, nullable=False)
    recommended_keep = Column(UUID(as_uuid=True), ForeignKey("photos.id", ondelete="SET NULL"), nullable=True)
    resolved = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    event = relationship("Event", backref="duplicates")
    photo_a = relationship("Photo", foreign_keys=[photo_id_a])
    photo_b = relationship("Photo", foreign_keys=[photo_id_b])
    kept_photo = relationship("Photo", foreign_keys=[recommended_keep])