from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import requests


@dataclass(frozen=True)
class OpenCvZooModel:
    name: str
    url: str
    relative_path: str


YUNET = OpenCvZooModel(
    name="YuNet",
    url="https://raw.githubusercontent.com/opencv/opencv_zoo/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx",
    relative_path="models/face_detection_yunet_2023mar.onnx",
)

SFACE = OpenCvZooModel(
    name="SFace",
    url="https://raw.githubusercontent.com/opencv/opencv_zoo/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx",
    relative_path="models/face_recognition_sface_2021dec.onnx",
)


def ensure_model(model: OpenCvZooModel, base_dir: Path) -> Path:
    dst = base_dir / model.relative_path
    dst.parent.mkdir(parents=True, exist_ok=True)
    if dst.exists() and dst.stat().st_size > 1024:
        return dst

    r = requests.get(model.url, timeout=60)
    r.raise_for_status()
    dst.write_bytes(r.content)
    return dst
