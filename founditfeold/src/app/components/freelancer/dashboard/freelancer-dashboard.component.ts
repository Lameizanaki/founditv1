import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import {
  Plus,
  User,
  DollarSign,
  BriefcaseBusiness,
  Eye,
  Star,
  Box,
  ShoppingBag,
  PlusSquare,
  ChevronRight,
  LayoutGrid,
  FileText,
  Wallet,
  X,
  LucideAngularModule,
} from 'lucide-angular';
import { env } from '../../../../environments/env';
import { FreelancerProfileService } from '../../../services/Freelancer/Profile/freelancer-profile.service';
import {
  PaymentService,
  PaymentTransactionResponse,
} from '../../../services/payment/payment.service';

type ServiceStatus = 'Active' | 'Paused';
type OrderStatus = 'In Progress' | 'In Review';
type WithdrawSpeed = 'instant' | 'standard';

type ProjectStatus =
  | 'PRICE_PENDING'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'COMPLETED'
  | 'DELIVERED'
  | 'REVISION_REQUESTED'
  | 'REVISION_REJECTED'
  | 'CANCELLED';

interface ProjectResponse {
  id: number;
  clientId?: number;
  clientName?: string;
  gigId?: number;
  gigTitle?: string;
  projectTitle?: string;
  agreedPrice?: number;
  deadline?: string;
  status?: ProjectStatus;
  createdAt?: string;
  updatedAt?: string;
}

interface HireRequestResponse {
  id: number;
  clientId?: number;
  clientName?: string;
  gigTitle?: string;
  projectId?: number;
  agreedPrice?: number;
  projectAgreedPrice?: number;
  projectStatus?: ProjectStatus | string;
  deadline?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface DashboardOrder {
  title: string;
  client: string;
  dueDate: string;
  price: number;
  status: OrderStatus;
}

interface EarningsSummary {
  thisMonth: number;
  pendingClearance: number;
  availableForWithdrawal: number;
  lastPaidAmount: number;
  lastPaidAt: string;
}

interface PendingPayment {
  tranId: string;
  projectTitle: string;
  clientName: string;
  amount: number;
  currency: string;
  submittedAt: string;
  proofReference?: string | null;
  proofFileName?: string | null;
  hasProofFile?: boolean | null;
}

@Component({
  selector: 'app-freelancer-dashboard',
  templateUrl: './freelancer-dashboard.component.html',
  imports: [CommonModule, LucideAngularModule, FormsModule, RouterLink],
})
export class FreelancerDashboardComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private profileService = inject(FreelancerProfileService);
  private paymentService = inject(PaymentService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private readonly apiUrl = env.apiUrl;
  readonly icons = {
    Plus,
    User,
    DollarSign,
    BriefcaseBusiness,
    Eye,
    Star,
    Box,
    ShoppingBag,
    PlusSquare,
    ChevronRight,
    LayoutGrid,
    FileText,
    Wallet,
    X,
  };

  totalEarnings = 0;
  availableBalance = 0;
  profileViews = 0;
  avgRating = 0;
  isWithdrawModalOpen = false;
  withdrawError = '';
  dashboardError = '';
  loadingOrders = true;
  loadingEarnings = true;
  confirmingPaymentId = '';
  downloadingProofId = '';

  paymentMethods: string[] = ['PayPal', 'Bank Account'];
  pendingPayments: PendingPayment[] = [];

  withdrawForm: {
    method: string;
    amount: number;
    speed: WithdrawSpeed;
  } = {
    method: '',
    amount: 0,
    speed: 'instant',
  };

  earningsSummary: EarningsSummary = {
    thisMonth: 0,
    pendingClearance: 0,
    availableForWithdrawal: 0,
    lastPaidAmount: 0,
    lastPaidAt: '',
  };

  stats = [
    {
      label: 'Total Earnings',
      value: '$0',
      badge: '+12%',
      badgeClass: 'bg-[#f3f4f6] text-[#6b7280]',
      icon: DollarSign,
      iconBg: 'bg-[#dcfce7]',
      iconColor: 'text-[#16a34a]',
    },
    {
      label: 'Active Orders',
      value: '0',
      badge: '2 new',
      badgeClass: 'bg-[#f3f4f6] text-[#6b7280]',
      icon: BriefcaseBusiness,
      iconBg: 'bg-[#f3e8ff]',
      iconColor: 'text-[#9333ea]',
    },
    {
      label: 'Profile Views',
      value: '1,204',
      badge: '+5%',
      badgeClass: 'bg-[#f3f4f6] text-[#6b7280]',
      icon: Eye,
      iconBg: 'bg-[#e0e7ff]',
      iconColor: 'text-[#4f46e5]',
    },
    {
      label: 'Avg. Rating',
      value: '4.9',
      badge: 'Top Rated',
      badgeClass: 'bg-[#f3f4f6] text-[#6b7280]',
      icon: Star,
      iconBg: 'bg-[#fef3c7]',
      iconColor: 'text-[#d97706]',
    },
  ];

  services: Array<{
    title: string;
    views: number;
    orders: number;
    rating: number;
    price: number;
    status: ServiceStatus;
    image: string;
  }> = [];

  orders: DashboardOrder[] = [];

  ngOnInit(): void {
    this.loadActiveServices();
    this.loadActiveOrdersAndEarnings();
  }

  get previewServices(): Array<{
    title: string;
    views: number;
    orders: number;
    rating: number;
    price: number;
    status: ServiceStatus;
    image: string;
  }> {
    return this.services.slice(0, 6);
  }

  get hasMoreServices(): boolean {
    return this.services.length > 6;
  }

  private loadActiveServices(): void {
    forkJoin({
      profile: this.profileService.ensureMyProfile(),
      sidebar: this.profileService.ensureMyRightSidebar().pipe(catchError(() => of(null))),
      reviews: this.profileService.getMyReviews().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ profile, sidebar, reviews }) => {
        const response = profile;
        const active = response.activeService ?? [];
        this.services = active.map((service: unknown, index: number) => {
          const record = (service && typeof service === 'object' ? service : {}) as Record<
            string,
            unknown
          >;
          const priceValue = Number(record['price'] ?? 0);
          const imageData =
            typeof record['gigMainImageData'] === 'string' ? record['gigMainImageData'] : '';
          const ratingValue = Number(record['rating'] ?? 0);

          return {
            title: String(
              record['serviceTitle'] ??
                record['title'] ??
                record['packageDescription'] ??
                'Untitled service',
            ),
            views: this.toFiniteNumber(record['views'] ?? record['viewCount'], 0),
            orders: this.toFiniteNumber(record['orders'], 0),
            rating: Number.isFinite(ratingValue) ? ratingValue : 0,
            price: Number.isFinite(priceValue) && priceValue > 0 ? priceValue : 0,
            status:
              String(record['status'] ?? 'Active').toLowerCase() === 'paused'
                ? 'Paused'
                : 'Active',
            image: imageData
              ? `data:${String(record['gigMainImageContentType'] ?? 'image/jpeg')};base64,${imageData}`
              : 'https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=200&q=80',
          } as any;
        });

        this.profileViews = Number(sidebar?.viewCount ?? 0);
        this.avgRating = this.resolveAverageRating(Number(response.rating ?? 0), reviews);
        this.syncDashboardStats();
        this.cdr.detectChanges();
      },
      error: () => {
        // leave services empty on error
        this.syncDashboardStats();
        this.cdr.detectChanges();
      },
    });
  }

  private loadActiveOrdersAndEarnings(): void {
    this.loadingOrders = true;
    this.loadingEarnings = true;
    this.dashboardError = '';

    forkJoin({
      projects: this.http
        .get<ProjectResponse[]>(`${this.apiUrl}/freelancer/view-project`)
        .pipe(catchError(() => of([]))),
      hireRequests: this.http
        .get<HireRequestResponse[]>(`${this.apiUrl}/freelancer/view-hire-request`)
        .pipe(catchError(() => of([]))),
      transactions: this.paymentService.getFreelancerTransactions().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ projects, hireRequests, transactions }) => {
        const activeProjects = (projects ?? [])
          .filter((project) => this.isActiveProject(project.status))
          .sort((a, b) => this.sortProjectsNewestFirst(a, b));
        const inProgressHireRequests = (hireRequests ?? [])
          .filter((request) => String(request.projectStatus ?? '').toUpperCase() === 'IN_PROGRESS')
          .sort((a, b) => this.sortHireRequestsNewestFirst(a, b));
        const paidTransactions = (transactions ?? []).filter(
          (transaction) => String(transaction.status ?? '').toUpperCase() === 'PAID',
        );
        this.pendingPayments = (transactions ?? [])
          .filter((transaction) => String(transaction.status ?? '').toUpperCase() === 'PAYMENT_SUBMITTED')
          .map((transaction) => this.mapPendingPayment(transaction))
          .sort((a, b) => this.toTimestamp(b.submittedAt) - this.toTimestamp(a.submittedAt));

        const paidProjectIds = new Set(
          paidTransactions
            .map((transaction) => Number(transaction.projectId))
            .filter((projectId) => Number.isFinite(projectId)),
        );

        this.orders = inProgressHireRequests.length
          ? inProgressHireRequests.map((request) => this.mapHireRequestToOrder(request))
          : activeProjects
              .filter((project) => project.status === 'IN_PROGRESS')
              .map((project) => this.mapProjectToOrder(project, paidProjectIds.has(project.id)));

        this.totalEarnings = paidTransactions.reduce(
          (sum, transaction) => sum + Number(transaction.amount ?? 0),
          0,
        );
        this.availableBalance = this.totalEarnings;
        this.earningsSummary = this.buildEarningsSummary(activeProjects, paidTransactions);
        this.loadingOrders = false;
        this.loadingEarnings = false;
        this.syncDashboardStats();
        this.cdr.detectChanges();
      },
      error: () => {
        this.dashboardError = 'Unable to load active orders and earnings right now.';
        this.orders = [];
        this.pendingPayments = [];
        this.totalEarnings = 0;
        this.availableBalance = 0;
        this.earningsSummary = {
          thisMonth: 0,
          pendingClearance: 0,
          availableForWithdrawal: 0,
          lastPaidAmount: 0,
          lastPaidAt: '',
        };
        this.loadingOrders = false;
        this.loadingEarnings = false;
        this.syncDashboardStats();
        this.cdr.detectChanges();
      },
    });
  }

  private buildEarningsSummary(
    activeProjects: ProjectResponse[],
    paidTransactions: PaymentTransactionResponse[],
  ): EarningsSummary {
    const now = new Date();
    const thisMonth = paidTransactions
      .filter((transaction) => {
        const paidAt = transaction.paidAt ? new Date(transaction.paidAt) : null;
        return (
          paidAt !== null &&
          !Number.isNaN(paidAt.getTime()) &&
          paidAt.getFullYear() === now.getFullYear() &&
          paidAt.getMonth() === now.getMonth()
        );
      })
      .reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0);

    const pendingClearance = activeProjects
      .filter(
        (project) => !paidTransactions.some((transaction) => transaction.projectId === project.id),
      )
      .reduce((sum, project) => sum + Number(project.agreedPrice ?? 0), 0);

    const lastPaidTransaction = [...paidTransactions].sort(
      (a, b) =>
        this.toTimestamp(b.paidAt ?? b.createdAt) - this.toTimestamp(a.paidAt ?? a.createdAt),
    )[0];

    return {
      thisMonth,
      pendingClearance,
      availableForWithdrawal: this.totalEarnings,
      lastPaidAmount: Number(lastPaidTransaction?.amount ?? 0),
      lastPaidAt: lastPaidTransaction?.paidAt ?? lastPaidTransaction?.createdAt ?? '',
    };
  }

  private mapPendingPayment(transaction: PaymentTransactionResponse): PendingPayment {
    return {
      tranId: transaction.tranId ?? '',
      projectTitle:
        transaction.projectTitle ||
        (transaction.projectId ? `Project #${transaction.projectId}` : 'Project payment'),
      clientName: transaction.clientName || 'Client',
      amount: Number(transaction.amount ?? 0),
      currency: transaction.currency ?? 'USD',
      submittedAt: transaction.submittedAt ?? transaction.createdAt ?? '',
      proofReference: transaction.proofReference,
      proofFileName: transaction.proofFileName,
      hasProofFile: transaction.hasProofFile,
    };
  }

  private syncDashboardStats(): void {
    this.stats = this.stats.map((stat) => {
      if (stat.label === 'Total Earnings') {
        return {
          ...stat,
          value: `$${this.totalEarnings.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })}`,
        };
      }

      if (stat.label === 'Active Orders') {
        return {
          ...stat,
          value: String(this.orders.length),
        };
      }

      if (stat.label === 'Profile Views') {
        return {
          ...stat,
          value: this.profileViews.toLocaleString(),
        };
      }

      if (stat.label === 'Avg. Rating') {
        return {
          ...stat,
          value: this.avgRating > 0 ? this.avgRating.toFixed(1) : '0.0',
        };
      }

      return stat;
    });
  }

  private isActiveProject(status?: ProjectStatus): boolean {
    return (
      status === 'IN_PROGRESS' ||
      status === 'SUBMITTED' ||
      status === 'DELIVERED' ||
      status === 'REVISION_REQUESTED' ||
      status === 'REVISION_REJECTED'
    );
  }

  private mapHireRequestToOrder(request: HireRequestResponse): DashboardOrder {
    return {
      title: request.gigTitle || `Hire Request #${request.id}`,
      client: request.clientName || (request.clientId ? `Client #${request.clientId}` : 'Client'),
      dueDate: this.formatDate(request.deadline),
      price: Number(request.projectAgreedPrice ?? request.agreedPrice ?? 0),
      status: 'In Progress',
    };
  }

  private mapProjectToOrder(project: ProjectResponse, isPaid: boolean): DashboardOrder {
    return {
      title: project.projectTitle || project.gigTitle || `Project #${project.id}`,
      client: project.clientName || (project.clientId ? `Client #${project.clientId}` : 'Client'),
      dueDate: this.formatDate(project.deadline),
      price: Number(project.agreedPrice ?? 0),
      status: this.mapOrderStatus(project.status, isPaid),
    };
  }

  private mapOrderStatus(status?: ProjectStatus, isPaid = false): OrderStatus {
    if (isPaid) {
      return 'In Review';
    }

    return status === 'IN_PROGRESS' ? 'In Progress' : 'In Review';
  }

  private sortProjectsNewestFirst(a: ProjectResponse, b: ProjectResponse): number {
    return (
      this.toTimestamp(b.updatedAt ?? b.createdAt) - this.toTimestamp(a.updatedAt ?? a.createdAt) ||
      Number(b.id ?? 0) - Number(a.id ?? 0)
    );
  }

  private sortHireRequestsNewestFirst(a: HireRequestResponse, b: HireRequestResponse): number {
    return (
      this.toTimestamp(b.updatedAt ?? b.createdAt) - this.toTimestamp(a.updatedAt ?? a.createdAt) ||
      Number(b.projectId ?? b.id ?? 0) - Number(a.projectId ?? a.id ?? 0)
    );
  }

  private toTimestamp(value?: string | null): number {
    if (!value) {
      return 0;
    }

    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  formatDate(value?: string): string {
    if (!value) {
      return 'No deadline';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  formatCurrency(value: number): string {
    return Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  formatLastPaid(): string {
    if (!this.earningsSummary.lastPaidAt || this.earningsSummary.lastPaidAmount <= 0) {
      return 'No paid earnings yet';
    }

    return `$${this.formatCurrency(this.earningsSummary.lastPaidAmount)} - ${this.formatDate(
      this.earningsSummary.lastPaidAt,
    )}`;
  }

  private resolveAverageRating(
    profileRating: number,
    reviews: Array<{ rating?: number }>,
  ): number {
    if (Number.isFinite(profileRating) && profileRating > 0) {
      return profileRating;
    }

    const reviewRatings = (reviews ?? [])
      .map((review) => Number(review.rating ?? 0))
      .filter((rating) => Number.isFinite(rating) && rating > 0);

    if (!reviewRatings.length) {
      return 0;
    }

    return reviewRatings.reduce((sum, rating) => sum + rating, 0) / reviewRatings.length;
  }

  private toFiniteNumber(value: unknown, fallback: number): number {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  openWithdrawModal(): void {
    this.withdrawError = '';
    this.withdrawForm = {
      method: '',
      amount: this.availableBalance,
      speed: 'instant',
    };
    this.isWithdrawModalOpen = true;
  }

  confirmPayment(payment: PendingPayment): void {
    if (!payment.tranId || this.confirmingPaymentId) {
      return;
    }

    this.confirmingPaymentId = payment.tranId;
    this.dashboardError = '';
    this.cdr.detectChanges();

    this.paymentService.confirmManualPayment(payment.tranId).subscribe({
      next: () => {
        this.confirmingPaymentId = '';
        this.loadActiveOrdersAndEarnings();
      },
      error: (error) => {
        this.confirmingPaymentId = '';
        this.dashboardError = error.error?.message || error.error || 'Unable to confirm payment.';
        this.cdr.detectChanges();
      },
    });
  }

  downloadProof(payment: PendingPayment): void {
    if (!payment.tranId || this.downloadingProofId) {
      return;
    }

    this.downloadingProofId = payment.tranId;
    this.dashboardError = '';
    this.cdr.detectChanges();

    this.paymentService.downloadManualPaymentProof(payment.tranId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = payment.proofFileName || `${payment.tranId}-payment-proof`;
        link.click();
        URL.revokeObjectURL(url);
        this.downloadingProofId = '';
        this.cdr.detectChanges();
      },
      error: () => {
        this.downloadingProofId = '';
        this.dashboardError = 'Unable to download payment proof.';
        this.cdr.detectChanges();
      },
    });
  }

  closeWithdrawModal(): void {
    this.isWithdrawModalOpen = false;
    this.withdrawError = '';
  }

  selectWithdrawSpeed(speed: WithdrawSpeed): void {
    this.withdrawForm.speed = speed;
  }

  getInstantFee(): string {
    const amount = Number(this.withdrawForm.amount || 0);
    return (amount * 0.02).toFixed(2);
  }

  confirmWithdrawal(): void {
    const amount = Number(this.withdrawForm.amount);

    if (!this.withdrawForm.method) {
      this.withdrawError = 'Please select a payment method.';
      return;
    }

    if (!amount || amount <= 0) {
      this.withdrawError = 'Please enter a valid withdrawal amount.';
      return;
    }

    if (amount > this.availableBalance) {
      this.withdrawError = 'Withdrawal amount cannot exceed available balance.';
      return;
    }

    const fee = this.withdrawForm.speed === 'instant' ? amount * 0.02 : 0;
    const totalDeduction = amount;

    this.availableBalance = Math.max(0, this.availableBalance - totalDeduction);
    this.earningsSummary = {
      ...this.earningsSummary,
      availableForWithdrawal: this.availableBalance,
    };

    this.stats = this.stats.map((stat) => {
      if (stat.label === 'Total Earnings') {
        return stat;
      }

      if (stat.label === 'Available for Withdrawal') {
        return {
          ...stat,
          value: `$${this.availableBalance.toFixed(2)}`,
        };
      }

      return stat;
    });

    console.log('Withdraw success', {
      method: this.withdrawForm.method,
      amount,
      speed: this.withdrawForm.speed,
      fee,
      netReceived: amount - fee,
    });

    this.closeWithdrawModal();
  }

  getServiceStatusClass(status: ServiceStatus): string {
    switch (status) {
      case 'Active':
        return 'bg-[#dcfce7] text-[#16a34a]';
      case 'Paused':
        return 'bg-[#fef3c7] text-[#d97706]';
      default:
        return 'bg-[#f3f4f6] text-[#6b7280]';
    }
  }

  getOrderStatusClass(status: OrderStatus): string {
    switch (status) {
      case 'In Progress':
        return 'bg-[#dcfce7] text-[#16a34a]';
      case 'In Review':
        return 'bg-[#fef3c7] text-[#d97706]';
      default:
        return 'bg-[#f3f4f6] text-[#6b7280]';
    }
  }

  viewAllServices(): void {
    void this.router.navigate(['/freelancer/my-services']);
  }
}
