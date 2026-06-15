import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { env } from '../../../environments/env';

export interface AdminPendingReview {
  ekycId: number;
  registerId: number | null;
  username: string | null;
  email: string | null;
  role: 'CLIENT' | 'FREELANCER' | 'ADMIN' | null;
  fullName: string | null;
  phoneNumber: string | null;
  nationality: string | null;
  country: string | null;
  status: 'PENDING' | 'IN_REVIEW' | 'VERIFIED' | 'FAILED';
  failureReason: string | null;
  documentId: string | null;
}

export interface AdminEkycDetail extends AdminPendingReview {
  dateOfBirth: string | null;
  gender: string | null;
  ocrVerified: boolean | null;
  faceVerified: boolean | null;
  frontIdData: string | number[] | null;
  frontIdType: string | null;
  frontIdName: string | null;
  backIdData: string | number[] | null;
  backIdType: string | null;
  backIdName: string | null;
  liveFaceData: string | number[] | null;
  liveFaceType: string | null;
  liveFaceName: string | null;
}

export interface AdminDashboard {
  totalFreelancers: number;
  totalClients: number;
  totalUsers: number;
  totalRevenue: number;
  paidPaymentRecords: number;
  pendingRevenue: number;
  submittedPaymentRecords: number;
  pendingReviews: number;
  pendingReviewItems: AdminPendingReview[];
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: 'CLIENT' | 'FREELANCER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
  rating: number | null;
  location: string | null;
  profilePictureData?: string | number[] | Uint8Array | null;
  profilePictureType?: string | null;
}

export interface AdminUserPage {
  content: AdminUser[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface AdminUserActivity {
  id: number;
  type: string;
  title: string;
  status: string | null;
  amount: number | null;
  currency: string | null;
  createdAt: string | null;
  relatedUser: string | null;
}

export interface AdminUserDetail extends AdminUser {
  country: string | null;
  about: string | null;
  description: string | null;
  jobTitle: string | null;
  yearExperience: number | null;
  skills: string[];
  profilePictureData?: string | number[] | Uint8Array | null;
  profilePictureType?: string | null;
  gigCount: number;
  projectCount: number;
  hireRequestCount: number;
  totalEarned: number;
  totalSpent: number;
  ekycStatus: 'PENDING' | 'IN_REVIEW' | 'VERIFIED' | 'FAILED' | null;
  ekycFailureReason: string | null;
  recentGigs: AdminUserActivity[];
  recentProjects: AdminUserActivity[];
  recentHireRequests: AdminUserActivity[];
  recentPayments: AdminUserActivity[];
}

export interface AdminSettings {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  identityVerificationRequired: boolean;
  maxLoginAttempts: number;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly baseUrl = `${env.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  dashboard(): Observable<AdminDashboard> {
    return this.http.get<AdminDashboard>(`${this.baseUrl}/dashboard`);
  }

  users(filters: {
    page?: number;
    size?: number;
    role?: string;
    status?: string;
    keyword?: string;
  }): Observable<AdminUserPage> {
    let params = new HttpParams()
      .set('page', String(filters.page ?? 0))
      .set('size', String(filters.size ?? 50));

    if (filters.role && filters.role !== 'ALL') {
      params = params.set('role', filters.role);
    }
    if (filters.status && filters.status !== 'ALL') {
      params = params.set('status', filters.status);
    }
    if (filters.keyword?.trim()) {
      params = params.set('keyword', filters.keyword.trim());
    }

    return this.http.get<AdminUserPage>(`${this.baseUrl}/users`, { params });
  }

  userDetail(id: number): Observable<AdminUserDetail> {
    return this.http.get<AdminUserDetail>(`${this.baseUrl}/users/${id}`);
  }

  updateUserStatus(id: number, status: 'ACTIVE' | 'SUSPENDED' | 'PENDING'): Observable<string> {
    const action = status === 'ACTIVE' ? 'activate' : status === 'SUSPENDED' ? 'suspend' : 'pending';
    return this.http.put(`${this.baseUrl}/users/${id}/${action}`, null, { responseType: 'text' });
  }

  settings(): Observable<AdminSettings> {
    return this.http.get<AdminSettings>(`${this.baseUrl}/settings`);
  }

  saveSettings(settings: AdminSettings): Observable<AdminSettings> {
    return this.http.put<AdminSettings>(`${this.baseUrl}/settings`, settings);
  }

  approveEkyc(ekycId: number): Observable<AdminPendingReview> {
    return this.http.put<AdminPendingReview>(`${this.baseUrl}/ekyc/${ekycId}/approve`, null);
  }

  ekycDetail(ekycId: number): Observable<AdminEkycDetail> {
    return this.http.get<AdminEkycDetail>(`${this.baseUrl}/ekyc/${ekycId}`);
  }

  rejectEkyc(ekycId: number, reason?: string): Observable<AdminPendingReview> {
    let params = new HttpParams();
    if (reason?.trim()) {
      params = params.set('reason', reason.trim());
    }
    return this.http.put<AdminPendingReview>(`${this.baseUrl}/ekyc/${ekycId}/reject`, null, {
      params,
    });
  }
}
