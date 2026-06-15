import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { env } from '../../../environments/env';
import type { EkycRequest } from './EkycRequest';
import type { EkycResponse, OcrResponse } from './EkycResponse';

@Injectable({
  providedIn: 'root',
})
export class EkycService {
  private http = inject(HttpClient);
  private baseUrl = env.apiUrl;

  private buildAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    if (!token) return new HttpHeaders();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  // Step 1: POST /ekyc/create
  settings(): Observable<{ identityVerificationRequired: boolean }> {
    return this.http.get<{ identityVerificationRequired: boolean }>(`${this.baseUrl}/ekyc/settings`, {
      headers: this.buildAuthHeaders(),
    });
  }

  createEkyc(payload: EkycRequest): Observable<EkycResponse> {
    return this.http.post<EkycResponse>(`${this.baseUrl}/ekyc/create`, payload, {
      headers: this.buildAuthHeaders(),
    });
  }

  // Step 2: PUT /ekyc/create/id-card (multipart)
  uploadIdCard(frontId: File, backId: File): Observable<unknown> {
    const formData = new FormData();
    formData.append('frontId', frontId);
    formData.append('backId', backId);

    const candidateUrls = [
      `${this.baseUrl}/ekyc/create/id-card`,
      `${this.baseUrl}/ekyc/id-card`,
      `${this.baseUrl}/ekyc/create/idcard`,
      `${this.baseUrl}/ekyc/upload/id-card`,
    ];

    const tryUpload = (index: number): Observable<unknown> => {
      return this.http
        .put(candidateUrls[index], formData, {
          headers: this.buildAuthHeaders(),
        })
        .pipe(
          catchError((error) => {
            if (error?.status === 404 && index < candidateUrls.length - 1) {
              return tryUpload(index + 1);
            }
            return throwError(() => error);
          }),
        );
    };

    return tryUpload(0);
  }

  // Step 2.5: PUT /ekyc/verify/liveness (multipart)
  verifyLiveness(liveFaceImage: File): Observable<string> {
    const formData = new FormData();
    formData.append('live_face_image', liveFaceImage);

    return this.http.put(`${this.baseUrl}/ekyc/verify/liveness`, formData, {
      headers: this.buildAuthHeaders(),
      responseType: 'text',
    });
  }

  // Step 2.7: PUT /ekyc/verify/ocr
  verifyOcr(): Observable<OcrResponse> {
    return this.http.put<OcrResponse>(`${this.baseUrl}/ekyc/verify/ocr`, null, {
      headers: this.buildAuthHeaders(),
    });
  }

  // Step 3: PUT /ekyc/create/address
  updateAddress(payload: EkycRequest): Observable<EkycResponse> {
    return this.http.put<EkycResponse>(`${this.baseUrl}/ekyc/create/address`, payload, {
      headers: this.buildAuthHeaders(),
    });
  }

  // Review: GET /ekyc/review
  reviewEkyc(): Observable<unknown> {
    return this.http.get(`${this.baseUrl}/ekyc/review`, {
      headers: this.buildAuthHeaders(),
    });
  }
}
