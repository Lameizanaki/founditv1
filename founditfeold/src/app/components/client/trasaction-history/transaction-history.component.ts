import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import {
  LucideAngularModule,
  Clock3,
  Download,
  DollarSign,
  FileText,
  RotateCcw,
} from 'lucide-angular';
import { ChatService, HireRequestResponse } from '../../../services/chat/chat.service';
import {
  PaymentService,
  PaymentTransactionResponse,
} from '../../../services/payment/payment.service';
import { FreelancerProfileService } from '../../../services/Freelancer/Profile/freelancer-profile.service';
import { FreelancerProfileResponse } from '../../../services/Freelancer/Profile/freelancer-profile.models';

type TransactionType = 'payment' | 'refund';
type TransactionStatus = 'completed' | 'pending' | 'failed' | 'cancelled' | 'refunded';
type TransactionTab = 'all' | 'payment' | 'refund';

interface TransactionItem {
  id: number;
  title: string;
  freelancerId?: number;
  freelancer: string;
  freelancerAvatar?: string;
  date: string;
  cardLast4: string;
  transactionCode: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
}

@Component({
  selector: 'app-client-transaction-history-component',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './transaction-history.component.html',
})
export class TransactionHistoryComponent {
  private readonly paymentService = inject(PaymentService);
  private readonly chatService = inject(ChatService);
  private readonly freelancerProfileService = inject(FreelancerProfileService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly icons = {
    Download,
    DollarSign,
    RotateCcw,
    FileText,
    Clock3,
  };

  activeTab: TransactionTab = 'all';
  isLoading = false;
  loadError = '';
  transactions: TransactionItem[] = [];

  ngOnInit(): void {
    this.loadTransactions();
  }

  setTab(tab: TransactionTab): void {
    this.activeTab = tab;
    this.refreshView();
  }

  get filteredTransactions(): TransactionItem[] {
    if (this.activeTab === 'all') return this.transactions;
    return this.transactions.filter((item) => item.type === this.activeTab);
  }

  get totalSpent(): number {
    return this.transactions
      .filter((item) => item.type === 'payment')
      .filter((item) => item.status === 'completed')
      .reduce((sum, item) => sum + item.amount, 0);
  }

  get totalRefunded(): number {
    return this.transactions
      .filter((item) => item.type === 'refund')
      .reduce((sum, item) => sum + item.amount, 0);
  }

  get totalTransactions(): number {
    return this.transactions.length;
  }

  get paymentCount(): number {
    return this.transactions.filter((item) => item.type === 'payment').length;
  }

  get refundCount(): number {
    return this.transactions.filter((item) => item.type === 'refund').length;
  }

  exportStatement(): void {
    const rows = [
      ['Transaction ID', 'Project', 'Freelancer', 'Type', 'Status', 'Amount', 'Date'],
      ...this.transactions.map((item) => [
        item.transactionCode,
        item.title,
        item.freelancer,
        item.type,
        item.status,
        String(item.amount),
        item.date,
      ]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `client-transactions-${this.formatFileDate(new Date())}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  contactSupport(): void {
    window.location.href = 'mailto:support@foundit.local';
  }

  getStatusClass(status: TransactionStatus): string {
    switch (status) {
      case 'completed':
        return 'bg-[#dcfce7] text-[#16a34a]';
      case 'pending':
        return 'bg-[#fef3c7] text-[#d97706]';
      case 'failed':
      case 'cancelled':
        return 'bg-[#fee2e2] text-[#ef4444]';
      default:
        return 'bg-[#dbeafe] text-[#2563eb]';
    }
  }

  getStatusLabel(status: TransactionStatus): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  getAmountClass(type: TransactionType): string {
    return type === 'refund' ? 'text-[#16a34a]' : 'text-[#111827]';
  }

  formatAmount(type: TransactionType, amount: number): string {
    const formatted = new Intl.NumberFormat('en-US').format(amount);
    return type === 'refund' ? `+$${formatted}` : `$${formatted}`;
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  trackByTransactionId(index: number, item: TransactionItem): number {
    return item.id;
  }

  private loadTransactions(): void {
    this.isLoading = true;
    this.loadError = '';

    forkJoin({
      transactions: this.paymentService.getMyTransactions().pipe(catchError(() => of([]))),
      requests: this.chatService.getMyClientHireRequests().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ transactions, requests }) => {
        const typedRequests = requests as HireRequestResponse[];

        this.transactions = (transactions as PaymentTransactionResponse[])
          .slice()
          .sort((a, b) => this.toTimestamp(b.paidAt ?? b.createdAt ?? '') - this.toTimestamp(a.paidAt ?? a.createdAt ?? ''))
          .map((transaction) => this.toTransactionItem(transaction, typedRequests));

        this.loadFreelancerProfiles();
        this.isLoading = false;
        this.refreshView();
      },
      error: () => {
        this.loadError = 'Unable to load your transactions right now.';
        this.isLoading = false;
        this.refreshView();
      },
    });
  }

  private toTransactionItem(
    transaction: PaymentTransactionResponse,
    requests: HireRequestResponse[],
  ): TransactionItem {
    const projectId = this.toNumber(transaction.projectId);
    const request = requests.find((item) => this.toNumber(item.projectId) === projectId);
    const status = String(transaction.status ?? 'UNKNOWN').toUpperCase();

    return {
      id: this.toNumber(transaction.id) ?? projectId ?? this.toTimestamp(transaction.createdAt ?? ''),
      title: transaction.projectTitle || request?.gigTitle || 'Project payment',
      freelancerId: this.toNumber(request?.freelancerId),
      freelancer: request?.freelancerId ? `Freelancer #${request.freelancerId}` : 'Freelancer',
      date: this.formatDateTime(transaction.paidAt || transaction.createdAt || ''),
      cardLast4: '----',
      transactionCode: transaction.tranId || `TXN-${transaction.id ?? projectId ?? 'N/A'}`,
      amount: Number(transaction.amount ?? 0),
      type: status === 'CANCELLED' ? 'refund' : 'payment',
      status: this.toTransactionStatus(status),
    };
  }

  private loadFreelancerProfiles(): void {
    const freelancerIds = Array.from(
      new Set(
        this.transactions
          .map((transaction) => transaction.freelancerId)
          .filter((id): id is number => typeof id === 'number' && Number.isFinite(id)),
      ),
    );

    for (const freelancerId of freelancerIds) {
      this.freelancerProfileService.getClientProfile(freelancerId).subscribe({
        next: (profile) => this.applyFreelancerProfile(freelancerId, profile),
        error: () => undefined,
      });
    }
  }

  private applyFreelancerProfile(
    freelancerId: number,
    profile: FreelancerProfileResponse,
  ): void {
    const avatar = this.buildAvatarUrl(profile.profilePictureData, profile.profilePictureType);
    const freelancerName = profile.freelancerName?.trim();

    this.transactions = this.transactions.map((transaction) =>
      transaction.freelancerId === freelancerId
        ? {
            ...transaction,
            freelancer: freelancerName || transaction.freelancer,
            freelancerAvatar: avatar || transaction.freelancerAvatar,
          }
        : transaction,
    );
    this.refreshView();
  }

  private toTransactionStatus(status: string): TransactionStatus {
    switch (status) {
      case 'PAID':
        return 'completed';
      case 'PENDING':
        return 'pending';
      case 'FAILED':
        return 'failed';
      case 'CANCELLED':
        return 'cancelled';
      default:
        return 'pending';
    }
  }

  private formatDateTime(date: string): string {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return 'No date';

    return parsed.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  private formatFileDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private buildAvatarUrl(
    data?: string | Uint8Array | number[] | null,
    contentType?: string | null,
  ): string | undefined {
    let imageData = '';

    if (typeof data === 'string') {
      imageData = data.trim();
    } else if (data instanceof Uint8Array) {
      imageData = this.bytesToBase64(data);
    } else if (Array.isArray(data)) {
      imageData = this.bytesToBase64(new Uint8Array(data));
    }

    if (!imageData) return undefined;
    if (imageData.startsWith('data:') || /^https?:\/\//i.test(imageData)) return imageData;

    return `data:${contentType?.trim() || 'image/jpeg'};base64,${imageData}`;
  }

  private bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index]);
    }
    return btoa(binary);
  }

  private toTimestamp(value?: string): number {
    if (!value) return 0;

    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  private toNumber(value: unknown): number | undefined {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  }

  private refreshView(): void {
    window.setTimeout(() => this.cdr.detectChanges(), 0);
  }
}
