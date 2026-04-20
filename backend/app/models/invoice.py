from sqlalchemy import Column, String, Float, Boolean, DateTime, Text, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Client details
    client_name = Column(String(200), nullable=False)
    client_email = Column(String(255), nullable=True)
    client_phone = Column(String(20), nullable=True)
    client_address = Column(Text, nullable=True)

    # Invoice details
    invoice_number = Column(String(50), unique=True, nullable=False)
    invoice_date = Column(DateTime(timezone=True), server_default=func.now())
    due_date = Column(DateTime(timezone=True), nullable=True)
    event_name = Column(String(200), nullable=True)
    event_date = Column(DateTime(timezone=True), nullable=True)

    # Line items stored as JSON
    items = Column(Text, nullable=False)  # JSON list of {description, quantity, rate, amount}

    # Amounts
    subtotal = Column(Float, nullable=False, default=0)
    tax_percent = Column(Float, nullable=False, default=18.0)  # GST
    tax_amount = Column(Float, nullable=False, default=0)
    discount_amount = Column(Float, nullable=False, default=0)
    total_amount = Column(Float, nullable=False, default=0)

    # Payment
    status = Column(String(20), default="pending")  # pending, paid, overdue, cancelled
    razorpay_payment_link_id = Column(String(100), nullable=True)
    razorpay_payment_link_url = Column(Text, nullable=True)
    razorpay_payment_id = Column(String(100), nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)

    # Notes
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", backref="invoices")