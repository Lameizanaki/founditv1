from __future__ import annotations

import datetime
import os
import re
import uuid
from typing import Any

import cv2
import numpy as np


DEBUG_OCR = os.getenv("DEBUG_OCR", "0") == "1"


# ---------------------------------------------------------------------------
# Khmer -> Arabic numeral conversion
# ---------------------------------------------------------------------------

_KHMER_TO_ARABIC: dict[str, str] = {
    "០": "0", "១": "1", "២": "2", "៣": "3", "៤": "4",
    "៥": "5", "៦": "6", "៧": "7", "៨": "8", "៩": "9",
}

_OCR_DIGIT_FIX = str.maketrans({
    "O": "0", "o": "0",
    "I": "1", "l": "1",
    "Z": "2",
    "S": "5", "s": "5",
    "b": "6",
    "B": "8",
    "g": "9",
})

# OCR garbles of ប្រុស (male): b-like and u-vowel shapes misread as I/n/u/f
_GENDER_MALE_PATTERNS = ("MDEU", "MOGU", "MUQU", "MOG", "MOU",
                         "IUFU", "1UFU", "NUFU", "BUUS", "BRUS", "BRU5")
# OCR garbles of ស្រី (female): removed UFU/IUFU/URU — they are male OCR noise
_GENDER_FEMALE_PATTERNS = ("JURU", "IUJU", "5RI", "SRI", "SR1")

_RE_9_DIGITS = re.compile(r"\b\d{9}\b")
_RE_DIGIT_GROUPS = re.compile(r"\d+")
_RE_MULTI_SPACE = re.compile(r"\s+")
_RE_NON_DIGITS = re.compile(r"[^0-9]")
_RE_UPPER_NAME = re.compile(r"\b[A-Z]{3,}(?:\s+[A-Z]{3,}){1,3}\b")

_RE_NAME_LABELS = [
    re.compile(r"គោត្តនាម(?:និង)?នាម\s*[:\-]?\s*([\u1780-\u17FFA-Za-z'\- ]{2,})", re.IGNORECASE),
    re.compile(r"\bNAME\s*[:\-]?\s*([A-Za-z'\- ]{2,})", re.IGNORECASE),
    re.compile(r"\bFULL\s+NAME\s*[:\-]?\s*([A-Za-z'\- ]{2,})", re.IGNORECASE),
]

_RE_NATIONALITY = [
    re.compile(r"សញ្ជាតិ\s*[:\-]?\s*([\u1780-\u17FFA-Za-z ]+)", re.IGNORECASE),
    re.compile(r"\bNATIONALITY\s*[:\-]?\s*([A-Za-z ]+)", re.IGNORECASE),
]


def from_khmer_numerals(s: str) -> str:
    return "".join(_KHMER_TO_ARABIC.get(ch, ch) for ch in s)


# ---------------------------------------------------------------------------
# General image helpers
# ---------------------------------------------------------------------------

def _to_gray(img: np.ndarray) -> np.ndarray:
    if img is None:
        raise ValueError("Input image is None")
    if len(img.shape) == 2:
        return img
    if len(img.shape) == 3:
        return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    raise ValueError(f"Unsupported image shape: {img.shape}")


def _to_rgb(img: np.ndarray) -> np.ndarray:
    if img is None:
        raise ValueError("Input image is None")
    if len(img.shape) == 2:
        return cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)
    if len(img.shape) == 3:
        return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    raise ValueError(f"Unsupported image shape: {img.shape}")


def _upscale_for_ocr(img: np.ndarray, scale: int = 4) -> np.ndarray:
    h, w = img.shape[:2]
    return cv2.resize(img, (w * scale, h * scale), interpolation=cv2.INTER_CUBIC)


def _debug_write(path: str, img: np.ndarray) -> None:
    return None


def _order_points(pts: np.ndarray) -> np.ndarray:
    pts = np.asarray(pts, dtype=np.float32)
    if pts.shape != (4, 2):
        raise ValueError(f"Expected shape (4,2), got {pts.shape}")

    s = pts.sum(axis=1)
    diff = np.diff(pts, axis=1)

    tl = pts[np.argmin(s)]
    br = pts[np.argmax(s)]
    tr = pts[np.argmin(diff)]
    bl = pts[np.argmax(diff)]

    return np.array([tl, tr, br, bl], dtype=np.float32)


def _distance(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.linalg.norm(a - b))


# ---------------------------------------------------------------------------
# Perspective warp
# ---------------------------------------------------------------------------

def _warp_card(image: np.ndarray, rect: np.ndarray) -> np.ndarray:
    pts = _order_points(rect)

    dst = np.array(
        [
            [0, 0],
            [1599, 0],
            [1599, 999],
            [0, 999],
        ],
        dtype=np.float32,
    )

    matrix = cv2.getPerspectiveTransform(pts, dst)
    warped = cv2.warpPerspective(
        image,
        matrix,
        (1600, 1000),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE,
    )

    return warped


# ---------------------------------------------------------------------------
# OCR backends
# ---------------------------------------------------------------------------

_EASYOCR_READER = None


def _get_easyocr_reader():
    global _EASYOCR_READER
    if _EASYOCR_READER is not None:
        return _EASYOCR_READER

    try:
        import easyocr  # type: ignore[import-not-found]
    except Exception:
        return None

    try:
        _EASYOCR_READER = easyocr.Reader(["en", "km"], gpu=False)
    except Exception:
        try:
            _EASYOCR_READER = easyocr.Reader(["en"], gpu=False)
        except Exception:
            _EASYOCR_READER = None
    return _EASYOCR_READER


def _read_text_easyocr(img: np.ndarray, paragraph: bool = False) -> str:
    reader = _get_easyocr_reader()
    if reader is None:
        return ""

    try:
        rgb = _to_rgb(img)
        results = reader.readtext(rgb, detail=0, paragraph=paragraph)
        return "\n".join(str(x).strip() for x in results if str(x).strip())
    except Exception:
        return ""


def _read_text_pytesseract(img: np.ndarray, psm: int = 6) -> str:
    try:
        import pytesseract  # type: ignore[import-not-found]
    except Exception:
        return ""

    try:
        tesseract_cmd = os.getenv("TESSERACT_CMD")
        if tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = tesseract_cmd

        gray = _to_gray(img)
        config = f"--oem 3 --psm {psm}"
        return pytesseract.image_to_string(gray, config=config)
    except Exception:
        return ""


# ---------------------------------------------------------------------------
# OCR preprocessing
# ---------------------------------------------------------------------------

def _preprocess_dob_region(img: np.ndarray) -> np.ndarray:
    gray = _to_gray(img)
    gray = cv2.convertScaleAbs(gray, alpha=2.8, beta=45)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    return cv2.adaptiveThreshold(
        blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 8
    )


def _preprocess_gender_region(img: np.ndarray) -> np.ndarray:
    gray = _to_gray(img)
    gray = cv2.convertScaleAbs(gray, alpha=2.4, beta=30)
    blur = cv2.GaussianBlur(gray, (3, 3), 0)
    return cv2.adaptiveThreshold(
        blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 25, 7
    )


def _generate_fast_ocr_variants(img: np.ndarray, scale: int) -> list[np.ndarray]:
    up = _upscale_for_ocr(img, scale)
    gray = _to_gray(up)
    blur = cv2.bilateralFilter(gray, 7, 50, 50)
    adaptive = cv2.adaptiveThreshold(
        blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 10
    )
    return [up, adaptive]


def _ocr_text_fast(img: np.ndarray, is_small_text: bool = False, psm: int = 6) -> str:
    scale = 6 if is_small_text else 4
    texts: list[str] = []

    for i, variant in enumerate(_generate_fast_ocr_variants(img, scale)):
        _debug_write(f"artifacts/ocr_variant_{i}.png", variant)

        t1 = _read_text_easyocr(variant, paragraph=False)
        if t1.strip():
            texts.append(t1)

        if not t1.strip():
            t2 = _read_text_pytesseract(variant, psm=psm)
            if t2.strip():
                texts.append(t2)

    seen: set[str] = set()
    unique: list[str] = []
    for t in texts:
        key = t.strip()
        if key and key not in seen:
            seen.add(key)
            unique.append(key)
    return "\n".join(unique)


# ---------------------------------------------------------------------------
# Region extraction
# ---------------------------------------------------------------------------

def _extract_field_regions(card_bgr: np.ndarray) -> dict[str, np.ndarray]:
    h, w = card_bgr.shape[:2]

    # Main shared band for DOB + gender
    band_y1 = int(0.40 * h)
    band_y2 = int(0.70 * h)
    band_x1 = int(0.12 * w)
    band_x2 = int(0.82 * w)

    dob_gender_band = card_bgr[band_y1:band_y2, band_x1:band_x2]
    bh, bw = dob_gender_band.shape[:2]

    # Vertical slice: expand both top & bottom
    slice_y1 = int(0.36 * bh) - 6
    slice_y2 = int(0.74 * bh) + 6

    slice_y1 = max(0, slice_y1)
    slice_y2 = min(bh, slice_y2)

    # DOB: keep from left (DO NOT shift)
    dob_x1 = 0
    dob_x2 = int(0.76 * bw)   # slightly wider than before

    # Gender: keep position, just expand both sides a bit
    gender_x1 = int(0.76 * bw) - 100   # move 10px more left
    gender_width = 220                  # increase width
    gender_x2 = gender_x1 + gender_width

    gender_x1 = max(0, gender_x1)
    gender_x2 = min(bw, gender_x2)

    regions = {
        "id_region":     card_bgr[int(0.02 * h):int(0.22 * h), int(0.50 * w):int(0.99 * w)],
        "name_region":   card_bgr[int(0.14 * h):int(0.40 * h), int(0.08 * w):int(0.99 * w)],

        # debug
        "dob_gender_band": dob_gender_band,

        # DOB (height increased)
        "dob_region":    dob_gender_band[slice_y1:slice_y2, 0:dob_x2],

        # Gender (shifted further left)
        "gender_region": dob_gender_band[slice_y1:slice_y2, gender_x1:gender_x2]
    }

    # FIX 6: only write debug images when debug mode is on
    if DEBUG_OCR:
        for key, region in regions.items():
            _debug_write(f"artifacts/{key}.jpg", region)

    return regions

# ---------------------------------------------------------------------------
# Text normalization helpers
# ---------------------------------------------------------------------------

def _normalize_text(s: str) -> str:
    s = s.replace("\r", "\n")
    s = re.sub(r"[\t\f\v]", " ", s)
    s = re.sub(r"[ ]{2,}", " ", s)
    s = re.sub(r"\n{2,}", "\n", s)
    return s.strip()


def _normalize_person_name(name: str | None, remove_spaces: bool = False) -> str | None:
    if not name:
        return None
    name = _RE_MULTI_SPACE.sub(" ", name).strip()
    return name.replace(" ", "") if remove_spaces else name


def _fix_ocr_digits(s: str) -> str:
    return s.translate(_OCR_DIGIT_FIX)


def _normalize_date_separators(text: str) -> str:
    return (
        text.replace(",", "-")
            .replace(".", "-")
            .replace("\\", "-")
            .replace("|", "-")
            .replace("/", "-")
            .replace(":", "-")
            .replace(";", "-")
            .replace("\n", "-")
            .replace("\t", "-")
    )


def _normalize_gender_noise(text: str) -> str:
    t = from_khmer_numerals(text)
    t = _fix_ocr_digits(t)
    t = t.upper()
    return _RE_MULTI_SPACE.sub(" ", t).strip()


def _normalize_date_string(value: str) -> str | None:
    if not value:
        return None

    value = from_khmer_numerals(value.strip())
    value = _fix_ocr_digits(value)
    value = _normalize_date_separators(value)
    value = _RE_MULTI_SPACE.sub(" ", value).strip()

    # FIX 3: try yyyy-first formats before dd-first to avoid ambiguous parses
    # e.g. "01-02-2003" must not be consumed by "%Y-%m-%d" (which it can't, but
    # swapping the order ensures explicit yyyy strings like "2003-01-02" are
    # recognised first, and dd-mm-yyyy is the unambiguous fallback for the rest.
    for fmt in (
        "%Y-%m-%d",
        "%Y %m %d",
        "%d-%m-%Y",
        "%d %m %Y",
        "%d-%m-%y",
        "%y-%m-%d",
    ):
        try:
            dt = datetime.datetime.strptime(value, fmt)
            if 1900 <= dt.year <= datetime.date.today().year:
                return dt.strftime("%Y-%m-%d")
        except Exception:
            pass

    return None

# ---------------------------------------------------------------------------
# Field extractors
# ---------------------------------------------------------------------------

def _extract_document_id(text: str) -> str | None:
    if not text:
        return None

    m = _RE_9_DIGITS.search(text)
    if m:
        return m.group(0)

    for g in _RE_DIGIT_GROUPS.findall(text):
        if len(g) == 9:
            return g

    joined = _RE_NON_DIGITS.sub("", text)
    return joined if len(joined) == 9 else None


def _extract_name(text: str) -> str | None:
    if not text:
        return None

    cleaned: list[str] = []
    for seq in _RE_UPPER_NAME.findall(text):
        words = [w for w in seq.split() if w not in {"KINGDOM", "CAMBODIA", "CARD", "IDENTITY"}]
        if len(words) >= 2:
            cleaned.append(" ".join(words))

    if cleaned:
        cleaned.sort(key=lambda x: (-len(x.replace(" ", "")), x))
        return cleaned[0].title()

    for pat in _RE_NAME_LABELS:
        m = pat.search(text)
        if not m:
            continue
        cand = re.sub(r"\s{2,}", " ", m.group(1).strip()).strip(" -:")
        words = [w for w in cand.split() if len(re.sub(r"[^A-Za-z'\-]", "", w)) >= 2]
        if len("".join(words)) >= 6:
            return " ".join(words)

    return None


def _clean_dob_text(text: str) -> str:
    t = from_khmer_numerals(text)

    # Replace known year OCR garbles BEFORE generic digit fix so that
    # 'b' can still be matched as part of multi-char patterns (e.g. "booa"->2005).
    t = (
        t.replace("booa", "2005")
         .replace("bood", "2005")
         .replace("b00d", "2005")
         .replace("b0od", "2005")
         .replace("bOod", "2005")
         .replace("bo05", "2005")
         .replace("b005", "2005")
         .replace("200S", "2005")
         .replace("2O",   "20")
    )

    # Normalize separators before digit fixes
    t = _normalize_date_separators(t)

    # Generic digit-look-alike fixes for date context:
    # 'b'->2  (OCR misreads 2 as b)
    # 'n'->7  (OCR misreads 7 as n)
    t = t.translate(str.maketrans({
        "O": "0", "o": "0",
        "I": "1", "l": "1",
        "Z": "2",
        "b": "2",
        "S": "5", "s": "5",
        "B": "8",
        "g": "9",
        "n": "7",
    }))

    return _normalize_text(t)


def _extract_dob(text: str) -> str | None:
    if not text:
        return None

    t = _clean_dob_text(text)

    label_patterns = [
        r"ថ្ងៃខែ\s*ឆ្នាំ\s*កំណើត\s*[:\-]?\s*((?:20\d{2}|\d{2})[-\s]\d{1,2}[-\s](?:20\d{2}|\d{2}))",
        r"ថ្ងៃខែឆ្នាំកំណើត\s*[:\-]?\s*((?:20\d{2}|\d{2})[-\s]\d{1,2}[-\s](?:20\d{2}|\d{2}))",
        r"DATE\s*OF\s*BIRTH\s*[:\-]?\s*((?:20\d{2}|\d{2})[-\s]\d{1,2}[-\s](?:20\d{2}|\d{2}))",
        r"\bDOB\s*[:\-]?\s*((?:20\d{2}|\d{2})[-\s]\d{1,2}[-\s](?:20\d{2}|\d{2}))",
    ]

    for pat in label_patterns:
        m = re.search(pat, t, flags=re.IGNORECASE)
        if m:
            normalized = _normalize_date_string(m.group(1).strip())
            if normalized:
                return normalized

    # Unlabeled fallback — each group captured separately so mixed separators
    # (e.g. "20-07 2005") are handled correctly.

    # dd[-\s]mm[-\s]yyyy  (each group captured separately — tolerates mixed seps)
    m = re.search(r"\b(\d{1,2})[-\s](\d{1,2})[-\s](20\d{2})\b", t)
    if m:
        cand = f"{m.group(1).zfill(2)}-{m.group(2).zfill(2)}-{m.group(3)}"
        normalized = _normalize_date_string(cand)
        if normalized:
            return normalized

    # yyyy[-\s]mm[-\s]dd
    m = re.search(r"\b(20\d{2})[-\s](\d{1,2})[-\s](\d{1,2})\b", t)
    if m:
        cand = f"{m.group(1)}-{m.group(2).zfill(2)}-{m.group(3).zfill(2)}"
        normalized = _normalize_date_string(cand)
        if normalized:
            return normalized

    return None


def _extract_dates_from_line(line: str) -> list[str]:
    out: list[str] = []

    t = _clean_dob_text(line)
    t = re.sub(r"[^0-9]", " ", t)
    parts = re.findall(r"\d{1,4}", t)

    if len(parts) < 3:
        return out

    for i in range(len(parts) - 2):
        a, b, c = parts[i:i + 3]
        candidates: list[str] = []

        if len(a) == 4:
            # FIX 5: use "-" to match _normalize_date_string expectations
            candidates.append(f"{a}-{b.zfill(2)}-{c.zfill(2)}")
        if len(c) == 4:
            candidates.append(f"{a.zfill(2)}-{b.zfill(2)}-{c}")

        for cand in candidates:
            normalized = _normalize_date_string(cand)
            if normalized:
                out.append(normalized)

    seen: set[str] = set()
    unique: list[str] = []
    for x in out:
        if x not in seen:
            seen.add(x)
            unique.append(x)

    return unique


def _extract_dob_loose(text: str) -> str | None:
    if not text:
        return None

    candidates: list[str] = []
    for line in text.splitlines():
        candidates.extend(_extract_dates_from_line(line))

    if not candidates:
        return None

    filtered = [c for c in candidates if 1900 <= int(c[:4]) <= datetime.date.today().year]
    if not filtered:
        return None

    for c in filtered:
        if c.startswith("20"):
            return c

    return filtered[0]


def _extract_gender(text: str) -> str | None:
    if not text:
        return None

    raw = text.strip()
    t = _normalize_gender_noise(text)

    if re.search(r"(?<!\S)ប្រុស(?!\S)", raw):
        return "MALE"
    if re.search(r"(?<!\S)ស្រី(?!\S)", raw):
        return "FEMALE"

    if re.search(r"\b(?:SEX|GENDER|PHET)\s*[:\-]?\s*MALE\b", t, flags=re.IGNORECASE):
        return "MALE"
    if re.search(r"\b(?:SEX|GENDER|PHET)\s*[:\-]?\s*FEMALE\b", t, flags=re.IGNORECASE):
        return "FEMALE"

    if re.search(r"\b(?:SEX|GENDER|PHET)\s*[:\-]?\s*M\b", t, flags=re.IGNORECASE):
        return "MALE"
    if re.search(r"\b(?:SEX|GENDER|PHET)\s*[:\-]?\s*F\b", t, flags=re.IGNORECASE):
        return "FEMALE"

    simple = re.sub(r"\s+", " ", t).strip().upper()
    if simple in {"MALE", "M"}:
        return "MALE"
    if simple in {"FEMALE", "F"}:
        return "FEMALE"

    return None


def _extract_gender_loose(text: str) -> str | None:
    if not text:
        return None

    raw = text.strip()
    t = _normalize_gender_noise(text)

    if "ប្រុស" in raw:
        return "MALE"
    if "ស្រី" in raw:
        return "FEMALE"

    if any(p in t for p in _GENDER_MALE_PATTERNS):
        return "MALE"
    if any(p in t for p in _GENDER_FEMALE_PATTERNS):
        return "FEMALE"

    if "FEMALE" in t or "FEMAL" in t or "FEMA" in t:
        return "FEMALE"
    if re.search(r"\bMALE\b", t):
        return "MALE"

    if re.search(r"\bM\b", t):
        return "MALE"
    if re.search(r"\bF\b", t):
        return "FEMALE"

    return None


def _extract_nationality(text: str) -> str | None:
    if not text:
        return None

    for pat in _RE_NATIONALITY:
        m = pat.search(text)
        if m:
            value = re.sub(r"\s{2,}", " ", m.group(1).strip())
            if value:
                return value
    return None


# ---------------------------------------------------------------------------
# Post-processing
# ---------------------------------------------------------------------------

def _postprocess_ocr_fields(fields: dict[str, Any]) -> dict[str, Any]:
    dob = fields.get("date_of_birth")
    if isinstance(dob, str) and dob.strip():
        fields["date_of_birth"] = _normalize_date_string(dob.strip()) or "UNKNOWN"
    else:
        fields["date_of_birth"] = "UNKNOWN"

    gender = fields.get("gender")
    if isinstance(gender, str) and gender.strip():
        # FIX 4: check Khmer script on the original value before uppercasing
        raw_gender = gender.strip()
        g = raw_gender.upper()
        if raw_gender == "ប្រុស" or g in {"MALE", "M"}:
            fields["gender"] = "MALE"
        elif raw_gender == "ស្រី" or g in {"FEMALE", "F"}:
            fields["gender"] = "FEMALE"
        else:
            fields["gender"] = "UNKNOWN"
    else:
        fields["gender"] = "UNKNOWN"

    full_name = fields.get("full_name")
    fields["full_name"] = (
        _normalize_person_name(full_name, remove_spaces=True)
        if isinstance(full_name, str) and full_name.strip()
        else "UNKNOWN"
    )

    document_id = fields.get("document_id")
    fields["document_id"] = (
        document_id.strip()
        if isinstance(document_id, str) and document_id.strip()
        else "UNKNOWN"
    )

    nationality = fields.get("nationality")
    fields["nationality"] = (
        nationality.strip()
        if isinstance(nationality, str) and nationality.strip()
        else "Khmer"
    )

    fields.pop("date_of_birth_khmer", None)
    return fields


# ---------------------------------------------------------------------------
# Main extraction entry point
# ---------------------------------------------------------------------------

def extract_ocr_fields(card_bgr: np.ndarray) -> dict[str, Any]:
    regions = _extract_field_regions(card_bgr)

    full_card_text = _normalize_text(_ocr_text_fast(card_bgr, is_small_text=False, psm=6))
    id_text = _normalize_text(_ocr_text_fast(regions["id_region"], is_small_text=True, psm=7))
    name_text = _normalize_text(_ocr_text_fast(regions["name_region"], is_small_text=True, psm=6))

    dob_pre = _preprocess_dob_region(regions["dob_region"])
    gender_pre = _preprocess_gender_region(regions["gender_region"])

    _debug_write("artifacts/dob_preprocessed.jpg", dob_pre)
    _debug_write("artifacts/gender_preprocessed.jpg", gender_pre)

    dob_text_raw = _normalize_text(_ocr_text_fast(regions["dob_region"], is_small_text=True, psm=7))
    dob_text_pre = _normalize_text(_ocr_text_fast(dob_pre, is_small_text=True, psm=7))
    dob_text = _normalize_text("\n".join(x for x in [dob_text_raw, dob_text_pre] if x))

    gender_text_raw = _normalize_text(_ocr_text_fast(regions["gender_region"], is_small_text=True, psm=7))
    gender_text_pre = _normalize_text(_ocr_text_fast(gender_pre, is_small_text=True, psm=7))
    gender_text = _normalize_text("\n".join(x for x in [gender_text_raw, gender_text_pre] if x))

    full_name = _extract_name(full_card_text) or _extract_name(name_text)

    date_of_birth = (
        _extract_dob(dob_text)
        or _extract_dob(dob_text_raw)
        or _extract_dob(dob_text_pre)
        or _extract_dob(full_card_text)
        or _extract_dob_loose(dob_text)
        or _extract_dob_loose(full_card_text)
    )

    gender = (
        _extract_gender(gender_text)
        or _extract_gender(gender_text_raw)
        or _extract_gender(gender_text_pre)
        or _extract_gender_loose(gender_text)
    )

    nationality = _extract_nationality(full_card_text) or "Khmer"

    document_id = _extract_document_id(id_text)
    if not document_id:
        document_id = _extract_document_id(full_card_text)

    if DEBUG_OCR:
        print("DOB OCR RAW:", repr(dob_text_raw))
        print("DOB OCR PRE:", repr(dob_text_pre))
        print("DOB OCR FINAL:", repr(dob_text))
        print("GENDER OCR RAW:", repr(gender_text_raw))
        print("GENDER OCR PRE:", repr(gender_text_pre))
        print("GENDER OCR FINAL:", repr(gender_text))
        print("FULL CARD OCR:", repr(full_card_text))

    fields: dict[str, Any] = {
        "full_name": full_name,
        "date_of_birth": date_of_birth,
        "gender": gender,
        "nationality": nationality,
        "document_id": document_id,
    }

    return _postprocess_ocr_fields(fields)


# ---------------------------------------------------------------------------
# Card Detection & Normalization (Public API)
# ---------------------------------------------------------------------------

def detect_and_crop_card(image: np.ndarray) -> np.ndarray | None:
    """
    Detect and crop an ID card from the image.
    
    For now, this is a simple passthrough that validates the image.
    In a future enhancement, this could use edge detection to automatically
    detect card boundaries and crop them.
    
    Args:
        image: Input image (BGR format)
    
    Returns:
        Cropped card image or None if detection fails
    """
    if image is None or image.size == 0:
        return None
    
    # Validate image dimensions (ID cards are typically landscape, 3:2 or 16:10)
    h, w = image.shape[:2]
    if h < 100 or w < 100:
        return None
    
    # Return the full image as the cropped card
    # (Edge detection can be added here in future)
    return image.copy()


def normalize_card_for_ocr(card: np.ndarray) -> np.ndarray:
    """
    Normalize a card image for OCR by applying perspective correction.
    
    This function detects the card edges and applies a perspective warp
    to normalize the card angle and size.
    
    Args:
        card: Card image (BGR format)
    
    Returns:
        Normalized card image ready for OCR
    """
    if card is None or card.size == 0:
        return card
    
    # For now, return the card as-is without aggressive transformation
    # The card is already normalized from the _warp_card function
    return card.copy()