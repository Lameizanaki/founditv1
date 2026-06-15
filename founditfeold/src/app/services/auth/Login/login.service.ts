import { inject, Injectable } from '@angular/core';
import { env } from '../../../../environments/env';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { LoginResponse } from './LoginResponse';
import { LoginRequest } from './LoginRequest';
import { ExtractRoleToken } from '../token/ExtractRoleToken';

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  private http = inject(HttpClient);
  private extractRoleFromToken = inject(ExtractRoleToken);

  private baseUrl: string = env.apiUrl;

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/auth/login`, payload).pipe(
      tap((response) => {
        this.setToken(response.token);
        this.setRole(this.extractRoleFromToken.extractRoleFromJwt(response.token));
      }),
    );
  }

  continueWithGoogle(): void {
    window.location.href = `${this.baseUrl}/oauth2/authorization/google`;
  }

  setToken(token: string): void {
    localStorage.setItem('token', token.trim());
  }

  getToken(): string | null {
    return localStorage.getItem('token')?.trim() ?? null;
  }

  setRole(role: string | null): void {
    if (!role) {
      localStorage.removeItem('role');
      return;
    }
    localStorage.setItem('role', role);
  }

  getRole(): string | null {
    return localStorage.getItem('role');
  }

  getRoleFromToken(token: string): string | null {
    return this.extractRoleFromToken.extractRoleFromJwt(token);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
  }
}
