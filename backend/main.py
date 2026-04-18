from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.database import engine, Base
from app.routers import auth, events, photos, guest, capsule, reel
import app.models
import os

load_dotenv()

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SnapFace API", version="1.0.0")

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    os.getenv("FRONTEND_URL", ""),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in ALLOWED_ORIGINS if o],
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

@app.get("/")
def root():
    return {"status": "SnapFace API running"}