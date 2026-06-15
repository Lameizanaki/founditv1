import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  ArrowUpRight,
  ChevronLeft,
  Circle,
  CircleCheckBig,
  Clock3,
  CreditCard,
  Download,
  Landmark,
  TrendingUp,
  Wallet,
  BadgeCheck,
  Hourglass,
  BanknoteArrowUp,
  X,
  LucideAngularModule,
} from 'lucide-angular';
import {
  PaymentService,
  PaymentTransactionResponse,
} from '../../../services/payment/payment.service';

type TransactionTab = 'all' | 'payments' | 'withdrawals';
type TransactionStatus = 'Cleared' | 'Pending' | 'Failed' | 'Cancelled' | 'Done';
type PaymentType = 'paypal' | 'bank';

interface TransactionItem {
  tranId: string;
  title: string;
  from: string;
  date: string;
  ref: string;
  note: string;
  amount: number;
  status: TransactionStatus;
  type: 'payment' | 'withdrawal';
  timestamp: number;
  proofReference?: string | null;
  proofFileName?: string | null;
  hasProofFile?: boolean | null;
}

interface PaymentMethodItem {
  type: PaymentType;
  display: string;
  isPrimary: boolean;
}

interface EarningsChartPoint {
  label: string;
  amount: number;
  cumulative: number;
  x: number;
  y: number;
}

@Component({
  selector: 'app-earnings-withdrawals',
  templateUrl: './earning-withdrawal-history.component.html',
  imports: [CommonModule, LucideAngularModule, FormsModule, RouterLink],
})
export class EarningsWithdrawalsComponent implements OnInit {
  private readonly paymentService = inject(PaymentService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly icons = {
    ChevronLeft,
    Download,
    TrendingUp,
    BadgeCheck,
    Hourglass,
    BanknoteArrowUp,
    Wallet,
    Clock3,
    Landmark,
    ArrowUpRight,
    Circle,
    CreditCard,
    X,
    CircleCheckBig,
  };

  selectedChartFilter: '3M' | '6M' | '1Y' = '6M';
  chartFilters: Array<'3M' | '6M' | '1Y'> = ['3M', '6M', '1Y'];

  withdrawAmount = '0.00';
  selectedWithdrawMethod = '';
  selectedTab: TransactionTab = 'all';
  loading = true;
  exporting = false;
  errorMessage = '';
  confirmingPaymentId = '';
  downloadingProofId = '';

  transactions: TransactionItem[] = [];
  paymentMethods: PaymentMethodItem[] = [];

  isAddPaymentModalOpen = false;
  addPaymentError = '';

  addPaymentForm: {
    type: PaymentType;
    accountHolder: string;
    paypalEmail: string;
    accountNumber: string;
    routingNumber: string;
    bankName: string;
    isPrimary: boolean;
  } = {
    type: 'bank',
    accountHolder: '',
    paypalEmail: '',
    accountNumber: '',
    routingNumber: '',
    bankName: '',
    isPrimary: false,
  };

  ngOnInit(): void {
    this.loadTransactions();
  }

  get totalEarned(): number {
    return this.paidTransactions.reduce((sum, item) => sum + item.amount, 0);
  }

  get availableBalance(): number {
    return this.totalEarned;
  }

  get pendingClearance(): number {
    return this.transactions
      .filter((item) => item.type === 'payment' && item.status === 'Pending')
      .reduce((sum, item) => sum + item.amount, 0);
  }

  get totalWithdrawn(): number {
    return this.transactions
      .filter((item) => item.type === 'withdrawal' && item.status === 'Done')
      .reduce((sum, item) => sum + Math.abs(item.amount), 0);
  }

  get stats() {
    return [
      {
        value: `$${this.formatCurrency(this.totalEarned)}`,
        label: 'Total Earned',
        subLabel: 'All time paid earnings',
        icon: TrendingUp,
        iconBg: 'bg-[#f3e8ff]',
        iconColor: 'text-[#a855f7]',
      },
      {
        value: `$${this.formatCurrency(this.availableBalance)}`,
        label: 'Confirmed Earnings',
        subLabel: 'Paid and confirmed',
        icon: BadgeCheck,
        iconBg: 'bg-[#dcfce7]',
        iconColor: 'text-[#16a34a]',
      },
      {
        value: `$${this.formatCurrency(this.pendingClearance)}`,
        label: 'Pending Clearance',
        subLabel: 'Awaiting payment confirmation',
        icon: Hourglass,
        iconBg: 'bg-[#fef3c7]',
        iconColor: 'text-[#d4a017]',
      },
    ];
  }

  get tabs() {
    const payments = this.transactions.filter((item) => item.type === 'payment').length;
    return [
      { label: `All (${this.transactions.length})`, value: 'all' as TransactionTab },
      { label: `Payments (${payments})`, value: 'payments' as TransactionTab },
    ];
  }

  get filteredTransactions(): TransactionItem[] {
    if (this.selectedTab === 'payments') {
      return this.transactions.filter((item) => item.type === 'payment');
    }

    if (this.selectedTab === 'withdrawals') {
      return this.transactions.filter((item) => item.type === 'withdrawal');
    }

    return this.transactions;
  }

  get months(): string[] {
    return this.chartBuckets.map((bucket) => bucket.label);
  }

  get chartBuckets(): Array<{ label: string; amount: number; cumulative: number }> {
    const monthCount = this.selectedChartFilter === '3M' ? 3 : this.selectedChartFilter === '6M' ? 6 : 12;
    const now = new Date();
    const firstMonth = new Date(now.getFullYear(), now.getMonth() - (monthCount - 1), 1);
    let runningTotal = this.paidTransactions
      .filter((item) => item.timestamp < firstMonth.getTime())
      .reduce((sum, item) => sum + item.amount, 0);

    return Array.from({ length: monthCount }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (monthCount - 1 - index), 1);
      const month = date.getMonth();
      const year = date.getFullYear();
      const amount = this.paidTransactions
        .filter((item) => {
          const itemDate = new Date(item.timestamp);
          return itemDate.getMonth() === month && itemDate.getFullYear() === year;
        })
        .reduce((sum, item) => sum + item.amount, 0);
      runningTotal += amount;

      return {
        label: date.toLocaleDateString([], { month: 'short' }),
        amount,
        cumulative: runningTotal,
      };
    });
  }

  get chartPoints(): EarningsChartPoint[] {
    const buckets = this.chartBuckets;
    const max = this.maxChartValue;
    const lastIndex = Math.max(buckets.length - 1, 1);

    return buckets.map((bucket, index) => ({
      ...bucket,
      x: (index / lastIndex) * 100,
      y: 100 - Math.min((bucket.cumulative / max) * 100, 100),
    }));
  }

  get earningsLinePath(): string {
    return this.chartPoints
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');
  }

  get earningsAreaPath(): string {
    const points = this.chartPoints;
    if (!points.length) {
      return '';
    }

    const line = this.earningsLinePath;
    const first = points[0];
    const last = points[points.length - 1];
    return `${line} L ${last.x} 100 L ${first.x} 100 Z`;
  }

  get maxChartValue(): number {
    return this.chartMaxValue;
  }

  get yAxisLabels(): string[] {
    const max = this.chartMaxValue;
    return [max, max * 0.75, max * 0.5, max * 0.25, 0].map(
      (value) => `$${this.formatCompactCurrency(value)}`,
    );
  }

  private get paidTransactions(): TransactionItem[] {
    return this.transactions.filter((item) => item.type === 'payment' && item.status === 'Cleared');
  }

  private get chartMaxValue(): number {
    const highestAmount = Math.max(...this.chartBuckets.map((bucket) => bucket.cumulative), 0);
    if (highestAmount <= 0) {
      return 100;
    }

    const magnitude = Math.pow(10, Math.floor(Math.log10(highestAmount)));
    const normalized = highestAmount / magnitude;
    const niceNormalized =
      normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;

    return niceNormalized * magnitude;
  }

  private loadTransactions(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.paymentService.getFreelancerTransactions().subscribe({
      next: (transactions) => {
        this.transactions = (transactions ?? [])
          .map((transaction) => this.mapPaymentTransaction(transaction))
          .sort((a, b) => b.timestamp - a.timestamp);
        this.withdrawAmount = this.formatCurrency(this.availableBalance);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.transactions = [];
        this.withdrawAmount = '0.00';
        this.errorMessage = 'Unable to load earnings history right now.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private mapPaymentTransaction(transaction: PaymentTransactionResponse): TransactionItem {
    const status = this.mapPaymentStatus(transaction.status);
    const dateValue = transaction.paidAt ?? transaction.createdAt ?? '';
    const timestamp = this.toTimestamp(dateValue);
    const projectTitle =
      transaction.projectTitle || (transaction.projectId ? `Project #${transaction.projectId}` : 'Project payment');

    return {
      tranId: transaction.tranId || '',
      title: projectTitle,
      from: transaction.clientName ? `from ${transaction.clientName}` : '',
      date: this.formatDateTime(dateValue),
      ref: transaction.tranId || `TXN-${transaction.id ?? 'UNKNOWN'}`,
      note: `${transaction.currency ?? 'USD'} payment${status === 'Pending' ? ' submitted for confirmation' : ''}`,
      amount: Number(transaction.amount ?? 0),
      status,
      type: 'payment',
      timestamp,
      proofReference: transaction.proofReference,
      proofFileName: transaction.proofFileName,
      hasProofFile: transaction.hasProofFile,
    };
  }

  private mapPaymentStatus(status?: string): TransactionStatus {
    switch (String(status ?? '').toUpperCase()) {
      case 'PAID':
        return 'Cleared';
      case 'PAYMENT_SUBMITTED':
      case 'PENDING':
      case 'UNKNOWN':
        return 'Pending';
      case 'FAILED':
        return 'Failed';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return 'Pending';
    }
  }

  confirmPayment(item: TransactionItem): void {
    if (!item.tranId || this.confirmingPaymentId) {
      return;
    }

    this.confirmingPaymentId = item.tranId;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.paymentService.confirmManualPayment(item.tranId).subscribe({
      next: () => {
        this.confirmingPaymentId = '';
        this.loadTransactions();
      },
      error: (error) => {
        this.confirmingPaymentId = '';
        this.errorMessage = error.error?.message || error.error || 'Unable to confirm payment.';
        this.cdr.detectChanges();
      },
    });
  }

  downloadProof(item: TransactionItem): void {
    if (!item.tranId || this.downloadingProofId) {
      return;
    }

    this.downloadingProofId = item.tranId;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.paymentService.downloadManualPaymentProof(item.tranId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = item.proofFileName || `${item.tranId}-payment-proof`;
        link.click();
        URL.revokeObjectURL(url);
        this.downloadingProofId = '';
        this.cdr.detectChanges();
      },
      error: () => {
        this.downloadingProofId = '';
        this.errorMessage = 'Unable to download payment proof.';
        this.cdr.detectChanges();
      },
    });
  }

  getBarHeight(amount: number): string {
    return `${Math.max((amount / this.maxChartValue) * 100, amount > 0 ? 8 : 0)}%`;
  }

  selectTab(tab: TransactionTab): void {
    this.selectedTab = tab;
    window.setTimeout(() => this.cdr.detectChanges(), 0);
  }

  getEmptyTransactionTitle(): string {
    switch (this.selectedTab) {
      case 'payments':
        return 'No payments found';
      case 'withdrawals':
        return 'No withdrawals found';
      default:
        return 'No transactions found';
    }
  }

  getEmptyTransactionMessage(): string {
    switch (this.selectedTab) {
      case 'payments':
        return 'Paid and pending client payments will appear here.';
      case 'withdrawals':
        return 'Withdrawal history will appear here after a withdrawal API is available.';
      default:
        return 'Your payment and withdrawal activity will appear here.';
    }
  }

  selectChartFilter(filter: '3M' | '6M' | '1Y'): void {
    this.selectedChartFilter = filter;
    this.cdr.detectChanges();
  }

  exportStatement(): void {
    if (this.exporting) {
      return;
    }

    this.exporting = true;
    this.cdr.detectChanges();

    this.paymentService.exportFreelancerStatement().subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `freelancer-earnings-statement-${this.formatFileDate(new Date())}.xls`;
        link.click();
        URL.revokeObjectURL(url);
        this.exporting = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.exporting = false;
        this.errorMessage = 'Unable to export statement right now.';
        this.cdr.detectChanges();
      },
    });
  }

  openAddPaymentModal(): void {
    this.isAddPaymentModalOpen = true;
    this.addPaymentError = '';
    this.addPaymentForm = {
      type: 'bank',
      accountHolder: '',
      paypalEmail: '',
      accountNumber: '',
      routingNumber: '',
      bankName: '',
      isPrimary: false,
    };
  }

  closeAddPaymentModal(): void {
    this.isAddPaymentModalOpen = false;
    this.addPaymentError = '';
  }

  selectPaymentType(type: PaymentType): void {
    this.addPaymentForm.type = type;
    this.addPaymentError = '';
  }

  submitAddPaymentMethod(): void {
    const form = this.addPaymentForm;

    if (!form.accountHolder.trim()) {
      this.addPaymentError = 'Please enter account holder name.';
      return;
    }

    if (form.type === 'paypal') {
      if (!form.paypalEmail.trim()) {
        this.addPaymentError = 'Please enter PayPal email.';
        return;
      }

      const newMethod: PaymentMethodItem = {
        type: 'paypal',
        display: form.paypalEmail.trim(),
        isPrimary: form.isPrimary,
      };

      this.applyPrimaryMethod(newMethod);
      this.closeAddPaymentModal();
      return;
    }

    if (!form.accountNumber.trim()) {
      this.addPaymentError = 'Please enter account number.';
      return;
    }

    if (!form.routingNumber.trim()) {
      this.addPaymentError = 'Please enter routing number.';
      return;
    }

    if (!form.bankName.trim()) {
      this.addPaymentError = 'Please enter bank name.';
      return;
    }

    const last4 = form.accountNumber.trim().slice(-4);

    const newMethod: PaymentMethodItem = {
      type: 'bank',
      display: `********** ${last4}`,
      isPrimary: form.isPrimary,
    };

    this.applyPrimaryMethod(newMethod);
    this.closeAddPaymentModal();
  }

  applyPrimaryMethod(newMethod: PaymentMethodItem): void {
    if (newMethod.isPrimary) {
      this.paymentMethods = this.paymentMethods.map((method) => ({
        ...method,
        isPrimary: false,
      }));
    }

    if (!this.paymentMethods.some((method) => method.isPrimary) && !newMethod.isPrimary) {
      newMethod.isPrimary = true;
    }

    this.paymentMethods = [newMethod, ...this.paymentMethods];
    const primary = this.paymentMethods.find((method) => method.isPrimary);
    this.selectedWithdrawMethod = primary ? primary.display : '';
  }

  getTransactionStatusClass(status: TransactionStatus): string {
    switch (status) {
      case 'Cleared':
      case 'Done':
        return 'bg-[#dcfce7] text-[#16a34a]';
      case 'Pending':
        return 'bg-[#fef3c7] text-[#d97706]';
      case 'Failed':
      case 'Cancelled':
        return 'bg-[#fee2e2] text-[#dc2626]';
      default:
        return 'bg-[#f3f4f6] text-[#6b7280]';
    }
  }

  getAbsoluteAmount(amount: number): string {
    return this.formatCurrency(Math.abs(amount));
  }

  formatCurrency(value: number): string {
    return Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  private formatCompactCurrency(value: number): string {
    return Number(value || 0).toLocaleString(undefined, {
      maximumFractionDigits: value >= 100 ? 0 : 2,
    });
  }

  private formatDateTime(value?: string | null): string {
    if (!value) {
      return 'No date';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  private toTimestamp(value?: string | null): number {
    if (!value) {
      return 0;
    }

    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  private formatFileDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
