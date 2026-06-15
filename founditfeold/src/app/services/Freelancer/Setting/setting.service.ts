import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { env } from '../../../../environments/env';
import { SettingRequest } from './SettingRequest';
import {
  FreelancerProfileRequest,
  FreelancerProfileResponse,
} from '../Profile/freelancer-profile.models';
import { SettingResponse } from './SettingResponse';

/**
 * SettingService - Handles freelancer profile settings and avatar upload
 * Matches backend controller: backend.controller.freelancer.setting.SettingController
 */
@Injectable({
  providedIn: 'root',
})
export class SettingService {
  private http = inject(HttpClient);
  private baseUrl = `${env.apiUrl}/freelancer`;

  /**
   * Get current freelancer settings
   * GET /freelancer/me/setting
   * @returns Observable<SettingResponse>
   */
  getMySetting(): Observable<SettingResponse> {
    return this.http.get<SettingResponse>(`${this.baseUrl}/me/setting`);
  }

  /**
   * Create freelancer profile metadata
   * POST /freelancer/create-profile
   * @param request - Profile payload
   * @returns Observable<FreelancerProfileResponse>
   */
  createProfile(request: FreelancerProfileRequest): Observable<FreelancerProfileResponse> {
    return this.http.post<FreelancerProfileResponse>(`${this.baseUrl}/create-profile`, request);
  }

  /**
   * Update avatar profile picture
   * PUT /freelancer/create-avatar (multipart/form-data)
   * @param file - Avatar image file
   * @returns Observable<FreelancerProfileResponse>
   */
  createAvatar(file: File): Observable<FreelancerProfileResponse> {
    const formData = new FormData();
    formData.append('avatar', file);

    return this.http.put<FreelancerProfileResponse>(`${this.baseUrl}/create-avatar`, formData);
  }

  /**
   * Backward-compatible avatar update wrapper
   */
  updateAvatar(_settingId: number | string, file: File): Observable<FreelancerProfileResponse> {
    return this.createAvatar(file);
  }

  /**
   * Change freelancer password
   * PUT /freelancer/change-password
   * @param request - SettingRequest with currentPassword and newPassword
   * @returns Observable<any>
   */
  changePassword(request: SettingRequest): Observable<any> {
    return this.http.put(`${this.baseUrl}/change-password`, request);
  }

  uploadBankQr(file: File): Observable<SettingResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.put<SettingResponse>(`${this.baseUrl}/setting/bank-qr`, formData);
  }
}
