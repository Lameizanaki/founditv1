from __future__ import annotations

from pathlib import Path
import os

import cv2
import numpy as np

from service.opencv_models import SFACE, YUNET, ensure_model


if os.getenv("EKYC_USE_GPU", "auto").strip().lower() not in {"0", "false", "no", "off", "cpu"}:
    try:
        cv2.ocl.setUseOpenCL(True)
    except Exception:
        pass


def _ensure_face_models() -> tuple[Path, Path]:
    base = Path(".").resolve()
    yunet_path = ensure_model(YUNET, base_dir=base)
    sface_path = ensure_model(SFACE, base_dir=base)
    return yunet_path, sface_path


def _detect_faces_yunet(bgr: np.ndarray) -> np.ndarray:
    yunet_path, _ = _ensure_face_models()

    h, w = bgr.shape[:2]
    det = cv2.FaceDetectorYN.create(
        str(yunet_path),
        "",
        (w, h),
        score_threshold=0.8,
        nms_threshold=0.3,
        top_k=5000,
    )
    _, faces = det.detect(bgr)
    if faces is None:
        return np.empty((0, 15), dtype=np.float32)
    return faces


def _largest_face_box(faces: np.ndarray) -> tuple[int, int, int, int] | None:
    if faces is None or len(faces) == 0:
        return None
    # faces rows: [x, y, w, h, score, ...]
    areas = faces[:, 2] * faces[:, 3]
    idx = int(np.argmax(areas))
    x, y, w, h = faces[idx, 0:4].astype(int)
    return x, y, w, h


def extract_card_portrait(card_bgr: np.ndarray) -> np.ndarray | None:
    faces = _detect_faces_yunet(card_bgr)
    box = _largest_face_box(faces)
    if box is None:
        return None
    x, y, w, h = box
    pad = int(0.15 * max(w, h))
    h_img, w_img = card_bgr.shape[:2]
    x0, y0 = max(0, x - pad), max(0, y - pad)
    x1, y1 = min(w_img, x + w + pad), min(h_img, y + h + pad)
    # Clamp to ensure crop is within image bounds
    x0 = max(0, min(x0, w_img - 1))
    x1 = max(0, min(x1, w_img))
    y0 = max(0, min(y0, h_img - 1))
    y1 = max(0, min(y1, h_img))
    if x1 <= x0 or y1 <= y0:
        return None
    crop = card_bgr[y0:y1, x0:x1].copy()
    return crop


def detect_live_face(live_bgr: np.ndarray) -> np.ndarray | None:
    faces = _detect_faces_yunet(live_bgr)
    box = _largest_face_box(faces)
    if box is None:
        return None
    x, y, w, h = box
    pad = int(0.15 * max(w, h))
    x0, y0 = max(0, x - pad), max(0, y - pad)
    x1, y1 = min(live_bgr.shape[1], x + w + pad), min(live_bgr.shape[0], y + h + pad)
    if x1 <= x0 or y1 <= y0:
        return None
    crop = live_bgr[y0:y1, x0:x1].copy()
    return crop


def liveness_check(face_bgr: np.ndarray) -> tuple[bool, float]:
    """Heuristic liveness check for a single frame.

    Returns (passed, confidence in [0,1]).
    """
    if face_bgr is None or face_bgr.size == 0:
        return False, 0.0

    h, w = face_bgr.shape[:2]
    if h < 80 or w < 80:
        return False, 0.05

    gray = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2GRAY)
    sharp = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    # crude confidence mapping
    sharp_score = np.clip((sharp - 30.0) / 120.0, 0.0, 1.0)

    # check for extreme blur or extremely flat intensity (common with replays)
    std = float(np.std(gray))
    contrast_score = np.clip((std - 20.0) / 40.0, 0.0, 1.0)

    confidence = float(0.55 * sharp_score + 0.45 * contrast_score)
    passed = confidence >= 0.8
    return passed, confidence


def compare_faces(card_face: np.ndarray, live_face: np.ndarray) -> float:
    """Cosine similarity using OpenCV SFace embeddings."""
    _, sface_path = _ensure_face_models()

    card_aligned = _prepare_face_for_sface(card_face)
    live_aligned = _prepare_face_for_sface(live_face)

    rec = cv2.FaceRecognizerSF.create(str(sface_path), "")

    feat1 = rec.feature(card_aligned)
    feat2 = rec.feature(live_aligned)

    # OpenCV returns cosine similarity; typically in [0, 1] for face embeddings.
    sim = float(rec.match(feat1, feat2, cv2.FaceRecognizerSF_FR_COSINE))
    # Clamp similarity to [0, 1]
    sim = max(0.0, min(1.0, sim))
    return sim


def _prepare_face_for_sface(face_bgr: np.ndarray) -> np.ndarray:
    # SFace expects BGR, but size is flexible; keep a standard square.
    if face_bgr is None or face_bgr.size == 0:
        raise ValueError("empty face")
    img = face_bgr
    if img.shape[0] != img.shape[1]:
        s = min(img.shape[0], img.shape[1])
        y0 = (img.shape[0] - s) // 2
        x0 = (img.shape[1] - s) // 2
        img = img[y0 : y0 + s, x0 : x0 + s]
    img = cv2.resize(img, (112, 112), interpolation=cv2.INTER_AREA)
    return img
