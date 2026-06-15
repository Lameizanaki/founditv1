import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  MessageCircle,
  PackageCheck,
  XCircle,
  LucideAngularModule,
} from 'lucide-angular';
import { ChatService, HireRequestResponse } from '../../../services/chat/chat.service';
import { GigService } from '../../../services/Freelancer/Gig/gig.service';
import { GigResponseDTO } from '../../../services/Freelancer/Gig/GigResponse';
import { FreelancerProfileService } from '../../../services/Freelancer/Profile/freelancer-profile.service';
import { FreelancerProfileResponse } from '../../../services/Freelancer/Profile/freelancer-profile.models';
import {
  PaymentService,
  PaymentTransactionResponse,
} from '../../../services/payment/payment.service';
import { ImageUrlService } from '../../../services/media/image-url.service';

type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'in-progress'
  | 'in-review'
  | 'revision-requested'
  | 'completed'
  | 'cancelled'
  | 'payment-submitted'
  | 'paid'
  | 'failed';

@Component({
  selector: 'app-client-my-order-view-detail-component',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './my-order-view-detail.component.html',
})
export class OrderDetailsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly chatService = inject(ChatService);
  private readonly gigService = inject(GigService);
  private readonly freelancerProfileService = inject(FreelancerProfileService);
  private readonly paymentService = inject(PaymentService);
  private readonly imageUrlService = inject(ImageUrlService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly icons = {
    ArrowLeft,
    CalendarDays,
    CheckCircle2,
    CircleAlert,
    MessageCircle,
    PackageCheck,
    XCircle,
  };

  order = {
    id: '',
    placedOn: 'N/A',
    dueDate: 'N/A',
    overdue: false,
    status: 'pending' as OrderStatus,

    serviceTitle: 'Order details',
    freelancerName: 'Freelancer',
    freelancerJob: '',
    freelancerLocation: '',
    freelancerExperience: 0,
    freelancerAvatar: '',
    rating: 0,
    packageName: 'Package',
    image: '',

    includes: [] as string[],

    packagePrice: 0,
    serviceFee: 0,

    requirementText: '',
  };

  showCancelModal = false;
  showRevisionModal = false;
  isLoading = false;
  isCancelling = false;
  errorMessage = '';
  requestId: number | null = null;
  freelancerId: number | null = null;
  gigId: number | null = null;
  private routeOrderId = '';

  cancelForm = {
    reason: '',
    details: '',
  };

  revisionForm = {
    reason: '',
    details: '',
  };

  get total(): number {
    return this.order.packagePrice + this.order.serviceFee;
  }

  get statusLabel(): string {
    switch (this.order.status) {
      case 'pending':
        return 'Pending';
      case 'accepted':
        return 'Accepted';
      case 'rejected':
        return 'Rejected';
      case 'in-progress':
        return 'In Progress';
      case 'in-review':
        return 'In Review';
      case 'revision-requested':
        return 'Revision Requested';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      case 'payment-submitted':
        return 'Payment Submitted';
      case 'paid':
        return 'Paid';
      case 'failed':
        return 'Failed';
      default:
        return this.order.status;
    }
  }

  get statusClasses(): string {
    switch (this.order.status) {
      case 'pending':
        return 'bg-[#fef3c7] text-[#b45309]';
      case 'accepted':
        return 'bg-[#dcfce7] text-[#16a34a]';
      case 'rejected':
        return 'bg-[#fee2e2] text-[#dc2626]';
      case 'in-progress':
        return 'bg-[#fef3c7] text-[#b45309]';
      case 'in-review':
        return 'bg-[#dbeafe] text-[#2563eb]';
      case 'revision-requested':
        return 'bg-[#ffedd5] text-[#ea580c]';
      case 'completed':
        return 'bg-[#dcfce7] text-[#16a34a]';
      case 'cancelled':
        return 'bg-[#fee2e2] text-[#dc2626]';
      case 'payment-submitted':
        return 'bg-[#dbeafe] text-[#2563eb]';
      case 'paid':
        return 'bg-[#dcfce7] text-[#16a34a]';
      case 'failed':
        return 'bg-[#fee2e2] text-[#dc2626]';
      default:
        return 'bg-[#f3f4f6] text-[#6b7280]';
    }
  }

  get canCancelInstantly(): boolean {
    return this.order.status === 'pending' && !!this.requestId && !this.isCancelling;
  }

  ngOnInit(): void {
    this.routeOrderId = String(this.route.snapshot.paramMap.get('id') ?? '').trim();
    this.requestId = Number(this.routeOrderId) || null;
    this.order.id = this.routeOrderId;
    this.loadOrder();
  }

  private loadOrder(): void {
    if (!this.routeOrderId) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    forkJoin({
      requests: this.chatService.getMyClientHireRequests().pipe(catchError(() => of([]))),
      transactions: this.paymentService.getMyTransactions().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ requests, transactions }) => {
        const transaction = this.findTransaction(transactions ?? []);
        const lookupId =
          this.toNumber(this.routeOrderId) ??
          this.toNumber(transaction?.projectId) ??
          this.toNumber(transaction?.id);

        const request = (requests ?? []).find((item) => {
          if (lookupId === undefined) {
            return false;
          }

          return item.id === lookupId || item.projectId === lookupId;
        });

        if (request) {
          this.applyHireRequest(request);
        }

        if (transaction) {
          this.applyPaymentTransaction(transaction, !!request);
        }

        if (!request && !transaction) {
          this.errorMessage = 'Unable to find this order.';
        }

        this.isLoading = false;
        this.refreshView();
      },
      error: () => {
        this.errorMessage = 'Unable to load this order.';
        this.isLoading = false;
        this.refreshView();
      },
    });
  }

  private applyHireRequest(request: HireRequestResponse): void {
    this.requestId = request.id;
    this.freelancerId = request.freelancerId ?? null;
    this.gigId = request.gigId ?? null;
    this.order.id = this.routeOrderId || String(request.projectId ?? request.id);
    this.order.placedOn = this.formatDate(request.createdAt);
    this.order.dueDate = this.formatDate(request.deadline ?? request.createdAt);
    this.order.overdue = false;
    this.order.status = this.toOrderStatus(request.status);
    this.order.serviceTitle = request.gigTitle || this.order.serviceTitle;
    this.order.freelancerName = request.freelancerId
      ? `Freelancer #${request.freelancerId}`
      : this.order.freelancerName;
    this.order.packagePrice = Number(request.projectAgreedPrice ?? request.agreedPrice ?? 0);
    this.order.serviceFee = 0;
    this.order.requirementText = request.requirements || request.requestMessage || '';

    if (request.gigId) {
      this.loadGigDetails(request.gigId);
    }

    if (request.freelancerId) {
      this.loadFreelancerProfile(request.freelancerId);
    }
  }

  private findTransaction(
    transactions: PaymentTransactionResponse[],
  ): PaymentTransactionResponse | undefined {
    const routeNumber = this.toNumber(this.routeOrderId);

    return transactions.find((transaction) => {
      const tranId = String(transaction.tranId ?? '').trim();
      if (tranId && tranId === this.routeOrderId) {
        return true;
      }

      if (routeNumber === undefined) {
        return false;
      }

      return (
        this.toNumber(transaction.id) === routeNumber ||
        this.toNumber(transaction.projectId) === routeNumber
      );
    });
  }

  private applyPaymentTransaction(
    transaction: PaymentTransactionResponse,
    hasRequestData: boolean,
  ): void {
    this.order.id =
      transaction.tranId?.trim() ||
      (transaction.projectId ? String(transaction.projectId) : this.order.id);
    this.freelancerId = transaction.freelancerId ?? this.freelancerId;
    this.order.serviceTitle = transaction.projectTitle?.trim() || this.order.serviceTitle;
    this.order.freelancerName = transaction.freelancerName?.trim() || this.order.freelancerName;
    this.order.packagePrice = Number(transaction.amount ?? this.order.packagePrice) || 0;
    this.order.serviceFee = 0;
    this.order.placedOn = this.formatDate(transaction.createdAt ?? transaction.submittedAt ?? undefined);

    this.order.status = this.toOrderStatusFromPayment(transaction.status);

    if (!hasRequestData || !this.order.requirementText) {
      this.order.requirementText =
        transaction.manualStatusMessage?.trim() ||
        transaction.proofReference?.trim() ||
        'Payment transaction details are shown from your submitted payment.';
    }

    const avatar = this.buildImageSource(
      transaction.freelancerProfilePictureData,
      transaction.freelancerProfilePictureType,
      transaction.freelancerProfilePictureUrl,
    );

    if (avatar) {
      this.order.freelancerAvatar = avatar;
    }

    if (transaction.freelancerId) {
      this.loadFreelancerProfile(transaction.freelancerId);
    }
  }

  private loadGigDetails(gigId: number): void {
    this.gigService.getClientGigById(gigId).subscribe({
      next: (gig) => {
        this.applyGigDetails(gig);
        this.refreshView();
      },
      error: () => {
        // Keep request data visible if gig details cannot be loaded.
      },
    });
  }

  private applyGigDetails(gig: GigResponseDTO): void {
    this.order.serviceTitle =
      gig.serviceTitle?.trim() || gig.packageDescription?.trim() || this.order.serviceTitle;
    this.order.freelancerName =
      gig.freelancerName?.trim() || gig.seller?.trim() || this.order.freelancerName;
    this.order.rating = Number(gig.rating ?? this.order.rating) || this.order.rating;
    this.order.packageName = this.formatPackageName(gig.paymentChoice) || this.order.packageName;
    this.order.packagePrice = Number(gig.price ?? this.order.packagePrice) || this.order.packagePrice;
    this.order.dueDate = this.formatDeliveryDate(gig.deliveryDate) || this.order.dueDate;

    const includes = [
      gig.packageDescription,
      gig.deliveryDate ? `${gig.deliveryDate} days delivery` : '',
      gig.rivision ? `${gig.rivision} revisions` : '',
      ...(gig.tags ?? []),
    ]
      .map((item) => String(item ?? '').trim())
      .filter(Boolean);

    if (includes.length) {
      this.order.includes = includes;
    }

    const image = this.imageUrlService.fromDataOrUrl(
      gig.gigMainImageData,
      gig.gigMainImageContentType,
      gig.gigMainImageUrl,
    );

    if (image) {
      this.order.image = image;
    }
  }

  private loadFreelancerProfile(freelancerId: number): void {
    this.freelancerProfileService.getClientProfile(freelancerId).subscribe({
      next: (profile) => {
        this.applyFreelancerProfile(profile);
        this.refreshView();
      },
      error: () => {
        // Gig and request data still provide a usable fallback.
      },
    });
  }

  private applyFreelancerProfile(profile: FreelancerProfileResponse): void {
    this.order.freelancerName = profile.freelancerName?.trim() || this.order.freelancerName;
    this.order.freelancerJob = profile.freelancerJob?.trim() || '';
    this.order.freelancerLocation = profile.workLocation?.trim() || '';
    this.order.freelancerExperience = Number(profile.yearExperience ?? 0) || 0;
    this.order.rating = Number(profile.rating ?? this.order.rating) || this.order.rating;

    const avatar = this.imageUrlService.fromDataOrUrl(
      typeof profile.profilePictureData === 'string' ? profile.profilePictureData : '',
      profile.profilePictureType,
      profile.profilePictureUrl,
    );

    if (avatar) {
      this.order.freelancerAvatar = avatar;
    }
  }

  get freelancerInitials(): string {
    return this.order.freelancerName
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  private formatPackageName(value?: string): string {
    const normalized = value?.trim();
    return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : '';
  }

  private formatDeliveryDate(value?: string): string {
    const days = Number(value);
    if (!Number.isFinite(days) || days <= 0) {
      return '';
    }

    const due = new Date();
    due.setDate(due.getDate() + days);
    return due.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  private toImageSource(data: string, contentType?: string | null): string {
    const mime = contentType?.trim() || 'image/jpeg';
    return `data:${mime};base64,${data}`;
  }

  private buildImageSource(
    data?: string | number[] | Uint8Array | null,
    contentType?: string | null,
    url?: string | null,
  ): string {
    const imageUrl = this.imageUrlService.resolve(url);
    if (imageUrl) {
      return imageUrl;
    }

    let imageData = '';

    if (typeof data === 'string') {
      imageData = data.trim();
    } else if (data instanceof Uint8Array) {
      imageData = this.bytesToBase64(data);
    } else if (Array.isArray(data)) {
      imageData = this.bytesToBase64(new Uint8Array(data));
    }

    if (!imageData) {
      return '';
    }

    if (imageData.startsWith('data:') || /^https?:\/\//i.test(imageData) || imageData.startsWith('/')) {
      return this.imageUrlService.resolve(imageData);
    }

    return this.toImageSource(imageData, contentType);
  }

  private bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index]);
    }
    return btoa(binary);
  }

  private toOrderStatus(status?: string): OrderStatus {
    switch ((status ?? '').toLowerCase()) {
      case 'accepted':
        return 'accepted';
      case 'rejected':
        return 'rejected';
      case 'cancelled':
      case 'canceled':
        return 'cancelled';
      case 'pending':
      default:
        return 'pending';
    }
  }

  private toOrderStatusFromPayment(status?: string): OrderStatus {
    switch (String(status ?? '').trim().toUpperCase()) {
      case 'PAID':
        return 'paid';
      case 'FAILED':
        return 'failed';
      case 'CANCELLED':
        return 'cancelled';
      case 'PAYMENT_SUBMITTED':
        return 'payment-submitted';
      case 'PENDING':
      default:
        return 'pending';
    }
  }

  private formatDate(value?: string): string {
    if (!value) {
      return 'N/A';
    }

    return new Date(value).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  private toNumber(value: unknown): number | undefined {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  }

  goBack(): void {
    this.router.navigate(['/client/my-orders']);
  }

  messageFreelancer(): void {
    if (!this.freelancerId) {
      return;
    }

    this.router.navigate(['/client/chat'], {
      state: {
        freelancerId: this.freelancerId,
        gigId: this.gigId,
        requestId: this.requestId,
      },
    });
  }

  openCancelModal(): void {
    if (this.canCancelInstantly) {
      this.submitCancellation();
      return;
    }

    this.showCancelModal = true;
  }

  closeCancelModal(): void {
    this.showCancelModal = false;
    this.cancelForm = {
      reason: '',
      details: '',
    };
  }

  submitCancellation(): void {
    if (!this.requestId) {
      return;
    }

    this.isCancelling = true;
    this.errorMessage = '';
    this.chatService.cancelHireRequest(this.requestId).subscribe({
      next: (request) => {
        this.applyHireRequest(request);
        this.showCancelModal = false;
        this.isCancelling = false;
        this.refreshView();
      },
      error: () => {
        this.errorMessage = 'Only pending orders can be cancelled.';
        this.showCancelModal = false;
        this.isCancelling = false;
        this.refreshView();
      },
    });
  }

  openRevisionModal(): void {
    this.showRevisionModal = true;
  }

  closeRevisionModal(): void {
    this.showRevisionModal = false;
    this.revisionForm = {
      reason: '',
      details: '',
    };
  }

  submitRevision(): void {
    console.log('Revision submitted');
    this.order.status = 'revision-requested';
    this.showRevisionModal = false;
    this.refreshView();
  }

  private refreshView(): void {
    window.setTimeout(() => this.cdr.detectChanges(), 0);
  }

}
