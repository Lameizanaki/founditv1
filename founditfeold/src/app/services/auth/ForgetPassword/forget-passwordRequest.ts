export interface SendCodeRequest {
  email: string;
}

export interface ResendCodeRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  verifyCode: string;
  newPassword: string;
}
