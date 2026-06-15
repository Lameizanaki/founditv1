# OCR Service Diagnostics & Improvement Guide

## Issue Summary

The OCR service is failing to extract `date_of_birth` and `gender` fields from ID documents.

## What I've Done

✅ Added comprehensive logging to see exactly what OCR extracts at each stage

- Now prints raw OCR text for DOB and gender regions
- Shows preprocessed versions
- Shows final extracted values

## How to Diagnose

### Step 1: Run with logging enabled

```bash
# Set environment variable to enable logging
$env:DEBUG_OCR="1"

# Run your service
python -m uvicorn app.main:app --reload
```

### Step 2: Upload an ID image

Look at the terminal output for lines like:

```
============================================================
OCR EXTRACTION RESULTS:
============================================================
DOB OCR RAW: '...'
DOB OCR PRE: '...'
DOB EXTRACTED: '2005-07-15'  or  None
GENDER OCR RAW: '...'
GENDER OCR PRE: '...'
GENDER EXTRACTED: 'MALE'  or  None
```

## Common Issues & Solutions

### Issue 1: DOB/Gender show as "UNKNOWN" (None extracted)

**Check what was OCR'd:**

- If `DOB OCR RAW` is empty → **image region is wrong**
- If `DOB OCR RAW` has text but `DOB EXTRACTED` is None → **format not recognized**

**Solutions:**

#### A. Adjust Region Coordinates

The regions are defined in `_extract_field_regions()` (lines 300-350):

```python
# Current defaults for Cambodian ID:
band_y1 = int(0.40 * h)  # Start at 40% from top
band_y2 = int(0.70 * h)  # End at 70% from top
band_x1 = int(0.12 * w)  # Start at 12% from left
band_x2 = int(0.82 * w)  # End at 82% from left

# DOB takes left part:
dob_x1 = 0
dob_x2 = int(0.76 * bw)

# Gender takes right part:
gender_x1 = int(0.76 * bw) - 100
gender_x2 = gender_x1 + 220
```

**To adjust:**

1. Enable `DEBUG_OCR=1` to get region images in `artifacts/` folder:
   - `dob_region.jpg` - what we're trying to OCR for DOB
   - `gender_region.jpg` - what we're trying to OCR for gender
   - `dob_gender_band.jpg` - the full band context

2. Open these images and check if they capture the right fields
3. If not, adjust the percentages above

**Typical values for different ID formats:**

- **Cambodian ID (front)**: DOB usually 40-70% down, gender further right
- **Passport**: May be different position
- **National ID**: Varies by country

#### B. Improve Text Recognition

If the region looks correct but text is garbled, try these:

1. **Check Image Quality:**
   - Is the photo well-lit?
   - Is there glare/shadow?
   - Is resolution high enough?
   - Test with a clear photo first

2. **Adjust Preprocessing:**
   In `_preprocess_dob_region()` (lines 210-220):

   ```python
   # Current settings:
   gray = cv2.convertScaleAbs(gray, alpha=2.8, beta=45)  # Brightness/contrast
   blur = cv2.GaussianBlur(gray, (5, 5), 0)  # Blur kernel
   # Threshold parameters: (31, 8) control sensitivity
   ```

3. **Switch OCR Engine Priority:**
   In `_ocr_text_fast()` (lines 230-250):
   ```python
   # Currently tries easyocr first, then pytesseract
   # You could add tesseract-specific tuning
   ```

### Issue 2: OCR text includes garbage characters

**Example:** `"2O05-O7-15"` (zeros read as letter O)

**Status:** ✅ Already handled by `_clean_dob_text()` which fixes common OCR errors

### Issue 3: Date format not recognized

**Example:** OCR reads `"07 15 2005"` but expects `"YYYY-MM-DD"`

**Status:** ✅ Already handled by `_normalize_date_string()` which tries multiple formats:

- `YYYY-MM-DD`
- `YYYY MM DD`
- `DD-MM-YYYY`
- `DD MM YYYY`
- `DD-MM-YY`
- `YY-MM-DD`

**If still failing:**

- Check console output for what format was OCR'd
- Add new format to the `_normalize_date_string()` function

### Issue 4: Gender shows as "UNKNOWN"

**Cambodian ID keywords:**

- `ប្រុស` = MALE (Khmer)
- `ស្រី` = FEMALE (Khmer)
- `MALE` / `M` = MALE (English)
- `FEMALE` / `F` = FEMALE (English)

**OCR Misreading Patterns:**

```python
# Male OCR garbles: MDEU, MOGU, MUQU, MOG, MOU, IUFU, 1UFU, NUFU, BUUS, BRUS, BRU5
# Female OCR garbles: JURU, IUJU, 5RI, SRI, SR1
```

These are already handled by `_extract_gender_loose()`.

**If gender still shows UNKNOWN:**

- Check what `GENDER OCR RAW` and `GENDER OCR PRE` show
- May need to add more pattern variations
- Try uploading a clearer image

## Implementation Options for Missing Fields

If OCR continues to fail for certain documents, implement fallback strategies:

### Option 1: Manual Input (Recommended)

```python
# In your API response validation:
if date_of_birth == "UNKNOWN":
    return {
        "status": "partial_success",
        "message": "Please verify DOB manually",
        "ocr_result": {...},
        "requires_manual_review": True,
        "missing_fields": ["date_of_birth", "gender"]
    }
```

### Option 2: User Verification UI

Frontend shows extracted fields with confidence scores and allows manual correction:

```javascript
{
  full_name: "John Doe",        // confidence: 98%
  date_of_birth: "UNKNOWN",     // confidence: 0% - needs manual entry
  gender: "UNKNOWN",            // confidence: 0% - needs dropdown select
  document_id: "123456789"      // confidence: 99%
}
```

### Option 3: Better Models

Consider using:

- **Tesseract 5+**: Better for structured documents
- **PaddleOCR**: Trained on more language variants
- **Cloud APIs**: Google Vision API, AWS Textract (handles complex layouts)

## Testing & Validation

### To verify OCR is working:

```bash
# Enable debug mode to get intermediate images
$env:DEBUG_OCR="1"

# Run service
python -m uvicorn app.main:app --reload

# Upload test image
# Check terminal for OCR output
# Check artifacts/ folder for region images
```

### To test specific OCR code:

```python
# In Python REPL or test file:
import cv2
from service.ocr_service import extract_ocr_fields

img = cv2.imread("test_id.jpg")
result = extract_ocr_fields(img)
print(result)
```

## Next Steps

1. **Enable logging** and upload a test ID image
2. **Check terminal output** to see what OCR is reading
3. **Compare** with actual ID content
4. **Identify issue:**
   - Region coordinates wrong? → Adjust percentages
   - Text quality bad? → Test with clearer image
   - Format not recognized? → Check date patterns
5. **Report findings** with terminal output and we can further optimize

---

## File Locations

- **OCR Service Code**: [service/ocr_service.py](service/ocr_service.py)
- **Region Definition**: [service/ocr_service.py#L300-L350](service/ocr_service.py#L300-L350)
- **Extraction Functions**: [service/ocr_service.py#L350-L500](service/ocr_service.py#L350-L500)
- **Debug Artifacts**: `artifacts/` folder (created when `DEBUG_OCR=1`)
