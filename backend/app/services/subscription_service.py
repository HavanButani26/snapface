from sqlalchemy.orm import Session
from app.models.subscription import Subscription
from app.models.user import User
from app.config.plans import PLANS
from datetime import datetime, timedelta


def get_or_create_subscription(db: Session, user: User) -> Subscription:
    """Get existing subscription or create free plan for new users."""
    sub = db.query(Subscription).filter(Subscription.owner_id == user.id).first()
    if not sub:
        sub = Subscription(
            owner_id=user.id,
            plan_name="free",
            storage_limit_bytes=PLANS["free"]["storage_bytes"],
            storage_used_bytes=0,
            status="active",
            is_active=True,
        )
        db.add(sub)
        db.commit()
        db.refresh(sub)
    return sub


def check_storage_available(sub: Subscription, upload_size_bytes: int) -> bool:
    """Check if user has enough storage for upload."""
    if sub.plan_name == "studio":
        return True  # unlimited
    return (sub.storage_used_bytes + upload_size_bytes) <= sub.storage_limit_bytes


def add_storage_used(db: Session, sub: Subscription, bytes_added: int):
    sub.storage_used_bytes += bytes_added
    db.commit()


def get_storage_percent(sub: Subscription) -> float:
    if sub.plan_name == "studio" or sub.storage_limit_bytes <= 0:
        return 0.0
    return min(100.0, (sub.storage_used_bytes / sub.storage_limit_bytes) * 100)


def is_subscription_valid(sub: Subscription) -> bool:
    if sub.plan_name == "free":
        return True
    if not sub.expires_at:
        return False
    return datetime.now(tz=sub.expires_at.tzinfo) < sub.expires_at


def format_bytes(b: int) -> str:
    if b < 0:
        return "Unlimited"
    if b >= 1024 ** 3:
        return f"{b / (1024 ** 3):.1f} GB"
    if b >= 1024 ** 2:
        return f"{b / (1024 ** 2):.1f} MB"
    return f"{b / 1024:.1f} KB"