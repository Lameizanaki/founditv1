import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { env } from '../../../environments/env';

export type AccountStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED';
export type AccountReportStatus = 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED';

export interface AccountStatusResponse {
  id: number;
  username: string;
  email: string;
  role: 'CLIENT' | 'FREELANCER' | 'ADMIN';
  status: AccountStatus;
}

export interface AccountReport {
  id: number;
  userId: number;
  username: string | null;
  email: string | null;
  role: 'CLIENT' | 'FREELANCER' | 'ADMIN' | null;
  accountStatus: AccountStatus | null;
  subject: string;
  message: string;
  status: AccountReportStatus;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class AccountReportService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = env.apiUrl;

  getAccountStatus(): Observable<AccountStatusResponse> {
    return this.http.get<AccountStatusResponse>(`${this.baseUrl}/account/status`);
  }

  submitReport(payload: { subject: string; message: string }): Observable<AccountReport> {
    return this.http.post<AccountReport>(`${this.baseUrl}/account/reports`, payload);
  }

  myReports(): Observable<AccountReport[]> {
    return this.http.get<AccountReport[]>(`${this.baseUrl}/account/reports`);
  }

  adminReports(): Observable<AccountReport[]> {
    return this.http.get<AccountReport[]>(`${this.baseUrl}/admin/reports`);
  }

  updateReport(
    id: number,
    payload: { status: AccountReportStatus; adminNote?: string },
  ): Observable<AccountReport> {
    return this.http.put<AccountReport>(`${this.baseUrl}/admin/reports/${id}`, payload);
  }
}
