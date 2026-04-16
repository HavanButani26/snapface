from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.database import engine, Base
from app.routers import auth, events
import app.models

load_dotenv()

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SnapFace API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(events.router)

@app.get("/")
def root():
    return {"status": "SnapFace API running"}