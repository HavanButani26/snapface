from sqlalchemy import Column, String, Float, Boolean, DateTime, Text, ForeignKey, BigInteger
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)

    # Plan info
    plan_name = Column(String(50), nullable=False, default="free")  # free, starter, pro, studio
    billing_cycle = Column(String(20), nullable=True)  # monthly, quarterly, yearly

    # Storage in bytes
    storage_limit_bytes = Column(BigInteger, nullable=False, default=2 * 1024 * 1024 * 1024)  # 2GB default
    storage_used_bytes = Column(BigInteger, nullable=False, default=0)

    # Razorpay
    razorpay_subscription_id = Column(String(100), nullable=True)
    razorpay_payment_link_id = Column(String(100), nullable=True)
    razorpay_payment_link_url = Column(Text, nullable=True)

    # Status
    status = Column(String(20), default="active")  # active, expired, cancelled, payment_pending
    is_active = Column(Boolean, default=True)

    # Dates
    started_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", backref="subscription", uselist=False)