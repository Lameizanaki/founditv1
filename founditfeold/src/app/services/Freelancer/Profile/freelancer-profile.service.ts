import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, map, Observable, of, tap, throwError } from 'rxjs';
import { env } from '../../../../environments/env';
import {
  FreelancerExperienceRequest,
  FreelancerExperienceResponse,
  FreelancerProfileRequest,
  FreelancerProfileResponse,
  FreelancerRightSideBarRequest,
  FreelancerRightSideBarResponse,
} from './freelancer-profile.models';

export interface FreelancerReviewResponse {
  id: number;
  clientId?: number;
  clientName?: string;
  rating?: number;
  service?: string;
  comment?: string;
  createdAt?: string;
}

export interface FreelancerReviewRequest {
  rating: number;
  service?: string;
  comment: string;
}

@Injectable({
  providedIn: 'root',
})
export class FreelancerProfileService {
  private http = inject(HttpClient);
  private baseUrl = `${env.apiUrl}/freelancer`;
  private profileChangedSubject = new BehaviorSubject<void>(undefined);

  profileChanged$ = this.profileChangedSubject.asObservable();

  notifyProfileChanged(): void {
    this.profileChangedSubject.next();
  }

  getMyProfile(): Observable<FreelancerProfileResponse> {
    return this.http.get<FreelancerProfileResponse>(`${this.baseUrl}/me/client/profile`);
  }

  getClientProfile(freelancerId: number | string): Observable<FreelancerProfileResponse> {
    return this.http.get<FreelancerProfileResponse>(
      `${this.baseUrl}/${freelancerId}/client/profile`,
    );
  }

  ensureMyProfile(): Observable<FreelancerProfileResponse> {
    return this.getMyProfile().pipe(
      catchError((error) => {
        if (error?.status === 404) {
          return this.createProfile(this.buildDefaultProfileRequest());
        }

        return throwError(() => error);
      }),
    );
  }

  createProfile(request: FreelancerProfileRequest): Observable<FreelancerProfileResponse> {
    return this.http
      .post<FreelancerProfileResponse>(`${this.baseUrl}/create-profile`, request)
      .pipe(tap(() => this.notifyProfileChanged()));
  }

  updateProfile(request: FreelancerProfileRequest): Observable<FreelancerProfileResponse> {
    return this.http
      .put<FreelancerProfileResponse>(`${this.baseUrl}/update-profile`, request)
      .pipe(tap(() => this.notifyProfileChanged()));
  }

  createAvatar(file: File): Observable<FreelancerProfileResponse> {
    const formData = new FormData();
    formData.append('avatar', file);

    return this.http
      .put<FreelancerProfileResponse>(`${this.baseUrl}/create-avatar`, formData)
      .pipe(tap(() => this.notifyProfileChanged()));
  }

  createAbout(request: { about?: string }): Observable<FreelancerProfileResponse> {
    return this.http
      .put<FreelancerProfileResponse>(`${this.baseUrl}/create-about`, request)
      .pipe(tap(() => this.notifyProfileChanged()));
  }

  createSkill(request: { skill?: string[] }): Observable<FreelancerProfileResponse> {
    return this.http
      .put<FreelancerProfileResponse>(`${this.baseUrl}/create-skill`, request)
      .pipe(tap(() => this.notifyProfileChanged()));
  }

  createExperience(request: FreelancerExperienceRequest): Observable<FreelancerExperienceResponse> {
    return this.http
      .put<FreelancerExperienceResponse>(`${this.baseUrl}/create-experience`, request)
      .pipe(tap(() => this.notifyProfileChanged()));
  }

  updateExperience(
    experienceId: number | string,
    request: FreelancerExperienceRequest,
  ): Observable<FreelancerExperienceResponse> {
    return this.http
      .put<FreelancerExperienceResponse>(
        `${this.baseUrl}/${experienceId}/update-experience`,
        request,
      )
      .pipe(tap(() => this.notifyProfileChanged()));
  }

  getExperience(): Observable<FreelancerExperienceResponse[]> {
    return this.http.get<FreelancerExperienceResponse[]>(`${this.baseUrl}/get-experience`);
  }

  getClientExperience(freelancerId: number): Observable<FreelancerExperienceResponse[]> {
    return this.http.get<FreelancerExperienceResponse[]>(
      `${this.baseUrl}/${freelancerId}/profile/experience`,
    );
  }

  getMyExperience(): Observable<FreelancerExperienceResponse[]> {
    return this.http.get<FreelancerExperienceResponse[]>(`${this.baseUrl}/me/profile/experience`);
  }

  createRightSidebar(
    request: FreelancerRightSideBarRequest,
  ): Observable<FreelancerRightSideBarResponse> {
    return this.http
      .post<FreelancerRightSideBarResponse>(`${this.baseUrl}/rightSideBar`, request)
      .pipe(map((response) => this.normalizeRightSidebarResponse(response)))
      .pipe(tap(() => this.notifyProfileChanged()));
  }

  updateRightSidebar(
    sidebarId: number | string,
    request: FreelancerRightSideBarRequest,
  ): Observable<FreelancerRightSideBarResponse> {
    return this.http
      .put<FreelancerRightSideBarResponse>(
        `${this.baseUrl}/${sidebarId}/update-rightSideBar`,
        request,
      )
      .pipe(map((response) => this.normalizeRightSidebarResponse(response)))
      .pipe(tap(() => this.notifyProfileChanged()));
  }

  incrementRightSidebarView(
    clientId: number,
    freelancerId: number,
    sideBarId: number,
  ): Observable<FreelancerRightSideBarResponse> {
    return this.http
      .put<FreelancerRightSideBarResponse>(
        `${this.baseUrl}/client/${clientId}/freelancer/${freelancerId}/sidebar/${sideBarId}/view`,
        {},
      )
      .pipe(map((response) => this.normalizeRightSidebarResponse(response)))
      .pipe(tap(() => this.notifyProfileChanged()));
  }

  getClientRightSidebar(freelancerId: number): Observable<FreelancerRightSideBarResponse> {
    return this.http
      .get<FreelancerRightSideBarResponse>(`${this.baseUrl}/${freelancerId}/get-rightSideBar`)
      .pipe(map((response) => this.normalizeRightSidebarResponse(response)));
  }

  getMyRightSidebar(): Observable<FreelancerRightSideBarResponse> {
    return this.http
      .get<FreelancerRightSideBarResponse>(`${this.baseUrl}/me/get-rightSideBar`)
      .pipe(map((response) => this.normalizeRightSidebarResponse(response)));
  }

  getFreelancerReviews(freelancerId: number | string): Observable<FreelancerReviewResponse[]> {
    return this.http.get<FreelancerReviewResponse[]>(`${this.baseUrl}/${freelancerId}/reviews`);
  }

  getMyReviews(): Observable<FreelancerReviewResponse[]> {
    return this.http.get<FreelancerReviewResponse[]>(`${this.baseUrl}/me/reviews`);
  }

  createReview(
    freelancerId: number | string,
    request: FreelancerReviewRequest,
  ): Observable<FreelancerReviewResponse> {
    return this.http.post<FreelancerReviewResponse>(
      `${this.baseUrl}/${freelancerId}/reviews`,
      request,
    );
  }

  deleteReview(reviewId: number | string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/reviews/${reviewId}`);
  }

  ensureMyRightSidebar(): Observable<FreelancerRightSideBarResponse> {
    return this.getMyRightSidebar().pipe(
      catchError((error) => {
        if (error?.status === 404) {
          return this.createRightSidebar(this.buildDefaultRightSidebarRequest());
        }

        return throwError(() => error);
      }),
    );
  }

  private buildDefaultProfileRequest(): FreelancerProfileRequest {
    const claims = this.readTokenClaims();
    const name = this.readClaim(claims, ['freelancerName', 'name', 'preferred_username', 'sub']);
    const email = this.readClaim(claims, ['email']);

    return {
      freelancerName: name ?? email ?? 'Freelancer',
      freelancerJob: '',
      rating: 0,
      workLocation: '',
      yearExperience: 0,
      about: '',
      skill: [],
    };
  }

  private buildDefaultRightSidebarRequest(): FreelancerRightSideBarRequest {
    return {
      startPrice: 0,
      viewCount: 0,
    };
  }

  private normalizeRightSidebarResponse(
    response: FreelancerRightSideBarResponse,
  ): FreelancerRightSideBarResponse {
    const normalizedId = response.id ?? response.sideBarId ?? response.sidebarId;
    const normalizedViewCount =
      response.viewCount ?? response.view ?? response.views ?? response.sideBarView;

    return {
      ...response,
      id: normalizedId,
      viewCount: normalizedViewCount,
    };
  }

  getCurrentClientIdFromToken(): number | null {
    const claims = this.readTokenClaims();
    return this.extractNumberFromRecord(claims, [
      'clientId',
      'client_id',
      'id',
      'userId',
      'user_id',
      'profileId',
      'clientProfileId',
      'client_profile_id',
      'sub',
    ]);
  }

  resolveCurrentClientId(): Observable<number | null> {
    const tokenClientId = this.getCurrentClientIdFromToken();
    if (tokenClientId && tokenClientId > 0) {
      return of(tokenClientId);
    }

    return this.http.get<unknown>(`${env.apiUrl}/client/me`).pipe(
      map((payload) => this.extractClientIdFromPayload(payload)),
      catchError(() => of(null)),
    );
  }

  private extractClientIdFromPayload(payload: unknown): number | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const wrapper = payload as {
      data?: unknown;
      result?: unknown;
      profile?: unknown;
      user?: unknown;
    };

    const unwrapped = wrapper.data ?? wrapper.result ?? wrapper.profile ?? wrapper.user ?? payload;
    if (!unwrapped || typeof unwrapped !== 'object') {
      return null;
    }

    return this.extractNumberFromRecord(unwrapped as Record<string, unknown>, [
      'id',
      'clientId',
      'client_id',
      'userId',
      'user_id',
      'profileId',
      'clientProfileId',
      'client_profile_id',
    ]);
  }

  private extractNumberFromRecord(
    record: Record<string, unknown> | null,
    keys: string[],
  ): number | null {
    if (!record) {
      return null;
    }

    for (const key of keys) {
      const value = record[key];
      const parsed = this.toPositiveNumber(value);
      if (parsed !== null) {
        return parsed;
      }
    }

    return null;
  }

  private toPositiveNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }

    return null;
  }

  private readTokenClaims(): Record<string, unknown> | null {
    const token = localStorage.getItem('token');
    if (!token) {
      return null;
    }

    const parts = token.split('.');
    if (parts.length < 2) {
      return null;
    }

    try {
      return JSON.parse(this.base64UrlDecode(parts[1])) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private readClaim(claims: Record<string, unknown> | null, keys: string[]): string | null {
    if (!claims) {
      return null;
    }

    for (const key of keys) {
      const value = claims[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
    }

    return null;
  }

  private base64UrlDecode(value: string): string {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    return decodeURIComponent(
      atob(padded)
        .split('')
        .map((character) => `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    );
  }
}
