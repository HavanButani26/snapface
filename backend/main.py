from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.database import engine, Base
from app.routers import auth, events, photos, guest, capsule, reel, invoice, subscription, analytics, reactions, duplicates, attendance
import app.models
import os

load_dotenv()

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SnapFace API", version="1.0.0")

FRONTEND_URL = os.getenv("FRONTEND_URL", "").rstrip("/")
ALLOWED_ORIGINS = [o for o in ["http://localhost:3000", FRONTEND_URL] if o]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(events.router)
app.include_router(photos.router)
app.include_router(guest.router)
app.include_router(capsule.router)
app.include_router(reel.router)
app.include_router(invoice.router)
app.include_router(subscription.router)
app.include_router(analytics.router)
app.include_router(reactions.router)
app.include_router(duplicates.router)
app.include_router(attendance.router)

@app.get("/")
def root():
    return {"status": "SnapFace API running"}