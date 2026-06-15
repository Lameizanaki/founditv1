export interface SettingResponse {
  id?: number;
  username?: string;
  email?: string;
  avatarProfileData?: Uint8Array | string;
  avatarProfileUrl?: string;
  avatarProfileName?: string;
  avatarProfileType?: string;
  bankQrData?: Uint8Array | string | number[] | null;
  bankQrName?: string | null;
  bankQrType?: string | null;
  freelancerId?: number;
  createdAt?: string;
  updatedAt?: string;
}
