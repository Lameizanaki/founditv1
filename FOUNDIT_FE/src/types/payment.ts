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
  status?: "PENDING" | "PAYMENT_SUBMITTED" | "PAID" | "FAILED" | "CANCELLED" | "UNKNOWN" | string;
  projectId?: number;
  projectTitle?: string;
  clientName?: string;
  freelancerId?: number;
  freelancerName?: string;
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
