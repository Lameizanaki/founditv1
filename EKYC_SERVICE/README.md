# eKYC Service

## Run

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Optional (EasyOCR)
# pip install -r requirements-ocr.txt

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### GPU mode

```powershell
$env:EKYC_USE_GPU="auto"
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

`EKYC_USE_GPU=auto` uses CUDA for EasyOCR when a CUDA-enabled PyTorch install is available, otherwise it falls back to CPU. The `opencv-contrib-python` wheel used by this service is CPU-only for YuNet/SFace; OpenCV GPU acceleration needs a custom CUDA-enabled OpenCV build.

## API

- `POST /kyc/verify`
  - form-data: `id_card_image` (file), `live_face_image` (file)
  - returns JSON according to the schema in your spec

## Docker

This repo includes Docker support for the **Python FastAPI service only** (your Spring Boot project is external).

### Build + run (Docker)

```powershell
docker build -t ekyc-python .
docker run --rm -p 8000:8000 ^
  -v ${PWD}/models:/app/models ^
  -v ${PWD}/artifacts:/app/artifacts ^
  ekyc-python
```

Optional (EasyOCR) build:

```powershell
docker build --build-arg WITH_EASYOCR=1 -t ekyc-python .
```

### Run (docker compose)

```powershell
docker compose up --build
```

If you ever see `exec /usr/local/bin/uvicorn: exec format error`, your Docker build cache layer may be corrupted. Rebuild once without cache:

```powershell
docker compose build --no-cache
docker compose up
```

### What URL should Spring Boot call?

- If Spring Boot runs on your host machine: call `http://localhost:8000/kyc/verify`
- If Spring Boot runs in Docker on the same compose network: call `http://ekyc-python:8000/kyc/verify`

## Spring Boot (API Gateway + DB)

This repo includes a Spring Boot module at `spring-api/` that:

- Receives uploads from frontend
- Calls the Python endpoint (`POST /kyc/verify`) as `multipart/form-data`
- Saves the final result to a database (PostgreSQL/MySQL via JPA)
- Returns the structured JSON back to the frontend

### 1) Start Python service

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Python route:

- `POST http://localhost:8000/kyc/verify`
- form-data files: `id_card_image`, `live_face_image`

## Notes

- Face detection/recognition auto-downloads OpenCV Zoo ONNX models into `./models/` on first run.
- OCR uses `easyocr` if installed (see `requirements-ocr.txt`); otherwise uses `pytesseract`.
- If using `pytesseract`, you still need the Tesseract OCR binary installed and on PATH.
