from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
from app.database import get_db
from app.models.subscription import Subscription
from app.models.user import User
from app.routers.auth import get_current_user
from app.services.subscription_service import (
    get_or_create_subscription, get_storage_percent, format_bytes, is_subscription_valid
)
from app.config.plans import PLANS, CYCLE_MONTHS
from app.services.email_service import send_storage_limit_email
import razorpay, os, json
from dateutil.relativedelta import relativedelta

router = APIRouter(prefix="/subscription", tags=["subscription"])


def get_razorpay_client():
    return razorpay.Client(auth=(
        os.getenv("RAZORPAY_KEY_ID"),
        os.getenv("RAZORPAY_KEY_SECRET"),
    ))


# ---------- Schemas ----------

class SubscribeRequest(BaseModel):
    plan_name: str  # starter, pro, studio
    billing_cycle: str  # monthly, quarterly, yearly
    payment_method: str  # subscription, payment_link

class SubscriptionResponse(BaseModel):
    id: str
    plan_name: str
    plan_label: str
    billing_cycle: Optional[str]
    storage_limit_bytes: int
    storage_used_bytes: int
    storage_limit_label: str
    storage_used_label: str
    storage_percent: float
    status: str
    is_active: bool
    expires_at: Optional[datetime]
    razorpay_payment_link_url: Optional[str]
    days_remaining: Optional[int]


# ---------- Helpers ----------

def build_response(sub: Subscription) -> SubscriptionResponse:
    plan = PLANS.get(sub.plan_name, PLANS["free"])
    days_remaining = None
    if sub.expires_at:
        now = datetime.now(tz=sub.expires_at.tzinfo)
        diff = sub.expires_at - now
        days_remaining = max(0, diff.days)

    return SubscriptionResponse(
        id=str(sub.id),
        plan_name=sub.plan_name,
        plan_label=plan["name"],
        billing_cycle=sub.billing_cycle,
        storage_limit_bytes=sub.storage_limit_bytes,
        storage_used_bytes=sub.storage_used_bytes,
        storage_limit_label=plan["storage_label"],
        storage_used_label=format_bytes(sub.storage_used_bytes),
        storage_percent=get_storage_percent(sub),
        status=sub.status,
        is_active=sub.is_active,
        expires_at=sub.expires_at,
        razorpay_payment_link_url=sub.razorpay_payment_link_url,
        days_remaining=days_remaining,
    )


# ---------- Routes ----------

@router.get("/plans")
def get_plans():
    """Public — return all plan details for pricing page."""
    result = []
    for key, plan in PLANS.items():
        result.append({
            "key": key,
            "name": plan["name"],
            "storage_label": plan["storage_label"],
            "price_monthly": plan["price_monthly"],
            "price_quarterly": plan["price_quarterly"],
            "price_yearly": plan["price_yearly"],
            "features": plan["features"],
        })
    return result


@router.get("/me", response_model=SubscriptionResponse)
def get_my_subscription(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sub = get_or_create_subscription(db, current_user)

    # Auto-expire check
    if sub.expires_at and sub.plan_name != "free":
        now = datetime.now(tz=sub.expires_at.tzinfo)
        if now > sub.expires_at and sub.status == "active":
            sub.status = "expired"
            sub.is_active = False
            sub.plan_name = "free"
            sub.storage_limit_bytes = PLANS["free"]["storage_bytes"]
            db.commit()

    return build_response(sub)


@router.post("/subscribe")
def subscribe(
    payload: SubscribeRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.plan_name not in PLANS or payload.plan_name == "free":
        raise HTTPException(status_code=400, detail="Invalid plan")
    if payload.billing_cycle not in ["monthly", "quarterly", "yearly"]:
        raise HTTPException(status_code=400, detail="Invalid billing cycle")

    plan = PLANS[payload.plan_name]
    sub = get_or_create_subscription(db, current_user)
    client = get_razorpay_client()

    razorpay_sub_id = None
    razorpay_link_id = None
    razorpay_link_url = None

    if payload.payment_method == "subscription":
        # Auto-renewal subscription
        plan_id = plan["razorpay_plans"].get(payload.billing_cycle)
        if not plan_id:
            raise HTTPException(status_code=400, detail="Razorpay plan not configured")

        try:
            rzp_sub = client.subscription.create({
                "plan_id": plan_id,
                "customer_notify": 1,
                "quantity": 1,
                "total_count": 12 if payload.billing_cycle == "monthly" else (4 if payload.billing_cycle == "quarterly" else 1),
                "addons": [],
                "notes": {
                    "photographer": current_user.name,
                    "plan": payload.plan_name,
                    "cycle": payload.billing_cycle,
                },
            })
            razorpay_sub_id = rzp_sub.get("id")
            razorpay_link_url = rzp_sub.get("short_url")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Razorpay subscription failed: {e}")

    else:
        # One-time payment link
        price = plan[f"price_{payload.billing_cycle}"]
        try:
            link = client.payment_link.create({
                "amount": price * 100,
                "currency": "INR",
                "description": f"SnapFace {plan['name']} Plan - {payload.billing_cycle.title()}",
                "customer": {
                    "name": current_user.name,
                    "email": current_user.email,
                },
                "notify": {"email": True},
                "reminder_enable": True,
                "notes": {
                    "plan": payload.plan_name,
                    "cycle": payload.billing_cycle,
                    "user_id": str(current_user.id),
                },
                "callback_url": f"{os.getenv('BACKEND_URL', 'http://localhost:8000')}/subscription/webhook/payment",
                "callback_method": "get",
            })
            razorpay_link_id = link.get("id")
            razorpay_link_url = link.get("short_url")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Razorpay payment link failed: {e}")

    # Update subscription record
    months = CYCLE_MONTHS[payload.billing_cycle]
    now = datetime.now()

    sub.plan_name = payload.plan_name
    sub.billing_cycle = payload.billing_cycle
    sub.storage_limit_bytes = plan["storage_bytes"]
    sub.razorpay_subscription_id = razorpay_sub_id
    sub.razorpay_payment_link_id = razorpay_link_id
    sub.razorpay_payment_link_url = razorpay_link_url
    sub.status = "payment_pending"
    sub.started_at = now
    sub.expires_at = now + relativedelta(months=months)

    db.commit()
    db.refresh(sub)

    return {
        "message": "Payment link generated",
        "payment_url": razorpay_link_url,
        "subscription": build_response(sub),
    }


@router.post("/cancel")
def cancel_subscription(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sub = db.query(Subscription).filter(Subscription.owner_id == current_user.id).first()
    if not sub or sub.plan_name == "free":
        raise HTTPException(status_code=400, detail="No active subscription")

    # Cancel in Razorpay if subscription-based
    if sub.razorpay_subscription_id:
        try:
            client = get_razorpay_client()
            client.subscription.cancel(sub.razorpay_subscription_id, {"cancel_at_cycle_end": 1})
        except Exception as e:
            print(f"Razorpay cancel error: {e}")

    sub.status = "cancelled"
    sub.cancelled_at = datetime.now()
    db.commit()

    return {"message": "Subscription cancelled. Access continues until expiry date."}


@router.post("/webhook/payment")
async def payment_webhook(request: Request, db: Session = Depends(get_db)):
    """Razorpay payment link webhook — activates subscription on payment."""
    try:
        body = await request.json()
        event = body.get("event")

        if event in ["payment_link.paid", "subscription.charged"]:
            payload = body.get("payload", {})

            # Get notes to find user
            notes = {}
            if event == "payment_link.paid":
                notes = payload.get("payment_link", {}).get("entity", {}).get("notes", {})
            else:
                notes = payload.get("subscription", {}).get("entity", {}).get("notes", {})

            user_id = notes.get("user_id")
            plan_name = notes.get("plan")
            cycle = notes.get("cycle")

            if not user_id:
                return {"status": "ok"}

            sub = db.query(Subscription).filter(
                Subscription.owner_id == user_id
            ).first()

            if sub and plan_name:
                plan = PLANS.get(plan_name, PLANS["free"])
                months = CYCLE_MONTHS.get(cycle, 1)
                now = datetime.now()

                sub.status = "active"
                sub.is_active = True
                sub.plan_name = plan_name
                sub.billing_cycle = cycle
                sub.storage_limit_bytes = plan["storage_bytes"]
                sub.started_at = now
                sub.expires_at = now + relativedelta(months=months)
                db.commit()

        return {"status": "ok"}
    except Exception as e:
        print(f"Webhook error: {e}")
        return {"status": "error"}