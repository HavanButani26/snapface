import cloudinary
import cloudinary.uploader
import os
from dotenv import load_dotenv

load_dotenv()

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True,
)

def upload_photo(file_bytes: bytes, folder: str, public_id: str = None) -> dict:
    result = cloudinary.uploader.upload(
        file_bytes,
        folder=folder,
        public_id=public_id,
        resource_type="image",
        transformation=[{"quality": "auto", "fetch_format": "auto"}],
    )
    return {
        "public_id": result["public_id"],
        "url": result["secure_url"],
        "thumbnail_url": cloudinary.utils.cloudinary_url(
            result["public_id"],
            width=400,
            height=400,
            crop="fill",
            quality="auto",
            fetch_format="auto",
        )[0],
    }

def delete_photo(public_id: str):
    cloudinary.uploader.destroy(public_id)