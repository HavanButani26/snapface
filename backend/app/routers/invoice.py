from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.database import get_db
from app.models.invoice import Invoice
from app.models.user import User
from app.routers.auth import get_current_user
from app.services.pdf_service import generate_invoice_pdf
from app.services.email_service import send_invoice_email, send_payment_confirmation_email
import json, os, uuid, razorpay

router = APIRouter(prefix="/invoices", tags=["invoices"])

def get_razorpay_client():
    return razorpay.Client(
        auth=(
            os.getenv("RAZORPAY_KEY_ID"),
            os.getenv("RAZORPAY_KEY_SECRET"),
        )
    )


# ---------- Schemas ----------

class InvoiceItem(BaseModel):
    description: str
    quantity: float = 1
    rate: float
    amount: float

class InvoiceCreate(BaseModel):
    client_name: str
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    client_address: Optional[str] = None
    event_name: Optional[str] = None
    event_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    items: list[InvoiceItem]
    tax_percent: float = 18.0
    discount_amount: float = 0.0
    notes: Optional[str] = None

class ProfileUpdate(BaseModel):
    studio_name: Optional[str] = None
    studio_address: Optional[str] = None
    studio_phone: Optional[str] = None
    studio_gstin: Optional[str] = None
    studio_upi_id: Optional[str] = None

class InvoiceResponse(BaseModel):
    id: str
    invoice_number: str
    client_name: str
    client_email: Optional[str]
    client_phone: Optional[str]
    event_name: Optional[str]
    subtotal: float
    tax_amount: float
    discount_amount: float
    total_amount: float
    tax_percent: float
    status: str
    razorpay_payment_link_url: Optional[str]
    invoice_date: datetime
    due_date: Optional[datetime]
    paid_at: Optional[datetime]
    notes: Optional[str]
    items: str
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Helpers ----------

def generate_invoice_number(db: Session, owner_id: str) -> str:
    count = db.query(Invoice).filter(Invoice.owner_id == owner_id).count()
    now = datetime.now()
    return f"INV-{now.year}{now.month:02d}-{count + 1:04d}"


def build_invoice_response(inv: Invoice) -> InvoiceResponse:
    return InvoiceResponse(
        id=str(inv.id),
        invoice_number=inv.invoice_number,
        client_name=inv.client_name,
        client_email=inv.client_email,
        client_phone=inv.client_phone,
        event_name=inv.event_name,
        subtotal=inv.subtotal,
        tax_amount=inv.tax_amount,
        discount_amount=inv.discount_amount,
        total_amount=inv.total_amount,
        tax_percent=inv.tax_percent,
        status=inv.status,
        razorpay_payment_link_url=inv.razorpay_payment_link_url,
        invoice_date=inv.invoice_date,
        due_date=inv.due_date,
        paid_at=inv.paid_at,
        notes=inv.notes,
        items=inv.items,
        created_at=inv.created_at,
    )


# ---------- Routes ----------

@router.put("/profile", response_model=dict)
def update_studio_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)
    db.commit()
    return {"message": "Profile updated"}


@router.get("/profile")
def get_studio_profile(
    current_user: User = Depends(get_current_user),
):
    return {
        "name": current_user.name,
        "email": current_user.email,
        "studio_name": current_user.studio_name,
        "studio_address": current_user.studio_address,
        "studio_phone": current_user.studio_phone,
        "studio_gstin": current_user.studio_gstin,
        "studio_upi_id": current_user.studio_upi_id,
    }


@router.post("", response_model=InvoiceResponse, status_code=201)
def create_invoice(
    payload: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Calculate amounts
    subtotal = sum(item.amount for item in payload.items)
    taxable = subtotal - payload.discount_amount
    tax_amount = round(taxable * payload.tax_percent / 100, 2)
    total_amount = round(taxable + tax_amount, 2)

    invoice_number = generate_invoice_number(db, str(current_user.id))

    # Create Razorpay payment link
    rzp_link_id = None
    rzp_link_url = None
    try:
        client = get_razorpay_client()
        link_data = client.payment_link.create({
            "amount": int(total_amount * 100),  # paise
            "currency": "INR",
            "description": f"Invoice {invoice_number} - {payload.event_name or payload.client_name}",
            "customer": {
                "name": payload.client_name,
                "email": payload.client_email or "",
                "contact": payload.client_phone or "",
            },
            "notify": {
                "sms": bool(payload.client_phone),
                "email": bool(payload.client_email),
            },
            "reminder_enable": True,
            "notes": {
                "invoice_number": invoice_number,
                "photographer": current_user.name,
            },
            "callback_url": f"{os.getenv('BACKEND_URL', 'http://localhost:8000')}/invoices/webhook/razorpay",
            "callback_method": "get",
        })
        rzp_link_id = link_data.get("id")
        rzp_link_url = link_data.get("short_url")
    except Exception as e:
        print(f"Razorpay link creation failed: {e}")

    invoice = Invoice(
        owner_id=current_user.id,
        client_name=payload.client_name,
        client_email=payload.client_email,
        client_phone=payload.client_phone,
        client_address=payload.client_address,
        invoice_number=invoice_number,
        event_name=payload.event_name,
        event_date=payload.event_date,
        due_date=payload.due_date,
        items=json.dumps([item.model_dump() for item in payload.items]),
        subtotal=subtotal,
        tax_percent=payload.tax_percent,
        tax_amount=tax_amount,
        discount_amount=payload.discount_amount,
        total_amount=total_amount,
        notes=payload.notes,
        status="pending",
        razorpay_payment_link_id=rzp_link_id,
        razorpay_payment_link_url=rzp_link_url,
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return build_invoice_response(invoice)


@router.get("", response_model=list[InvoiceResponse])
def list_invoices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    invoices = (
        db.query(Invoice)
        .filter(Invoice.owner_id == current_user.id)
        .order_by(Invoice.created_at.desc())
        .all()
    )
    return [build_invoice_response(inv) for inv in invoices]


@router.get("/analytics")
def get_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from sqlalchemy import extract, case
    now = datetime.now()

    # Current month
    month_invoices = db.query(Invoice).filter(
        Invoice.owner_id == current_user.id,
        extract("month", Invoice.created_at) == now.month,
        extract("year", Invoice.created_at) == now.year,
    ).all()

    # All invoices
    all_invoices = db.query(Invoice).filter(
        Invoice.owner_id == current_user.id
    ).all()

    # ── Last 6 months revenue ──
    monthly_revenue = []
    for i in range(5, -1, -1):
        from dateutil.relativedelta import relativedelta
        target = now - relativedelta(months=i)
        month_invs = [
            inv for inv in all_invoices
            if inv.created_at.month == target.month
            and inv.created_at.year == target.year
        ]
        collected = sum(inv.total_amount for inv in month_invs if inv.status == "paid")
        pending = sum(inv.total_amount for inv in month_invs if inv.status == "pending")
        monthly_revenue.append({
            "month": target.strftime("%b %Y"),
            "short_month": target.strftime("%b"),
            "collected": round(collected, 2),
            "pending": round(pending, 2),
            "total": round(collected + pending, 2),
        })

    # ── Invoice status breakdown ──
    status_counts = {
        "paid": len([i for i in all_invoices if i.status == "paid"]),
        "pending": len([i for i in all_invoices if i.status == "pending"]),
        "overdue": len([i for i in all_invoices if i.status == "overdue"]),
        "cancelled": len([i for i in all_invoices if i.status == "cancelled"]),
    }

    status_amounts = {
        "paid": round(sum(i.total_amount for i in all_invoices if i.status == "paid"), 2),
        "pending": round(sum(i.total_amount for i in all_invoices if i.status == "pending"), 2),
        "overdue": round(sum(i.total_amount for i in all_invoices if i.status == "overdue"), 2),
        "cancelled": round(sum(i.total_amount for i in all_invoices if i.status == "cancelled"), 2),
    }

    # ── Top 5 clients by revenue ──
    client_revenue: dict = {}
    for inv in all_invoices:
        if inv.client_name not in client_revenue:
            client_revenue[inv.client_name] = {"total": 0, "collected": 0, "count": 0}
        client_revenue[inv.client_name]["total"] += inv.total_amount
        client_revenue[inv.client_name]["count"] += 1
        if inv.status == "paid":
            client_revenue[inv.client_name]["collected"] += inv.total_amount

    top_clients = sorted(
        [{"name": k, **v} for k, v in client_revenue.items()],
        key=lambda x: x["total"],
        reverse=True
    )[:5]

    for c in top_clients:
        c["total"] = round(c["total"], 2)
        c["collected"] = round(c["collected"], 2)

    # ── Summary stats ──
    monthly_total = sum(i.total_amount for i in month_invoices)
    monthly_collected = sum(i.total_amount for i in month_invoices if i.status == "paid")
    monthly_pending = sum(i.total_amount for i in month_invoices if i.status == "pending")
    total_collected = sum(i.total_amount for i in all_invoices if i.status == "paid")
    total_pending = sum(i.total_amount for i in all_invoices if i.status == "pending")
    total_billed = sum(i.total_amount for i in all_invoices)

    return {
        "monthly": {
            "total_billed": round(monthly_total, 2),
            "collected": round(monthly_collected, 2),
            "pending": round(monthly_pending, 2),
            "invoice_count": len(month_invoices),
        },
        "all_time": {
            "total_billed": round(total_billed, 2),
            "collected": round(total_collected, 2),
            "pending": round(total_pending, 2),
            "invoice_count": len(all_invoices),
        },
        "by_status": status_counts,
        "by_status_amount": status_amounts,
        "monthly_revenue": monthly_revenue,
        "top_clients": top_clients,
    }


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inv = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.owner_id == current_user.id,
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return build_invoice_response(inv)


@router.get("/{invoice_id}/pdf")
def download_invoice_pdf(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inv = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.owner_id == current_user.id,
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    invoice_data = {
        "invoice_number": inv.invoice_number,
        "invoice_date": inv.invoice_date.strftime("%d %b %Y") if inv.invoice_date else "",
        "due_date": inv.due_date.strftime("%d %b %Y") if inv.due_date else "",
        "client_name": inv.client_name,
        "client_email": inv.client_email,
        "client_phone": inv.client_phone,
        "client_address": inv.client_address,
        "event_name": inv.event_name,
        "event_date": inv.event_date.strftime("%d %b %Y") if inv.event_date else "",
        "items": inv.items,
        "subtotal": inv.subtotal,
        "tax_percent": inv.tax_percent,
        "tax_amount": inv.tax_amount,
        "discount_amount": inv.discount_amount,
        "total_amount": inv.total_amount,
        "status": inv.status,
        "notes": inv.notes,
        "razorpay_payment_link_url": inv.razorpay_payment_link_url,
    }

    user_data = {
        "name": current_user.name,
        "email": current_user.email,
        "studio_name": current_user.studio_name,
        "studio_address": current_user.studio_address,
        "studio_phone": current_user.studio_phone,
        "studio_gstin": current_user.studio_gstin,
        "studio_upi_id": current_user.studio_upi_id,
    }

    pdf_bytes = generate_invoice_pdf(invoice_data, user_data)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="Invoice_{inv.invoice_number}.pdf"'
        }
    )


@router.post("/{invoice_id}/send-email")
def send_invoice_by_email(
    invoice_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inv = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.owner_id == current_user.id,
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if not inv.client_email:
        raise HTTPException(status_code=400, detail="Client email not set")

    invoice_data = {
        "invoice_number": inv.invoice_number,
        "invoice_date": inv.invoice_date.strftime("%d %b %Y") if inv.invoice_date else "",
        "due_date": inv.due_date.strftime("%d %b %Y") if inv.due_date else "",
        "client_name": inv.client_name,
        "client_email": inv.client_email,
        "client_phone": inv.client_phone,
        "client_address": inv.client_address,
        "event_name": inv.event_name,
        "event_date": inv.event_date.strftime("%d %b %Y") if inv.event_date else "",
        "items": inv.items,
        "subtotal": inv.subtotal,
        "tax_percent": inv.tax_percent,
        "tax_amount": inv.tax_amount,
        "discount_amount": inv.discount_amount,
        "total_amount": inv.total_amount,
        "status": inv.status,
        "notes": inv.notes,
        "razorpay_payment_link_url": inv.razorpay_payment_link_url,
    }
    user_data = {
        "name": current_user.name,
        "email": current_user.email,
        "studio_name": current_user.studio_name,
        "studio_address": current_user.studio_address,
        "studio_phone": current_user.studio_phone,
        "studio_gstin": current_user.studio_gstin,
        "studio_upi_id": current_user.studio_upi_id,
    }

    pdf_bytes = generate_invoice_pdf(invoice_data, user_data)

    background_tasks.add_task(
        send_invoice_email,
        inv.client_email,
        inv.client_name,
        inv.invoice_number,
        inv.total_amount,
        inv.razorpay_payment_link_url,
        current_user.studio_name or current_user.name,
        pdf_bytes,
    )

    return {"message": f"Invoice emailed to {inv.client_email}"}


@router.patch("/{invoice_id}/mark-paid", response_model=InvoiceResponse)
def mark_invoice_paid(
    invoice_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inv = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.owner_id == current_user.id,
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    inv.status = "paid"
    inv.paid_at = datetime.now()
    db.commit()
    db.refresh(inv)

    # Send confirmation email
    if inv.client_email:
        background_tasks.add_task(
            send_payment_confirmation_email,
            inv.client_email,
            inv.client_name,
            inv.invoice_number,
            inv.total_amount,
            current_user.studio_name or current_user.name,
        )

    return build_invoice_response(inv)


@router.patch("/{invoice_id}/cancel", response_model=InvoiceResponse)
def cancel_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inv = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.owner_id == current_user.id,
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    inv.status = "cancelled"
    db.commit()
    db.refresh(inv)
    return build_invoice_response(inv)


@router.delete("/{invoice_id}", status_code=204)
def delete_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inv = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.owner_id == current_user.id,
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    db.delete(inv)
    db.commit()


# Razorpay webhook
@router.post("/webhook/razorpay")
async def razorpay_webhook(
    request_data: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    try:
        event = request_data.get("event")
        if event == "payment_link.paid":
            payload = request_data.get("payload", {})
            payment_link = payload.get("payment_link", {}).get("entity", {})
            rzp_link_id = payment_link.get("id")

            inv = db.query(Invoice).filter(
                Invoice.razorpay_payment_link_id == rzp_link_id
            ).first()

            if inv and inv.status != "paid":
                inv.status = "paid"
                inv.paid_at = datetime.now()
                inv.razorpay_payment_id = (
                    payload.get("payment", {}).get("entity", {}).get("id")
                )
                db.commit()

                if inv.client_email:
                    photographer = inv.owner
                    background_tasks.add_task(
                        send_payment_confirmation_email,
                        inv.client_email,
                        inv.client_name,
                        inv.invoice_number,
                        inv.total_amount,
                        photographer.studio_name or photographer.name,
                    )
        return {"status": "ok"}
    except Exception as e:
        print(f"Webhook error: {e}")
        return {"status": "error"}