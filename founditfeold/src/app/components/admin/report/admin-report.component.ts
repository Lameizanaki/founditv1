import { CommonModule } from "@angular/common";
import { ChangeDetectorRef, Component, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Clock, Eye, FileText, Flag, LucideAngularModule, Search, XCircle } from "lucide-angular";
import { AccountReport, AccountReportService, AccountReportStatus } from "../../../services/account/account-report.service";

type ReportStatus = 'Pending' | 'Reviewed' | 'Resolved' | 'Dismissed';
type ReportSeverity = 'High' | 'Medium' | 'Low';
type ReportType = 'Account';
type ActionType = 'review' | 'resolve' | 'dismiss' | null;

interface ReportItem {
  id: number;
  title: string;
  type: ReportType;
  severity: ReportSeverity;
  status: ReportStatus;
  reporter: string;
  daysAgo: number;
  reason: string;
  description: string;
  reviewedBy?: string;
  resolutionNote?: string;
  dismissalReason?: string;
  raw: AccountReport;
}

@Component({
    selector: "app-admin-report-component",
    standalone: true,
    templateUrl: "./admin-report.component.html",
    imports: [CommonModule, LucideAngularModule, FormsModule],
})
export class AdminReportComponent implements OnInit {

    readonly icons = {
        Flag,
        Clock,
        Eye,
        CheckCircle,
        XCircle,
        Search,
        FileText,
        AlertTriangle,
        ChevronDown,
        ChevronUp
    };
  search = '';
  selectedType = 'All Types';
  selectedStatus = 'All Status';
  loading = true;
  errorMessage = '';

  expandedReportId: number | null = null;
  activeAction: ActionType = null;

  reviewNotes = '';
  resolveNotes = '';
  dismissNotes = '';

  reports: ReportItem[] = [];

  constructor(
    private accountReportService: AccountReportService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadReports();
  }

  get filteredReports(): ReportItem[] {
    return this.reports.filter((report) => {
      const matchesSearch =
        !this.search ||
        report.title.toLowerCase().includes(this.search.toLowerCase()) ||
        report.reason.toLowerCase().includes(this.search.toLowerCase()) ||
        report.reporter.toLowerCase().includes(this.search.toLowerCase());

      const matchesType =
        this.selectedType === 'All Types' || report.type === this.selectedType;

      const matchesStatus =
        this.selectedStatus === 'All Status' || report.status === this.selectedStatus;

      return matchesSearch && matchesType && matchesStatus;
    });
  }

  get totalReports(): number {
    return this.reports.length;
  }

  get pendingReports(): number {
    return this.reports.filter((r) => r.status === 'Pending').length;
  }

  get reviewedReports(): number {
    return this.reports.filter((r) => r.status === 'Reviewed').length;
  }

  get resolvedReports(): number {
    return this.reports.filter((r) => r.status === 'Resolved').length;
  }

  get dismissedReports(): number {
    return this.reports.filter((r) => r.status === 'Dismissed').length;
  }

  toggleCard(reportId: number): void {
    if (this.expandedReportId === reportId) {
      this.expandedReportId = null;
      this.activeAction = null;
      this.resetForms();
      return;
    }

    this.expandedReportId = reportId;
    this.activeAction = null;
    this.resetForms();
  }

  openAction(reportId: number, action: ActionType): void {
    this.expandedReportId = reportId;
    this.activeAction = action;
    this.resetForms();
  }

  cancelAction(): void {
    this.activeAction = null;
    this.resetForms();
  }

  markAsReviewed(report: ReportItem): void {
    this.updateReport(report, 'REVIEWED', this.reviewNotes || 'Report reviewed by admin.');
  }

  markAsResolved(report: ReportItem): void {
    if (!this.resolveNotes.trim()) return;
    this.updateReport(report, 'RESOLVED', this.resolveNotes.trim());
  }

  markAsDismissed(report: ReportItem): void {
    if (!this.dismissNotes.trim()) return;
    this.updateReport(report, 'DISMISSED', this.dismissNotes.trim());
  }

  private resetForms(): void {
    this.reviewNotes = '';
    this.resolveNotes = '';
    this.dismissNotes = '';
  }

  getSeverityClass(severity: ReportSeverity): string {
    switch (severity) {
      case 'High':
        return 'bg-orange-100 text-orange-600';
      case 'Medium':
        return 'bg-amber-100 text-amber-600';
      case 'Low':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  }

  getStatusClass(status: ReportStatus): string {
    switch (status) {
      case 'Pending':
        return 'bg-orange-100 text-orange-600';
      case 'Reviewed':
        return 'bg-blue-100 text-blue-600';
      case 'Resolved':
        return 'bg-green-100 text-green-600';
      case 'Dismissed':
        return 'bg-gray-200 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  }

  private loadReports(): void {
    this.loading = true;
    this.errorMessage = '';
    this.accountReportService.adminReports().subscribe({
      next: (reports) => {
        this.reports = (reports ?? []).map((report) => this.toReportItem(report));
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Unable to load user reports.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private updateReport(report: ReportItem, status: AccountReportStatus, adminNote: string): void {
    this.accountReportService.updateReport(report.id, { status, adminNote }).subscribe({
      next: (updated) => {
        this.reports = this.reports.map((item) =>
          item.id === updated.id ? this.toReportItem(updated) : item,
        );
        this.activeAction = null;
        this.resetForms();
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Unable to update report.';
        this.cdr.detectChanges();
      },
    });
  }

  private toReportItem(report: AccountReport): ReportItem {
    const status = this.toDisplayStatus(report.status);
    const isProfileReport = report.subject?.toLowerCase().startsWith('report ');
    return {
      id: report.id,
      title: report.subject || 'Suspended account review request',
      type: 'Account',
      severity: report.accountStatus === 'SUSPENDED' || isProfileReport ? 'High' : 'Medium',
      status,
      reporter: report.email || report.username || 'Unknown user',
      daysAgo: this.daysAgo(report.createdAt),
      reason: isProfileReport
        ? 'User submitted a profile or payment issue'
        : `${report.role ?? 'USER'} account is ${report.accountStatus ?? 'UNKNOWN'}`,
      description: report.message,
      reviewedBy: status !== 'Pending' ? 'Admin Team' : undefined,
      resolutionNote: report.status === 'RESOLVED' ? report.adminNote ?? undefined : undefined,
      dismissalReason: report.status === 'DISMISSED' ? report.adminNote ?? undefined : undefined,
      raw: report,
    };
  }

  private toDisplayStatus(status: AccountReportStatus): ReportStatus {
    switch (status) {
      case 'REVIEWED':
        return 'Reviewed';
      case 'RESOLVED':
        return 'Resolved';
      case 'DISMISSED':
        return 'Dismissed';
      default:
        return 'Pending';
    }
  }

  private daysAgo(value?: string | null): number {
    if (!value) return 0;
    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) return 0;
    return Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
  }
}
