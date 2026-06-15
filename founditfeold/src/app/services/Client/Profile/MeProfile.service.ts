import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { env } from '../../../../environments/env';
import { catchError, map, Observable, throwError, of } from 'rxjs';
import { MeProfileResponse } from './MeProfileResponse';
import { ProjectHistoryResponse } from './ProjectHistoryResponse';

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private apiUrl = env.apiUrl;
  private cachedProfile: MeProfileResponse | null = null;

  constructor(private http: HttpClient) {}

  private unwrapProfile(payload: unknown): MeProfileResponse {
    if (!payload || typeof payload !== 'object') {
      return {} as MeProfileResponse;
    }

    const wrapper = payload as {
      data?: unknown;
      result?: unknown;
      profile?: unknown;
      user?: unknown;
    };

    // Try unwrapping from various possible wrapper structures
    const unwrapped = wrapper.data ?? wrapper.result ?? wrapper.profile ?? wrapper.user ?? payload;

    if (!unwrapped || typeof unwrapped !== 'object') {
      return {} as MeProfileResponse;
    }

    const raw = unwrapped as Record<string, unknown>;
    const statistics = raw['statistics'] as Record<string, unknown> | undefined;

    // Map backend field names to frontend interface
    const result: MeProfileResponse = {
      id: (raw['id'] as number) || 0,
      clientId: this.toNumber(raw['clientId'] ?? raw['client_id']),
      fullName: (raw['fullName'] as string) || (raw['clientName'] as string) || '',
      email: (raw['email'] as string) || (raw['clientEmail'] as string) || '',
      avatar: (raw['avatar'] as string) || (raw['profilePictureData'] as string) || '',
      clientName: raw['clientName'] as string,
      clientEmail: raw['clientEmail'] as string,
      workLocation: raw['workLocation'] as string,
      profilePictureData: raw['profilePictureData'] as string | Uint8Array,
      profilePictureType: raw['profilePictureType'] as string,
      profilePictureName: raw['profilePictureName'] as string,
      profilePictureUrl: raw['profilePictureUrl'] as string,
      bio: raw['bio'] as string,
      phone: raw['phone'] as string,
      company: raw['company'] as string,
      location: raw['location'] as string,
      availability: raw['availability'] as boolean | string,
      about: raw['about'] as string,
      website: raw['website'] as string,
      // Map statistics object fields
      totalSpent: (statistics?.['totalSpent'] as number) || 0,
      completedProjects: (statistics?.['completed'] as number) || 0,
      activeProjects: (statistics?.['active'] as number) || 0,
      averageRating: (statistics?.['averageRating'] as number) || 0,
    };

    return result;
  }

  getPublicProfile(clientId: number): Observable<MeProfileResponse> {
    return this.fetchProfile(`${this.apiUrl}/client/${clientId}/profile`);
  }

  getFreelancerViewProfile(clientId: number): Observable<MeProfileResponse> {
    return this.fetchProfile(`${this.apiUrl}/client/${clientId}/profile/freelancer-view`);
  }

  getMyProfile(): Observable<MeProfileResponse> {
    // Return cached profile if available
    if (this.cachedProfile) {
      return of(this.cachedProfile);
    }

    const token = localStorage.getItem('token');
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();

    const url = `${this.apiUrl}/client/me`;
    return this.http.get<unknown>(url, { headers }).pipe(
      map((payload) => {
        const result = this.unwrapProfile(payload);
        this.cachedProfile = result;
        return result;
      }),
      catchError((error) => {
        return throwError(() => error);
      }),
    );
  }

  createProfile(request: Record<string, unknown>): Observable<MeProfileResponse> {
    return this.http.post<unknown>(`${this.apiUrl}/client/create-profile`, request).pipe(
      map((payload) => {
        const result = this.unwrapProfile(payload);
        this.updateCachedProfile(result);
        return result;
      }),
    );
  }

  ensureMyProfile(): Observable<MeProfileResponse> {
    return this.getMyProfile().pipe(
      catchError((error) => {
        if (!this.isMissingProfileError(error)) {
          return throwError(() => error);
        }

        return this.createProfile(this.buildDefaultProfileRequest());
      }),
    );
  }

  updateContactInfo(id: number, request: Record<string, unknown>): Observable<MeProfileResponse> {
    return this.http.put<unknown>(`${this.apiUrl}/client/${id}/contact-info`, request).pipe(
      map((payload) => {
        const result = this.unwrapProfile(payload);
        this.updateCachedProfile(result);
        return result;
      }),
    );
  }

  updateAbout(id: number, request: Record<string, unknown>): Observable<MeProfileResponse> {
    return this.http.put<unknown>(`${this.apiUrl}/client/${id}/about`, request).pipe(
      map((payload) => {
        const result = this.unwrapProfile(payload);
        this.updateCachedProfile(result);
        return result;
      }),
    );
  }

  updateAvatar(id: number, file: File): Observable<MeProfileResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.put<unknown>(`${this.apiUrl}/client/${id}/avatar`, formData).pipe(
      map((payload) => {
        const result = this.unwrapProfile(payload);
        this.updateCachedProfile(result);
        return result;
      }),
    );
  }

  changePassword(request: { currentPassword: string; newPassword: string }): Observable<string> {
    return this.http.put(`${this.apiUrl}/client/change-password`, request, {
      responseType: 'text',
    });
  }

  getProjectHistory(): Observable<ProjectHistoryResponse[]> {
    return this.http
      .get<unknown>(`${this.apiUrl}/client/project-history`)
      .pipe(map((payload) => this.unwrapHistory(payload)));
  }

  getFreelancerViewProjectHistory(clientId: number): Observable<ProjectHistoryResponse[]> {
    return this.http
      .get<unknown>(`${this.apiUrl}/client/${clientId}/project-history/freelancer-view`)
      .pipe(map((payload) => this.unwrapHistory(payload)));
  }

  private fetchProfile(url: string): Observable<MeProfileResponse> {
    return this.http.get<unknown>(url).pipe(map((payload) => this.unwrapProfile(payload)));
  }

  private unwrapHistory(payload: unknown): ProjectHistoryResponse[] {
    if (!payload) {
      return [];
    }

    if (Array.isArray(payload)) {
      return payload as ProjectHistoryResponse[];
    }

    if (typeof payload !== 'object') {
      return [];
    }

    const wrapper = payload as {
      data?: unknown;
      result?: unknown;
      history?: unknown;
      items?: unknown;
      list?: unknown;
      projects?: unknown;
      projectHistory?: unknown;
    };

    const unwrapped =
      wrapper.data ??
      wrapper.result ??
      wrapper.history ??
      wrapper.items ??
      wrapper.list ??
      wrapper.projects ??
      wrapper.projectHistory ??
      payload;

    if (!Array.isArray(unwrapped)) {
      return [];
    }

    return unwrapped as ProjectHistoryResponse[];
  }

  private buildDefaultProfileRequest(): Record<string, unknown> {
    const claims = this.readTokenClaims();
    const fullName =
      this.readClaim(claims, ['fullName', 'full_name', 'name', 'preferred_username', 'username']) ??
      'Client';
    const email = this.readClaim(claims, ['email']) ?? '';

    return {
      fullName,
      name: fullName,
      email,
      phone: '',
      company: '',
      location: '',
      website: '',
      availability: false,
      about: '',
      bio: '',
    };
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
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const json = atob(padded);
      const parsed: unknown = JSON.parse(json);

      if (!parsed || typeof parsed !== 'object') {
        return null;
      }

      return parsed as Record<string, unknown>;
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
        return value.trim();
      }
    }

    return null;
  }

  private toNumber(value: unknown): number | undefined {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  }

  private isMissingProfileError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const response = error as {
      status?: unknown;
      error?: unknown;
      message?: unknown;
    };

    const status = typeof response.status === 'number' ? response.status : null;
    const message = [response.message, response.error]
      .flatMap((value) => {
        if (typeof value === 'string') {
          return [value.toLowerCase()];
        }
        if (typeof value === 'object' && value !== null) {
          const msg = (value as any).message;
          return typeof msg === 'string' ? [msg.toLowerCase()] : [];
        }
        return [];
      })
      .join(' ');

    const isMissing =
      status === 401 ||
      status === 404 ||
      message.includes('profile not found') ||
      message.includes('not found');

    return isMissing;
  }

  // ── Cache Management ──
  clearCache(): void {
    this.cachedProfile = null;
  }

  getCachedProfile(): MeProfileResponse | null {
    return this.cachedProfile;
  }

  updateCachedProfile(profile: MeProfileResponse): void {
    this.cachedProfile = profile;
  }
}
