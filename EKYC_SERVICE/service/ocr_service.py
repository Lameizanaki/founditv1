from __future__ import annotations

import datetime
import os
import re
import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Any

import cv2
import numpy as np


DEBUG_OCR = os.getenv("DEBUG_OCR", "0") == "1"
EKYC_USE_GPU = os.getenv("EKYC_USE_GPU", "auto").strip().lower()
if DEBUG_OCR:
    os.makedirs("artifacts", exist_ok=True)


KHMER_NUM = {
    "០": "0", "១": "1", "២": "2", "៣": "3", "៤": "4",
    "៥": "5", "៦": "6", "៧": "7", "៨": "8", "៩": "9",
}

OCR_DIGIT_FIX = str.maketrans({
    "O": "0", "o": "0",
    "I": "1", "l": "1",
    "Z": "2",
    "S": "5", "s": "5",
    "B": "8",
    "g": "9",
})

MALE_HINTS = ("ប្រុស", "MALE", " M ", "MDEU", "MOGU", "MUQU", "BRUS", "BRU5", "BUUS")
FEMALE_HINTS = ("ស្រី", "FEMALE", " F ", "JURU", "IUJU", "SRI", "SR1", "5RI")

ISSUE_EXPIRY_RE = re.compile(
    r"(issue|issued|expiry|expire|expires|expiration|valid|validity|until|since|"
    r"date\s*of\s*issue|date\s*of\s*expiry|"
    r"ចេញ|ថ្ងៃចេញ|ផុត|ផុតកំណត់|សុពលភាព)",
    re.IGNORECASE,
)

NAME_LABELS = [
    re.compile(r"គោត្តនាម(?:និង)?នាម\s*[:\-]?\s*([\u1780-\u17FFA-Za-z'\- ]{2,})", re.I),
    re.compile(r"\bNAME\s*[:\-]?\s*([A-Za-z'\- ]{2,})", re.I),
    re.compile(r"\bFULL\s+NAME\s*[:\-]?\s*([A-Za-z'\- ]{2,})", re.I),
]

NATIONALITY_RE = [
    re.compile(r"សញ្ជាតិ\s*[:\-]?\s*([\u1780-\u17FFA-Za-z ]+)", re.I),
    re.compile(r"\bNATIONALITY\s*[:\-]?\s*([A-Za-z ]+)", re.I),
]


def from_khmer_numerals(text: str) -> str:
    return "".join(KHMER_NUM.get(ch, ch) for ch in text or "")


def normalize_text(text: str) -> str:
    text = text or ""
    text = text.replace("\r", "\n")
    text = re.sub(r"[\t\f\v]", " ", text)
    text = re.sub(r"[ ]{2,}", " ", text)
    text = re.sub(r"\n{2,}", "\n", text)
    return text.strip()


def to_gray(img: np.ndarray) -> np.ndarray:
    if img is None:
        raise ValueError("Input image is None")
    if len(img.shape) == 2:
        return img
    return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)


def to_rgb(img: np.ndarray) -> np.ndarray:
    if len(img.shape) == 2:
        return cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)
    return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)


def crop_pct(img: np.ndarray, y1: float, y2: float, x1: float, x2: float) -> np.ndarray:
    h, w = img.shape[:2]
    return img[int(y1 * h):int(y2 * h), int(x1 * w):int(x2 * w)]


def debug_write(path: str, img: np.ndarray) -> None:
    return None


def upscale(img: np.ndarray, scale: int = 4) -> np.ndarray:
    h, w = img.shape[:2]
    return cv2.resize(img, (w * scale, h * scale), interpolation=cv2.INTER_CUBIC)


def preprocess_text_region(img: np.ndarray) -> np.ndarray:
    gray = to_gray(img)
    gray = cv2.convertScaleAbs(gray, alpha=2.6, beta=35)
    blur = cv2.GaussianBlur(gray, (3, 3), 0)
    return cv2.adaptiveThreshold(
        blur,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31,
        8,
    )


def order_points(pts: np.ndarray) -> np.ndarray:
    pts = np.asarray(pts, dtype=np.float32)
    s = pts.sum(axis=1)
    d = np.diff(pts, axis=1)

    return np.array([
        pts[np.argmin(s)],
        pts[np.argmin(d)],
        pts[np.argmax(s)],
        pts[np.argmax(d)],
    ], dtype=np.float32)


def _warp_card(image: np.ndarray, rect: np.ndarray) -> np.ndarray:
    src = order_points(rect)
    dst = np.array([[0, 0], [1599, 0], [1599, 999], [0, 999]], dtype=np.float32)

    matrix = cv2.getPerspectiveTransform(src, dst)
    warped = cv2.warpPerspective(
        image,
        matrix,
        (1600, 1000),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE,
    )

    return warped


EASYOCR_READER = None
_EASYOCR_LOCK = None


def _get_easyocr_lock():
    global _EASYOCR_LOCK
    if _EASYOCR_LOCK is None:
        import threading
        _EASYOCR_LOCK = threading.Lock()
    return _EASYOCR_LOCK


def get_easyocr_reader():
    global EASYOCR_READER
    import threading
    thread_name = threading.current_thread().name

    # Quick check without lock (optimization)
    if EASYOCR_READER is not None:
        return EASYOCR_READER

    # Acquire lock for initialization
    lock = _get_easyocr_lock()
    with lock:
        # Double-check after acquiring lock
        if EASYOCR_READER is not None:
            return EASYOCR_READER

        try:
            import easyocr
            use_gpu = should_use_easyocr_gpu()
            EASYOCR_READER = easyocr.Reader(["en"], gpu=use_gpu)
        except Exception as e:
            EASYOCR_READER = None

    return EASYOCR_READER


def should_use_easyocr_gpu() -> bool:
    if EKYC_USE_GPU in {"0", "false", "no", "off", "cpu"}:
        return False

    try:
        import torch
        cuda_available = bool(torch.cuda.is_available())
    except Exception:
        cuda_available = False

    if EKYC_USE_GPU in {"1", "true", "yes", "on", "gpu", "cuda"}:
        return cuda_available

    return cuda_available


def read_easyocr(img: np.ndarray) -> str:
    reader = get_easyocr_reader()
    if reader is None:
        return ""

    try:
        result = reader.readtext(to_rgb(img), detail=0, paragraph=False)
        return "\n".join(str(x).strip() for x in result if str(x).strip())
    except Exception as e:
        return ""


def read_tesseract(img: np.ndarray, psm: int = 6) -> str:
    try:
        import pytesseract
    except Exception:
        return ""

    try:
        cmd = os.getenv("TESSERACT_CMD")
        if cmd:
            pytesseract.pytesseract.tesseract_cmd = cmd

        return pytesseract.image_to_string(to_gray(img), config=f"--oem 3 --psm {psm}")
    except Exception:
        return ""


def ocr_text(img: np.ndarray, small: bool = False, psm: int = 6) -> str:
    scale = 6 if small else 4
    up = upscale(img, scale)
    pre = preprocess_text_region(up)

    texts = []

    for variant in (up, pre):
        t = read_easyocr(variant)
        if not t.strip():
            t = read_tesseract(variant, psm=psm)
        if t.strip():
            texts.append(t)

    seen = set()
    clean = []

    for t in texts:
        t = normalize_text(t)
        if t and t not in seen:
            seen.add(t)
            clean.append(t)

    result = "\n".join(clean)
    return result


def ocr_region(region: np.ndarray, psm: int = 7) -> str:
    raw = ocr_text(region, small=True, psm=psm)
    pre = ocr_text(preprocess_text_region(region), small=True, psm=psm)
    return normalize_text("\n".join(x for x in [raw, pre] if x))


def extract_regions(card: np.ndarray) -> dict[str, Any]:
    regions = {
        "id": crop_pct(card, 0.02, 0.22, 0.50, 0.99),
        "name": crop_pct(card, 0.14, 0.40, 0.08, 0.99),

        # Wide DOB areas
        "dob": [
            crop_pct(card, 0.40, 0.66, 0.10, 0.78),
            crop_pct(card, 0.43, 0.61, 0.12, 0.72),
            crop_pct(card, 0.45, 0.58, 0.18, 0.68),
        ],

        # Wide gender areas
        "gender": [
            crop_pct(card, 0.40, 0.66, 0.55, 0.92),
            crop_pct(card, 0.43, 0.61, 0.58, 0.88),
            crop_pct(card, 0.45, 0.58, 0.62, 0.86),
        ],
    }

    if DEBUG_OCR:
        for key, value in regions.items():
            if isinstance(value, list):
                for i, img in enumerate(value):
                    debug_write(f"artifacts/{key}_{i}.jpg", img)
            else:
                debug_write(f"artifacts/{key}.jpg", value)

    return regions


def clean_digits(text: str) -> str:
    text = from_khmer_numerals(text)
    return text.translate(OCR_DIGIT_FIX)


def normalize_date(value: str) -> str | None:
    if not value:
        return None

    value = clean_digits(value)
    value = re.sub(r"[,./\\|:;\n\t]+", "-", value)
    value = re.sub(r"\s+", "-", value.strip())

    formats = [
        "%Y-%m-%d",
        "%d-%m-%Y",
        "%Y-%d-%m",
        "%d-%m-%y",
        "%y-%m-%d",
    ]

    for fmt in formats:
        try:
            dt = datetime.datetime.strptime(value, fmt).date()
            if 1900 <= dt.year <= datetime.date.today().year - 15:
                return dt.strftime("%Y-%m-%d")
        except Exception:
            pass

    return None


def valid_birth_date(year: int, month: int, day: int) -> str | None:
    try:
        dt = datetime.date(year, month, day)
        if 1900 <= dt.year <= datetime.date.today().year - 15:
            return dt.strftime("%Y-%m-%d")
    except Exception:
        pass
    return None


def clean_dob_text(text: str) -> str:
    text = clean_digits(text or "")

    text = (
        text.replace("booa", "2005")
            .replace("bood", "2005")
            .replace("b00d", "2005")
            .replace("b0od", "2005")
            .replace("bo05", "2005")
            .replace("b005", "2005")
            .replace("200S", "2005")
            .replace("2O", "20")
    )

    text = re.sub(r"[,./\\|:;\n\t]+", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def score_dob(date_value: str) -> int:
    year = int(date_value[:4])
    month = int(date_value[5:7])
    day = int(date_value[8:10])

    score = 0

    if 1990 <= year <= 2010:
        score += 100
    elif 1970 <= year <= 1989:
        score += 40
    else:
        score += 5

    if day > 12:
        score += 20

    if month <= 12 and day <= 12:
        score -= 10

    return score


def extract_dates(text: str, allow_issue_lines: bool = False) -> list[str]:
    text = clean_dob_text(text)
    results = []

    for line in text.splitlines() if "\n" in text else [text]:
        if not allow_issue_lines and ISSUE_EXPIRY_RE.search(line):
            continue

        nums = re.findall(r"\d{1,4}", line)

        for i in range(len(nums) - 2):
            a, b, c = nums[i:i + 3]

            candidates = []

            if len(a) == 4:
                candidates.append((int(a), int(b), int(c)))

            if len(c) == 4:
                candidates.append((int(c), int(b), int(a)))

            for y, m, d in candidates:
                value = valid_birth_date(y, m, d)
                if value:
                    results.append(value)

        for i in range(len(nums) - 3):
            a, b, c, d = nums[i:i + 4]

            candidates = []

            # 20 05 07 20 => 2005-07-20
            if a in {"19", "20"} and len(b) == 2:
                candidates.append((int(a + b), int(c), int(d)))

            # 20 07 20 05 => 2005-07-20
            if c in {"19", "20"} and len(d) == 2:
                candidates.append((int(c + d), int(b), int(a)))

            for y, m, day in candidates:
                value = valid_birth_date(y, m, day)
                if value:
                    results.append(value)

    return list(dict.fromkeys(results))


def extract_dob(dob_text: str, full_text: str | None = None) -> str | None:
    if full_text is None:
        full_text = dob_text

    # 1. Prefer DOB crop.
    candidates = extract_dates(dob_text, allow_issue_lines=True)

    # 2. If crop failed, scan full card but skip issue/expiry lines.
    if not candidates:
        candidates = extract_dates(full_text, allow_issue_lines=False)

    # 3. Last fallback: full card scan, still valid dates only.
    if not candidates:
        candidates = extract_dates(full_text, allow_issue_lines=True)

    if not candidates:
        return None

    candidates.sort(key=lambda x: (-score_dob(x), x))
    return candidates[0]


def extract_gender(text: str) -> str | None:
    if not text:
        return None

    raw = text
    t = " " + clean_digits(text).upper() + " "
    t = re.sub(r"\s+", " ", t)

    if "ប្រុស" in raw:
        return "MALE"

    if "ស្រី" in raw:
        return "FEMALE"

    if any(x in t for x in FEMALE_HINTS):
        return "FEMALE"

    if any(x in t for x in MALE_HINTS):
        return "MALE"

    if re.search(r"\bF\b", t):
        return "FEMALE"

    if re.search(r"\bM\b", t):
        return "MALE"

    return None


def extract_document_id(text: str) -> str | None:
    text = clean_digits(text)
    match = re.search(r"\b\d{9}\b", text)
    if match:
        return match.group(0)

    digits = re.sub(r"\D", "", text)
    return digits if len(digits) == 9 else None


def extract_name(text: str) -> str | None:
    if not text:
        return None

    upper_name = re.compile(r"\b[A-Z]{3,}(?:\s+[A-Z]{3,}){1,3}\b")

    found = []
    for seq in upper_name.findall(text):
        words = [
            w for w in seq.split()
            if w not in {"KINGDOM", "CAMBODIA", "CARD", "IDENTITY"}
        ]
        if len(words) >= 2:
            found.append(" ".join(words))

    if found:
        found.sort(key=lambda x: (-len(x.replace(" ", "")), x))
        return found[0].title().replace(" ", "")

    for pattern in NAME_LABELS:
        match = pattern.search(text)
        if match:
            name = re.sub(r"\s+", " ", match.group(1)).strip(" -:")
            if len(name.replace(" ", "")) >= 6:
                return name.title().replace(" ", "")

    return None


def extract_nationality(text: str) -> str:
    for pattern in NATIONALITY_RE:
        match = pattern.search(text or "")
        if match:
            value = match.group(1).strip()
            if value:
                return value
    return "Khmer"


def postprocess(fields: dict[str, Any]) -> dict[str, Any]:
    fields["full_name"] = fields.get("full_name") or "UNKNOWN"
    fields["date_of_birth"] = fields.get("date_of_birth") or "UNKNOWN"
    fields["gender"] = fields.get("gender") or "UNKNOWN"
    fields["nationality"] = fields.get("nationality") or "Khmer"
    fields["document_id"] = fields.get("document_id") or "UNKNOWN"
    return fields


def extract_ocr_fields(card_bgr: np.ndarray) -> dict[str, Any]:
    print("[extract_ocr_fields] START")
    regions = extract_regions(card_bgr)
    print("[extract_ocr_fields] Regions extracted")

    job_specs: dict[str, tuple[np.ndarray, bool, int]] = {
        "full_text": (card_bgr, False, 6),
        "id_text": (regions["id"], True, 7),
        "name_text": (regions["name"], True, 6),
    }

    for index, region in enumerate(regions["dob"]):
        job_specs[f"dob_text_{index}"] = (region, True, 7)

    for index, region in enumerate(regions["gender"]):
        job_specs[f"gender_text_{index}"] = (region, True, 7)

    print(f"[extract_ocr_fields] Created {len(job_specs)} OCR jobs")

    def run_ocr_job(name: str, img: np.ndarray, is_small_text: bool, psm: int) -> str:
        print(f"[run_ocr_job] {name}: START")
        result = normalize_text(ocr_text(img, small=is_small_text, psm=psm))
        print(f"[run_ocr_job] {name}: DONE, result length={len(result)}")
        return result

    max_workers = min(8, len(job_specs))
    print(f"[extract_ocr_fields] Starting ThreadPoolExecutor with {max_workers} workers")
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            name: executor.submit(run_ocr_job, name, img, is_small_text, psm)
            for name, (img, is_small_text, psm) in job_specs.items()
        }
        print(f"[extract_ocr_fields] Submitted {len(futures)} tasks, waiting for results...")
        ocr_results = {}
        for name, future in futures.items():
            print(f"[extract_ocr_fields] Waiting for {name}...")
            try:
                ocr_results[name] = future.result(timeout=120)
                print(f"[extract_ocr_fields] Got result for {name}")
            except Exception as e:
                print(f"[extract_ocr_fields] ERROR waiting for {name}: {e}")
                raise
        print(f"[extract_ocr_fields] All OCR results collected")

    full_text = ocr_results["full_text"]
    id_text = ocr_results["id_text"]
    name_text = ocr_results["name_text"]

    dob_text = normalize_text("\n".join(
        ocr_results[f"dob_text_{index}"]
        for index in range(len(regions["dob"]))
        if ocr_results[f"dob_text_{index}"]
    ))

    gender_text = normalize_text("\n".join(
        ocr_results[f"gender_text_{index}"]
        for index in range(len(regions["gender"]))
        if ocr_results[f"gender_text_{index}"]
    ))

    date_of_birth = extract_dob(dob_text, full_text)

    gender = (
        extract_gender(gender_text)
        or extract_gender(full_text)
    )

    full_name = (
        extract_name(name_text)
        or extract_name(full_text)
    )

    document_id = (
        extract_document_id(id_text)
        or extract_document_id(full_text)
    )

    nationality = extract_nationality(full_text)

    if DEBUG_OCR:
        print("=" * 60)
        print("FULL OCR:", repr(full_text))
        print("DOB OCR:", repr(dob_text))
        print("GENDER OCR:", repr(gender_text))
        print("DOB:", repr(date_of_birth))
        print("GENDER:", repr(gender))
        print("NAME:", repr(full_name))
        print("DOC ID:", repr(document_id))
        print("=" * 60)

    print("[extract_ocr_fields] Calling postprocess...")
    result = postprocess({
        "full_name": full_name,
        "date_of_birth": date_of_birth,
        "gender": gender,
        "nationality": nationality,
        "document_id": document_id,
    })
    print("[extract_ocr_fields] DONE")
    return result


def _normalize_text(text: str) -> str:
    return normalize_text(text)


def _ocr_text_fast(img: np.ndarray, is_small_text: bool = False, psm: int = 6) -> str:
    return ocr_text(img, small=is_small_text, psm=psm)


def _extract_dob(text: str) -> str | None:
    return extract_dob(text)


def _extract_gender(text: str) -> str | None:
    return extract_gender(text)
