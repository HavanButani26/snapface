FROM python:3.11-slim

WORKDIR /app

# System dependencies for OpenCV + InsightFace + C++ compiler
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgl1 \
    libglx-mesa0 \
    wget \
    build-essential \
    g++ \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install numpy first — insightface build depends on it
RUN pip install --no-cache-dir numpy==1.26.4

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Pre-download buffalo_l model so it's baked into the image
RUN python -c "from insightface.app import FaceAnalysis; app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider']); app.prepare(ctx_id=-1, det_size=(640,640))"

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]