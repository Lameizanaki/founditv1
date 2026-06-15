import { CommonModule } from "@angular/common";
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from "@angular/core";
import { BadgeDollarSign, CircleAlert, Clock3, LucideAngularModule, ReceiptText, ShoppingBag, UserPlus, Users } from "lucide-angular";
import { Subscription } from "rxjs";
import { AdminDashboard, AdminEkycDetail, AdminPendingReview, AdminService } from "../../../services/admin/admin.service";
import { AdminNotificationService } from "../../../services/admin/admin-notification.service";

interface DashboardStat {
  title: string;
  value: string;
  badge: string;
  badgeType: 'neutral' | 'danger';
  icon: any;
  iconBg: string;
  iconColor: string;
}

@Component({
    selector: "app-admin-dashboard-component",
    standalone: true,
    templateUrl: "./admin-dashboard.component.html",
    imports: [CommonModule, LucideAngularModule],
})
export class AdminDashbaordComponent implements OnInit, OnDestroy {
    readonly icons = {
        ShoppingBag,
        UserPlus,
        Users,
        BadgeDollarSign,
        ReceiptText,
        Clock3,
        CircleAlert,
  };

  stats: DashboardStat[] = this.buildStats({
    totalFreelancers: 0,
    totalClients: 0,
    totalUsers: 0,
    totalRevenue: 0,
    paidPaymentRecords: 0,
    pendingRevenue: 0,
    submittedPaymentRecords: 0,
    pendingReviews: 0,
    pendingReviewItems: [],
  });
  pendingReviews: AdminPendingReview[] = [];
  loading = true;
  errorMessage = '';
  actionMessage = '';
  actionLoadingId: number | null = null;
  selectedReview: AdminEkycDetail | null = null;
  detailLoadingId: number | null = null;
  private readonly subscription = new Subscription();

  constructor(
    private adminService: AdminService,
    private adminNotificationService: AdminNotificationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
    this.subscription.add(
      this.adminNotificationService.realtimeNotifications$.subscribe((notification) => {
        if (notification.type === 'admin_ekyc_pending') {
          this.loadDashboard(false);
        }
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private loadDashboard(showLoading = true): void {
    if (showLoading) {
      this.loading = true;
    }
    this.adminService.dashboard().subscribe({
      next: (dashboard) => {
        this.applyDashboard(dashboard);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Dashboard data could not be loaded. Showing fallback values.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private applyDashboard(dashboard: AdminDashboard): void {
    this.pendingReviews = dashboard.pendingReviewItems ?? [];
    this.stats = this.buildStats(dashboard);
  }

  approveReview(review: AdminPendingReview): void {
    this.actionLoadingId = review.ekycId;
    this.actionMessage = '';
    this.adminService.approveEkyc(review.ekycId).subscribe({
      next: () => {
        this.pendingReviews = this.pendingReviews.filter((item) => item.ekycId !== review.ekycId);
        this.actionMessage = 'E-KYC approved. The user can now create gigs.';
        this.actionLoadingId = null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Could not approve this E-KYC review.';
        this.actionLoadingId = null;
        this.cdr.detectChanges();
      },
    });
  }

  rejectReview(review: AdminPendingReview): void {
    this.actionLoadingId = review.ekycId;
    this.actionMessage = '';
    this.adminService.rejectEkyc(review.ekycId, 'Rejected by admin review').subscribe({
      next: () => {
        this.pendingReviews = this.pendingReviews.filter((item) => item.ekycId !== review.ekycId);
        this.actionMessage = 'E-KYC rejected.';
        this.actionLoadingId = null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Could not reject this E-KYC review.';
        this.actionLoadingId = null;
        this.cdr.detectChanges();
      },
    });
  }

  openReviewDetail(review: AdminPendingReview): void {
    this.detailLoadingId = review.ekycId;
    this.errorMessage = '';
    this.adminService.ekycDetail(review.ekycId).subscribe({
      next: (detail) => {
        this.selectedReview = detail;
        this.detailLoadingId = null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Could not load E-KYC review detail.';
        this.detailLoadingId = null;
        this.cdr.detectChanges();
      },
    });
  }

  closeReviewDetail(): void {
    this.selectedReview = null;
  }

  imageSrc(data: string | number[] | null | undefined, type: string | null | undefined): string | null {
    if (!data) {
      return null;
    }
    const contentType = type || 'image/jpeg';
    if (typeof data === 'string') {
      return data.startsWith('data:') ? data : `data:${contentType};base64,${data}`;
    }
    let binary = '';
    for (const byte of data) {
      binary += String.fromCharCode(byte);
    }
    return `data:${contentType};base64,${btoa(binary)}`;
  }

  private buildStats(dashboard: AdminDashboard): DashboardStat[] {
    return [
      {
        title: 'Total Freelancers',
        value: this.formatNumber(dashboard.totalFreelancers),
        badge: 'Live',
        badgeType: 'neutral',
        icon: this.icons.ShoppingBag,
        iconBg: 'bg-[#eef2ff]',
        iconColor: 'text-[#4f46e5]',
      },
      {
        title: 'Total Clients',
        value: this.formatNumber(dashboard.totalClients),
        badge: 'Live',
        badgeType: 'neutral',
        icon: this.icons.UserPlus,
        iconBg: 'bg-[#ecfdf5]',
        iconColor: 'text-[#10b981]',
      },
      {
        title: 'Total Users',
        value: this.formatNumber(dashboard.totalUsers),
        badge: 'Register',
        badgeType: 'neutral',
        icon: this.icons.Users,
        iconBg: 'bg-[#f0f9ff]',
        iconColor: 'text-[#0284c7]',
      },
      {
        title: 'Total Earnings',
        value: this.formatCurrency(dashboard.totalRevenue),
        badge: 'Paid',
        badgeType: 'neutral',
        icon: this.icons.BadgeDollarSign,
        iconBg: 'bg-[#f0fdf4]',
        iconColor: 'text-[#16a34a]',
      },
      {
        title: 'Paid Records',
        value: this.formatNumber(dashboard.paidPaymentRecords),
        badge: 'Payments',
        badgeType: 'neutral',
        icon: this.icons.ReceiptText,
        iconBg: 'bg-[#fef3c7]',
        iconColor: 'text-[#d97706]',
      },
      {
        title: 'Pending Earnings',
        value: this.formatCurrency(dashboard.pendingRevenue),
        badge: `${this.formatNumber(dashboard.submittedPaymentRecords)} submitted`,
        badgeType: 'neutral',
        icon: this.icons.Clock3,
        iconBg: 'bg-[#fffbeb]',
        iconColor: 'text-[#ca8a04]',
      },
      {
        title: 'Pending Reviews',
        value: this.formatNumber(dashboard.pendingReviews),
        badge: this.formatNumber(dashboard.pendingReviews),
        badgeType: dashboard.pendingReviews > 0 ? 'danger' : 'neutral',
        icon: this.icons.CircleAlert,
        iconBg: 'bg-[#fff7ed]',
        iconColor: 'text-[#f97316]',
      },
    ];
  }

  private formatNumber(value: number | null | undefined): string {
    return new Intl.NumberFormat().format(value ?? 0);
  }

  private formatCurrency(value: number | null | undefined): string {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(value ?? 0);
  }
}
