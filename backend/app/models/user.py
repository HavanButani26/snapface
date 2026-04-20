from sqlalchemy import Column, String, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    logo_url = Column(Text, nullable=True)         # for custom branding
    watermark_url = Column(Text, nullable=True)    # for watermark on photos
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    events = relationship("Event", back_populates="owner", cascade="all, delete")
    studio_name = Column(String(200), nullable=True)
    studio_address = Column(Text, nullable=True)
    studio_phone = Column(String(20), nullable=True)
    studio_gstin = Column(String(20), nullable=True)
    studio_upi_id = Column(String(100), nullable=True)  