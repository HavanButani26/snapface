from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.database import engine, Base
import app.models  # ensures all models are registered

load_dotenv()

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="SnapFace API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # update with Railway URL later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "SnapFace API running"}