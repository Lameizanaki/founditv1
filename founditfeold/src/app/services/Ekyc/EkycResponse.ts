import type { GenderEnum } from './EkycRequest';

// Mirrors backend.dto.ekyc.EkycResponseDTO (fields may be null/omitted depending on step)
export interface EkycResponse {
  // Step 1
  fullName?: string;
  dateOfBirth?: string;
  nationality?: string;
  gender?: GenderEnum | string;
  phoneNumber?: string;

  // Step 2
  frontIdData?: number[];
  frontId?: string;
  frontIdType?: string;
  backIdData?: number[];
  backId?: string;
  backIdType?: string;

  // Step 3
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state_province?: string;
  country?: string;

  status?: 'PENDING' | 'IN_REVIEW' | 'VERIFIED' | 'FAILED';
  ocrVerified?: boolean;
  faceVerified?: boolean;
  failureReason?: string;
}

// OCR verification response
export interface OcrResponse {
  ocr_result?: {
    full_name?: string;
    date_of_birth?: string;
    gender?: string;
    document_id?: string;
    nationality?: string;
    [key: string]: any;
  };
  ocr_match?: boolean;
  mismatch_field?: string;
  expected?: string;
  actual?: string;
}
