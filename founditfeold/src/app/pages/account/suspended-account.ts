import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  AlertTriangle,
  CheckCircle,
  Clock3,
  LogOut,
  LucideAngularModule,
  Send,
} from 'lucide-angular';
import {
  AccountReport,
  AccountReportService,
  AccountStatusResponse,
} from '../../services/account/account-report.service';
import { LoginService } from '../../services/auth/Login/login.service';

@Component({
  selector: 'app-suspended-account',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './suspended-account.html',
})
export class SuspendedAccountPage implements OnInit {
  private readonly accountReportService = inject(AccountReportService);
  private readonly loginService = inject(LoginService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly icons = { AlertTriangle, CheckCircle, Clock3, LogOut, Send };

  account: AccountStatusResponse | null = null;
  reports: AccountReport[] = [];
  subject = 'Suspended account review request';
  message = '';
  loading = true;
  submitting = false;
  successMessage = '';
  errorMessage = '';

  ngOnInit(): void {
    this.loadPage();
  }

  submitReport(): void {
    if (!this.message.trim() || this.submitting) return;

    this.submitting = true;
    this.successMessage = '';
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.accountReportService
      .submitReport({
        subject: this.subject.trim() || 'Suspended account review request',
        message: this.message.trim(),
      })
      .subscribe({
        next: (report) => {
          this.reports = [report, ...this.reports];
          this.message = '';
          this.successMessage = 'Your request was sent to the admin team.';
          this.submitting = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Unable to send your request right now.';
          this.submitting = false;
          this.cdr.detectChanges();
        },
      });
  }

  logout(): void {
    this.loginService.logout();
    void this.router.navigate(['/auth/sign-in']);
  }

  formatDate(value?: string | null): string {
    if (!value) return 'No date';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  statusClass(status: string): string {
    switch (status) {
      case 'RESOLVED':
        return 'bg-green-100 text-green-700';
      case 'REVIEWED':
        return 'bg-blue-100 text-blue-700';
      case 'DISMISSED':
        return 'bg-gray-200 text-gray-700';
      default:
        return 'bg-orange-100 text-orange-700';
    }
  }

  private loadPage(): void {
    this.loading = true;
    this.accountReportService.getAccountStatus().subscribe({
      next: (account) => {
        this.account = account;
        if (account.status !== 'SUSPENDED') {
          void this.router.navigate([account.role === 'FREELANCER' ? '/freelancer/dashboard' : '/client/dashboard']);
          return;
        }
        this.loadReports();
      },
      error: () => {
        this.errorMessage = 'Unable to load account status.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private loadReports(): void {
    this.accountReportService.myReports().subscribe({
      next: (reports) => {
        this.reports = reports ?? [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.reports = [];
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }
}
