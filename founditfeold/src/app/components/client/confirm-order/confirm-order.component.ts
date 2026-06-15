import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, interval, startWith, switchMap, takeWhile } from 'rxjs';
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  CircleAlert,
  CircleDollarSign,
  Clock3,
  MessageCircle,
  PackageCheck,
  RefreshCcw,
  X,
  Send,
  LucideAngularModule,
} from 'lucide-angular';
import { PaymentService } from '../../../services/payment/payment.service';
import { ChatService } from '../../../services/chat/chat.service';
import { GigService } from '../../../services/Freelancer/Gig/gig.service';
import { GigResponseDTO } from '../../../services/Freelancer/Gig/GigResponse';

type OrderMode = 'request' | 'pay';

interface IncludedItem {
  label: string;
}

type PackageType = 'basic' | 'standard' | 'premium';

type StoredPricingPackage = {
  type?: unknown;
  price?: unknown;
  deliveryDate?: unknown;
  rivision?: unknown;
  packageDescription?: unknown;
};

@Component({
  selector: 'app-client-confirm-order-component',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './confirm-order.component.html',
})
export class ConfirmOrderComponent implements OnInit, OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);
  private router = inject(Router);
  private readonly paymentService = inject(PaymentService);
  private readonly chatService = inject(ChatService);
  private readonly gigService = inject(GigService);

  readonly icons = {
    ArrowLeft,
    BadgeCheck,
    Check,
    CircleAlert,
    CircleDollarSign,
    Clock3,
    MessageCircle,
    PackageCheck,
    RefreshCcw,
    X,
    Send,
  };

  mode: OrderMode = 'request';
  projectId: number | null = null;
  sellerQrImageUrl = '';
  isLoadingSellerQr = false;
  sellerQrError = '';
  private sellerQrObjectUrl = '';
  paymentTranId = '';
  paymentStatus: 'idle' | 'submitted' | 'paid' | 'failed' = 'idle';
  paidAt: string | null = null;
  paymentReference = '';
  selectedProofFile: File | null = null;
  selectedProofFileName = '';
  isSubmitting = false;
  submitError = '';
  private paymentStatusSubscription?: Subscription;

  freelancerId: number | null = null;
  gigId: number | null = null;
  requestStatus: 'pending' | 'accepted' | 'rejected' | 'cancelled' = 'pending';
  requestId: number | null = null;
  requestMessage = '';
  requestSent = false;
  deadline = '';

  projectRequirements = '';

  order = {
    title: 'Modern UI/UX App Design',
    freelancer: 'Freelancer',
    rating: 0,
    packageName: 'Package',
    price: 0,
    serviceFee: 0,
    deliveryTime: 'N/A',
    revisions: 0,
    image: '',
    included: [] as IncludedItem[],
  };

  get total(): number {
    return this.order.price + this.order.serviceFee;
  }

  get isPaymentLocked(): boolean {
    return this.mode === 'request' && this.requestStatus !== 'accepted';
  }

  get canSendRequest(): boolean {
    return !!localStorage.getItem('token') && !this.isSubmitting;
  }

  ngOnInit(): void {
    this.gigId = this.toNullableNumber(this.route.snapshot.paramMap.get('id')) ?? this.gigId;
    this.loadGigDetailsFromServer();
    this.refreshHireRequestStateFromServer();
    this.refreshExistingPaymentState();
    this.loadSellerPaymentQr();
  }

  ngOnDestroy(): void {
    this.paymentStatusSubscription?.unsubscribe();
    this.revokeSellerQrObjectUrl();
  }

  constructor() {
    const state = history.state as { order?: any } | undefined;
    if (state?.order) {
      const incoming = state.order;
      this.order.title = incoming.gig?.serviceTitle ?? this.order.title;
      this.order.freelancer = incoming.freelancer?.freelancerName ?? this.order.freelancer;
      this.order.price = incoming.price ?? this.order.price;
      this.order.included =
        incoming.gig?.tags?.map((t: string) => ({ label: t })) ?? this.order.included;
      this.order.packageName = this.resolvePackageName(incoming.package ?? this.order.packageName);
      if (incoming.gig?.gigMainImageData) {
        this.order.image = this.toImageSource(
          incoming.gig.gigMainImageData,
          incoming.gig.gigMainImageContentType,
        );
      }

      this.mode = incoming.mode === 'pay' ? 'pay' : 'request';
      this.projectId = this.toNullableNumber(incoming.projectId ?? incoming.project?.id);
      this.paymentTranId = incoming.tranId ?? '';
      this.freelancerId = this.toNullableNumber(incoming.freelancer?.id ?? incoming.freelancerId);
      this.gigId = this.toNullableNumber(incoming.gig?.id ?? incoming.gigId);
      this.requestStatus = incoming.requestStatus ?? 'pending';

      if (incoming.price != null) {
        this.order.price = this.toNumber(incoming.price);
      }
    }
  }

  private refreshHireRequestStateFromServer(): void {
    if (!localStorage.getItem('token')) {
      return;
    }

    this.chatService.getMyClientHireRequests().subscribe({
      next: (requests) => {
        const matchedRequest = (requests ?? []).find((request) =>
          this.matchesClientHireRequest(request),
        );

        if (!matchedRequest) {
          return;
        }

        this.requestId = matchedRequest.id;
        this.requestSent = true;
        this.requestStatus = matchedRequest.status ?? this.requestStatus;

        if (matchedRequest.projectId) {
          this.projectId = matchedRequest.projectId;
          this.refreshExistingPaymentState();
          this.loadSellerPaymentQr();
        }

        if (matchedRequest.gigId) {
          this.gigId = matchedRequest.gigId;
        }

        if (matchedRequest.gigTitle) {
          this.order.title = matchedRequest.gigTitle;
        }

        if (matchedRequest.requestMessage) {
          this.requestMessage = matchedRequest.requestMessage;
        }

        if (matchedRequest.requirements) {
          this.projectRequirements = matchedRequest.requirements;
        }

        if (matchedRequest.deadline) {
          this.deadline = matchedRequest.deadline;
        }

        const finalPrice = this.toNumber(matchedRequest.projectAgreedPrice);
        const proposedPrice = this.toNumber(matchedRequest.agreedPrice);
        if (finalPrice > 0) {
          this.order.price = finalPrice;
        } else if (proposedPrice > 0) {
          this.order.price = proposedPrice;
        }

        if (this.requestStatus === 'accepted') {
          this.requestSent = true;
        }

        this.cdr.detectChanges();
      },
      error: () => {
        // ignore and keep any router-state values
      },
    });
  }

  private loadGigDetailsFromServer(): void {
    if (!this.gigId) {
      return;
    }

    this.gigService.getClientGigById(this.gigId).subscribe({
      next: (gig) => {
        this.applyGigDetails(gig);
        if (this.mode === 'pay' && !this.sellerQrImageUrl && !this.isLoadingSellerQr) {
          this.loadSellerPaymentQr();
        }
        this.cdr.detectChanges();
      },
      error: () => {
        // Keep any router-state data if the fetch fails.
      },
    });
  }

  private refreshExistingPaymentState(): void {
    if (!localStorage.getItem('token') || !this.projectId) {
      return;
    }

    this.paymentService.getMyTransactions().subscribe({
      next: (transactions) => {
        const submittedTransaction = (transactions ?? []).find(
          (transaction) =>
            transaction.projectId === this.projectId && transaction.status === 'PAYMENT_SUBMITTED',
        );
        const paidTransaction = (transactions ?? []).find(
          (transaction) => transaction.projectId === this.projectId && transaction.status === 'PAID',
        );

        if (!paidTransaction && !submittedTransaction) {
          return;
        }

        this.mode = 'pay';
        if (paidTransaction) {
          this.paymentStatus = 'paid';
          this.paymentTranId = paidTransaction.tranId ?? this.paymentTranId;
          this.paidAt = paidTransaction.paidAt ?? null;
          this.paymentStatusSubscription?.unsubscribe();
        } else if (submittedTransaction) {
          this.paymentStatus = 'submitted';
          this.paymentTranId = submittedTransaction.tranId ?? this.paymentTranId;
          if (this.paymentTranId) {
            this.startPaymentStatusPolling(this.paymentTranId);
          }
        }
        this.cdr.detectChanges();
      },
      error: () => {
        // Keep the payment page usable if history cannot be loaded.
      },
    });
  }

  private applyGigDetails(gig: GigResponseDTO): void {
    const selectedPackage = this.resolvePackageType(this.order.packageName || gig.paymentChoice);
    const selectedPricing = this.getPackageForType(gig, selectedPackage);
    const price = selectedPricing.price;
    const packageName = this.resolvePackageName(selectedPackage);
    const included = (gig.tags ?? []).map((tag) => ({ label: tag }));

    this.order = {
      ...this.order,
      title: gig.serviceTitle?.trim() || selectedPricing.title || this.order.title,
      freelancer: gig.freelancerName?.trim() || gig.seller?.trim() || this.order.freelancer,
      rating: this.toNumber(gig.rating),
      packageName,
      price: price > 0 ? price : this.order.price,
      deliveryTime: this.toDeliveryText(selectedPricing.deliveryDate),
      revisions: selectedPricing.revisions,
      included: included.length > 0 ? included : this.order.included,
      image: gig.gigMainImageData
        ? this.toImageSource(gig.gigMainImageData, gig.gigMainImageContentType)
        : this.order.image,
    };
  }

  private getPackageForType(
    gig: GigResponseDTO,
    type: PackageType,
  ): {
    title: string;
    price: number;
    deliveryDate: number;
    revisions: number;
  } {
    const packages = this.getStoredPricingPackages(gig);
    const matched = packages.find((item) => this.resolvePackageType(item.type) === type);

    if (matched) {
      return {
        title: this.toStringSafe(matched.packageDescription),
        price: this.toNumber(matched.price),
        deliveryDate: this.toNumber(matched.deliveryDate),
        revisions: this.toNumber(matched.rivision),
      };
    }

    return {
      title: gig.packageDescription?.trim() || '',
      price: this.toNumber(gig.price),
      deliveryDate: this.toNumber(gig.deliveryDate),
      revisions: this.toNumber(gig.rivision),
    };
  }

  private getStoredPricingPackages(gig: GigResponseDTO): StoredPricingPackage[] {
    const raw = gig.pricingPackagesJson;
    if (!raw?.trim()) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed)
        ? parsed.filter(
            (item): item is StoredPricingPackage => Boolean(item) && typeof item === 'object',
          )
        : [];
    } catch {
      return [];
    }
  }

  private resolvePackageName(value: unknown): string {
    const normalized = this.toStringSafe(value).toLowerCase();
    if (!normalized) {
      return this.order.packageName;
    }

    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  private resolvePackageType(value: unknown): PackageType {
    const normalized = this.toStringSafe(value).toLowerCase();
    if (normalized === 'premium' || normalized === 'standard') {
      return normalized;
    }

    return 'basic';
  }

  private toDeliveryText(value: unknown): string {
    const numeric = this.toNumber(value);
    return numeric > 0 ? `${numeric} days` : this.order.deliveryTime;
  }

  private toStringSafe(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private matchesClientHireRequest(request: {
    projectId?: number;
    gigId?: number;
    gigTitle?: string;
  }): boolean {
    if (this.projectId && request.projectId && this.projectId === request.projectId) {
      return true;
    }

    if (this.gigId && request.gigId && this.gigId === request.gigId) {
      return true;
    }

    if (request.gigTitle && this.order.title) {
      return request.gigTitle.trim().toLowerCase() === this.order.title.trim().toLowerCase();
    }

    return false;
  }

  private toImageSource(data: string, contentType?: string | null): string {
    const mime = contentType?.trim() || 'image/jpeg';
    return `data:${mime};base64,${data}`;
  }

  goBack(): void {
    console.log('Back to gig');
  }

  confirmOrder(): void {
    if (this.mode === 'request') {
      if (this.requestSent && this.requestStatus === 'accepted') {
        if (!this.projectId) {
          this.submitError = 'Project ID is missing. Please reopen the payment page from chat.';
          return;
        }

        this.mode = 'pay';
        this.submitError = '';
        this.loadSellerPaymentQr();
        this.refreshExistingPaymentState();
        this.cdr.detectChanges();
        return;
      }

      if (!this.gigId) {
        this.submitError = 'Gig ID is missing. Please reopen this order page.';
        return;
      }

      this.router.navigate(
        ['/client/browse-gigs/gig', this.gigId, 'confirm-order', 'success-order'],
        {
          state: {
            orderId: this.generateOrderId(),
            mode: 'request',
            order: this.order,
            freelancerId: this.freelancerId,
            gigId: this.gigId,
            requestId: this.requestId,
            projectId: this.projectId,
          },
        },
      );
      return;
    }

    if (!this.projectId) {
      console.log('Missing project id for payment.');
      return;
    }

    if (this.paymentStatus === 'paid') {
      this.navigateToPaymentSuccess(this.paymentTranId);
      return;
    }

    if (!this.paymentReference.trim() && !this.selectedProofFile) {
      this.submitError = 'Upload a payment screenshot or enter a transaction reference.';
      return;
    }

    this.isSubmitting = true;
    this.submitError = '';

    this.paymentService
      .submitManualProjectPayment(this.projectId, this.paymentReference, this.selectedProofFile)
      .subscribe({
      next: (response) => {
        const tranId = response.tran_id ?? response.tranId ?? '';
        this.paymentTranId = tranId;
        this.paymentStatus = tranId ? 'submitted' : 'idle';

        if (tranId) {
          this.startPaymentStatusPolling(tranId);
        }

        this.cdr.detectChanges();
      },
      error: () => {
        this.submitError = 'Failed to submit payment proof. Please try again.';
      },
      complete: () => {
        this.isSubmitting = false;
      },
    });
  }

  onProofSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedProofFile = file;
    this.selectedProofFileName = file?.name ?? '';
    this.submitError = '';
  }

  private loadSellerPaymentQr(): void {
    if (!localStorage.getItem('token')) {
      return;
    }

    const qrRequest = this.projectId
      ? this.paymentService.downloadSellerPaymentQr(this.projectId)
      : this.gigId
        ? this.paymentService.downloadSellerPaymentQrByGig(this.gigId)
        : null;

    if (!qrRequest) {
      this.sellerQrImageUrl = '';
      this.sellerQrError = 'Unable to load seller QR because the gig or project is missing.';
      this.cdr.detectChanges();
      return;
    }

    this.isLoadingSellerQr = true;
    this.sellerQrError = '';
    this.revokeSellerQrObjectUrl();
    this.sellerQrImageUrl = '';

    qrRequest.subscribe({
      next: (blob) => {
        this.sellerQrObjectUrl = blob && blob.size > 0 ? URL.createObjectURL(blob) : '';
        this.sellerQrImageUrl = this.sellerQrObjectUrl;
        this.sellerQrError = this.sellerQrImageUrl ? '' : 'The seller has not uploaded a bank QR yet.';
        this.isLoadingSellerQr = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.sellerQrImageUrl = '';
        this.sellerQrError = 'The seller has not uploaded a bank QR yet.';
        this.isLoadingSellerQr = false;
        this.cdr.detectChanges();
      },
    });
  }

  private revokeSellerQrObjectUrl(): void {
    if (!this.sellerQrObjectUrl) {
      return;
    }

    URL.revokeObjectURL(this.sellerQrObjectUrl);
    this.sellerQrObjectUrl = '';
  }

  private startPaymentStatusPolling(tranId: string): void {
    this.paymentStatusSubscription?.unsubscribe();
    this.paymentStatusSubscription = interval(3000)
      .pipe(
        startWith(0),
        switchMap(() => this.paymentService.checkStatus(tranId)),
        takeWhile((transaction) => transaction.status !== 'PAID', true),
      )
      .subscribe({
        next: (transaction) => {
          if (transaction.status === 'PAID') {
            this.paymentStatus = 'paid';
            this.paidAt = transaction.paidAt ?? null;
            this.paymentStatusSubscription?.unsubscribe();
            this.navigateToPaymentSuccess(transaction.tranId ?? tranId, transaction.projectId);
            return;
          }

          if (transaction.status === 'FAILED' || transaction.status === 'CANCELLED') {
            this.paymentStatus = 'failed';
            this.submitError = 'Payment was not confirmed. Please contact the seller.';
            this.paymentStatusSubscription?.unsubscribe();
          }

          this.cdr.detectChanges();
        },
        error: () => {
          // Keep the QR visible; the user can retry status by regenerating or refreshing.
        },
      });
  }

  private navigateToPaymentSuccess(tranId: string, projectId: number | null = this.projectId): void {
    this.router.navigate(['/client/browse-gigs/gig', this.gigId, 'confirm-order', 'success-order'], {
      state: {
        orderId: tranId || this.generateOrderId(),
        mode: 'pay',
        order: this.order,
        freelancerId: this.freelancerId,
        gigId: this.gigId,
        requestId: this.requestId,
        projectId,
      },
    });
  }

  private generateOrderId(): string {
    // Generate a unique order ID (or fetch from backend)
    return Date.now().toString();
  }

  contactFreelancer(): void {
    if (!this.freelancerId) return;
    this.router.navigate(['/client/chat'], {
      state: {
        freelancerId: this.freelancerId,
        gigId: this.gigId,
      },
    });
  }

  sendRequest(): void {
    if (!localStorage.getItem('token')) {
      this.submitError = 'Please sign in again before sending a request.';
      return;
    }

    if (!this.freelancerId) {
      console.log('Freelancer ID is missing.');
      return;
    }

    if (!this.gigId) {
      this.submitError = 'Gig ID is missing. Please reopen this order page.';
      return;
    }

    if (!this.deadline) {
      this.submitError = 'Please set a project deadline before sending the request.';
      return;
    }

    this.isSubmitting = true;
    this.submitError = '';

    this.chatService
      .sendHireRequest(
        this.gigId,
        this.freelancerId,
        this.requestMessage,
        this.projectRequirements,
        this.order.price,
        null,
        this.deadline,
      )
      .subscribe({
        next: (response) => {
          this.requestSent = true;
          this.requestId = response.id;
          this.requestStatus = response.status ?? 'pending';

          this.isSubmitting = false;
          this.router.navigate(['/client/chat'], {
            state: {
              requestId: response.id,
              gigId: response.gigId ?? this.gigId,
              freelancerId: response.freelancerId ?? this.freelancerId,
            },
          });
        },
        error: (error: { status?: number }) => {
          if (error?.status === 401) {
            this.submitError = 'Your session expired. Please sign in again and resend the request.';
            this.isSubmitting = false;
            return;
          }

          console.log('Failed to send request. Please try again.');
          this.submitError = 'Failed to send request. Please try again.';
          this.isSubmitting = false;
        },
      });
  }

  acceptRequest(): void {
    this.requestStatus = 'accepted';
  }

  rejectRequest(): void {
    this.requestStatus = 'rejected';
  }

  private toNumber(value: unknown): number {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  private toNullableNumber(value: unknown): number | null {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
  }
}
