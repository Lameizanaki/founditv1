import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ResendCodeRequest, ResetPasswordRequest, SendCodeRequest } from './forget-passwordRequest';
import { Observable, tap } from 'rxjs';
import { MessageResponse } from './forget-passwordResponse';
import { env } from '../../../../environments/env';

@Injectable({
  providedIn: 'root',
})
export class ForgetPasswordService {
  private http = inject(HttpClient);
  private baseUrl: string = env.apiUrl;

  sendCode(request: SendCodeRequest): Observable<MessageResponse> {
    return this.http
      .post<MessageResponse>(`${this.baseUrl}/auth/send-code`, request)
      .pipe(tap(() => console.log('Verify code sent')));
  }

  resetPassword(request: ResetPasswordRequest): Observable<MessageResponse> {
    return this.http
      .post<MessageResponse>(`${this.baseUrl}/auth/reset-password`, request)
      .pipe(tap(() => console.log('Password reset success')));
  }

  resendCode(request: ResendCodeRequest): Observable<MessageResponse> {
    return this.http
      .post<MessageResponse>(`${this.baseUrl}/auth/resend-code`, request)
      .pipe(tap(() => console.log('Verify code resent')));
  }
}
