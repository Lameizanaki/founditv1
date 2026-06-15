from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np


def imwrite_bgr(path: Path, bgr: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    ok = cv2.imwrite(str(path), bgr)
    if not ok:
        raise RuntimeError(f"Failed to write image: {path}")
