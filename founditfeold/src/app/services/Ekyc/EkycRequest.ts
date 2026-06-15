export enum GenderEnum {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

// Mirrors backend.dto.ekyc.EkycRequestDTO (all fields optional so we can reuse
// the same type across step 1 and step 3 requests).
export interface EkycRequest {
  // Step 1
  fullName?: string;
  dateOfBirth?: string; // yyyy-MM-dd format required for OCR
  nationality?: string;
  gender?: GenderEnum | string; // MALE or FEMALE (converted from M/F frontend input)
  phoneNumber?: string;

  // Step 2 (sent as multipart files in this frontend; these are here for parity)
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
  postal_code?: string;
  country?: string;
}
