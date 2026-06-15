from __future__ import annotations
import traceback
import uuid
from typing import Any

import cv2
import numpy as np
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from service.kyc_service import KycService

router = APIRouter(prefix="", tags=["ekyc"])
kyc_router = router
_service = KycService()


def _decode_image_or_none(image_bytes: bytes) -> np.ndarray | None:
    """Decode image bytes to a numpy array or return None if invalid."""
    data = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(data, cv2.IMREAD_COLOR)
    return img

@router.post("/kyc/verify/ocr")
async def verify_ocr(
    id_card_image: UploadFile = File(...),
    expected_full_name: str | None = Form(default=None),
    expected_date_of_birth: str | None = Form(default=None),
    expected_gender: str | None = Form(default=None),
    expected_nationality: str | None = Form(default=None),
    expected_document_id: str | None = Form(default=None),
) -> dict[str, Any]:
    """Extract OCR fields from the provided ID card image."""
    request_id = str(uuid.uuid4())
    try:
        id_bytes = await id_card_image.read()
        
        id_img = _decode_image_or_none(id_bytes)
        
        if id_img is None:
            raise HTTPException(status_code=400, detail="Invalid ID card image")
        
        result = _service.verify_ocr(
            id_img=id_img,
            expected_full_name=expected_full_name,
            expected_date_of_birth=expected_date_of_birth,
            expected_gender=expected_gender,
            expected_nationality=expected_nationality,
            expected_document_id=expected_document_id,
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"verify_ocr failed: {e}")

@router.post("/kyc/verify/liveness")
async def verify_liveness(
    id_card_image: UploadFile = File(...),
    live_face_image: UploadFile = File(...),
) -> dict[str, Any]:
    """Perform liveness and face match with provided ID card and live face images."""
    request_id = str(uuid.uuid4())
    try:
        id_bytes = await id_card_image.read()
        live_bytes = await live_face_image.read()

        id_img = _decode_image_or_none(id_bytes)
        live_img = _decode_image_or_none(live_bytes)

        if id_img is None:
            raise HTTPException(status_code=400, detail="Invalid ID card image")
        if live_img is None:
            raise HTTPException(status_code=400, detail="Invalid live face image")

        result = _service.verify_liveness(
            id_img=id_img,
            live_img=live_img,
            request_id=request_id,
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"verify_liveness failed: {e}")
