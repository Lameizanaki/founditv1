import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { env } from '../../../environments/env';
import { NotificationRefreshService } from '../notification/notification-refresh.service';
import { NotificationPreferenceService } from '../notification/notification-preference.service';

export interface ManualPaymentSubmitResponse {
  tran_id?: string;
  tranId?: string;
  message?: string;
  paymentMethod?: string;
  orderId?: string;
  status?: string;
  manualStatusCode?: string;
}

export interface PaymentTransactionResponse {
  id?: number;
  tranId?: string;
  amount?: number;
  currency?: string;
  status?: 'PENDING' | 'PAYMENT_SUBMITTED' | 'PAID' | 'FAILED' | 'CANCELLED' | 'UNKNOWN' | string;
  projectId?: number;
  projectTitle?: string;
  clientName?: string;
  freelancerId?: number;
  freelancerName?: string;
  freelancerProfilePictureData?: string | number[] | Uint8Array | null;
  freelancerProfilePictureUrl?: string | null;
  freelancerProfilePictureType?: string | null;
  sellerPaymentAccount?: string | null;
  paymentMethod?: string | null;
  proofReference?: string | null;
  proofFileName?: string | null;
  proofFileType?: string | null;
  hasProofFile?: boolean | null;
  manualStatusCode?: string | null;
  manualStatusMessage?: string | null;
  confirmedReference?: string | null;
  createdAt?: string | null;
  submittedAt?: string | null;
  paidAt?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly notificationRefreshService = inject(NotificationRefreshService);
  private readonly notificationPreferenceService = inject(NotificationPreferenceService);
  private readonly baseUrl = `${env.apiUrl}/payment`;

  submitManualProjectPayment(
    projectId: number | string,
    reference: string,
    proofFile: File | null,
  ): Observable<ManualPaymentSubmitResponse> {
    const formData = new FormData();
    if (reference.trim()) {
      formData.append('reference', reference.trim());
    }
    if (proofFile) {
      formData.append('proof', proofFile);
    }

    return this.http.post<ManualPaymentSubmitResponse>(
      `${this.baseUrl}/client/project/${projectId}/pay`,
      formData,
    );
  }

  getSellerPaymentQr(projectId: number | string): Observable<{
    hasSellerQr?: boolean | null;
    bankQrType?: string | null;
    bankQrName?: string | null;
  }> {
    return this.http.get<{
      hasSellerQr?: boolean | null;
      bankQrType?: string | null;
      bankQrName?: string | null;
    }>(`${this.baseUrl}/client/project/${projectId}/seller-qr`);
  }

  getSellerPaymentQrByGig(gigId: number | string): Observable<{
    hasSellerQr?: boolean | null;
    bankQrType?: string | null;
    bankQrName?: string | null;
  }> {
    return this.http.get<{
      hasSellerQr?: boolean | null;
      bankQrType?: string | null;
      bankQrName?: string | null;
    }>(`${this.baseUrl}/client/gig/${gigId}/seller-qr`);
  }

  downloadSellerPaymentQr(projectId: number | string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/client/project/${projectId}/seller-qr/image`, {
      responseType: 'blob',
    });
  }

  downloadSellerPaymentQrByGig(gigId: number | string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/client/gig/${gigId}/seller-qr/image`, {
      responseType: 'blob',
    });
  }

  confirmManualPayment(tranId: string): Observable<PaymentTransactionResponse> {
    return this.http.post<PaymentTransactionResponse>(
      `${this.baseUrl}/freelancer/${encodeURIComponent(tranId)}/confirm`,
      {},
    );
  }

  downloadManualPaymentProof(tranId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/freelancer/${encodeURIComponent(tranId)}/proof`, {
      responseType: 'blob',
    });
  }

  checkStatus(tranId: string): Observable<PaymentTransactionResponse> {
    return this.http.get<PaymentTransactionResponse>(`${this.baseUrl}/${tranId}/status`).pipe(
      tap((transaction) => {
        if (
          transaction.status === 'PAID' &&
          this.notificationPreferenceService.isEnabled('freelancer', 'orderUpdates')
        ) {
          this.notificationRefreshService.requestRefresh();
        }
      }),
    );
  }

  getMyTransactions(): Observable<PaymentTransactionResponse[]> {
    return this.http.get<PaymentTransactionResponse[]>(`${this.baseUrl}/my-transactions`);
  }

  getFreelancerTransactions(): Observable<PaymentTransactionResponse[]> {
    return this.http.get<PaymentTransactionResponse[]>(
      `${this.baseUrl}/freelancer/my-transactions`,
    );
  }

  exportFreelancerStatement(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/freelancer/export-statement`, {
      responseType: 'blob',
    });
  }

}
