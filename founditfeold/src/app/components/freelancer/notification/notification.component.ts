import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { catchError, forkJoin, of, Subscription } from 'rxjs';
import { ChatService, HireRequestResponse } from '../../../services/chat/chat.service';
import {
  PaymentService,
  PaymentTransactionResponse,
} from '../../../services/payment/payment.service';
import { NotificationRefreshService } from '../../../services/notification/notification-refresh.service';
import { NotificationPreferenceService } from '../../../services/notification/notification-preference.service';

type NotificationType = 'message' | 'order' | 'alert';

interface NotificationItem {
  key: string;
  id: number;
  title: string;
  description: string;
  time: string;
  type: NotificationType;
  isRead: boolean;
  sortValue: number;
}

@Component({
  selector: 'app-freelancer-notification-component',
  templateUrl: './notification.component.html',
  imports: [CommonModule, LucideAngularModule],
})
export class NotificationsComponent implements OnInit, OnDestroy {
  private readonly chatService = inject(ChatService);
  private readonly paymentService = inject(PaymentService);
  private readonly notificationRefreshService = inject(NotificationRefreshService);
  private readonly notificationPreferenceService = inject(NotificationPreferenceService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly archiveStorageKey = 'foundit:freelancer:notification:archive';
  private readonly maxArchivedNotifications = 100;
  private refreshSubscription?: Subscription;
  private refreshHandle: ReturnType<typeof setInterval> | null = null;

  notifications: NotificationItem[] = [];
  loading = true;
  error = '';

  ngOnInit(): void {
    this.loadNotifications();
    this.notificationRefreshService.startRealtimeConnection();
    this.refreshSubscription = this.notificationRefreshService.refresh$.subscribe(() => {
      this.loadNotifications(false);
    });
    this.refreshHandle = setInterval(() => this.loadNotifications(false), 5000);
  }

  ngOnDestroy(): void {
    this.refreshSubscription?.unsubscribe();
    if (this.refreshHandle !== null) {
      clearInterval(this.refreshHandle);
      this.refreshHandle = null;
    }
  }

  loadNotifications(showLoading = true): void {
    if (showLoading) {
      this.loading = true;
    }
    this.error = '';

    forkJoin({
      requests: this.chatService.getMyHireRequests().pipe(catchError(() => of([]))),
      transactions: this.paymentService.getFreelancerTransactions().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ requests, transactions }) => {
        const requestNotifications = this.notificationPreferenceService.isEnabled(
          'freelancer',
          'newJobOffers',
        )
          ? (requests as HireRequestResponse[])
              .map((request) => this.mapHireRequestNotification(request))
          : [];
        const paymentNotifications = this.notificationPreferenceService.isEnabled(
          'freelancer',
          'orderUpdates',
        )
          ? (transactions as PaymentTransactionResponse[])
              .filter((transaction) =>
                ['PAYMENT_SUBMITTED', 'PAID'].includes(String(transaction.status ?? '').toUpperCase()),
              )
              .map((transaction) => this.mapPaymentNotification(transaction))
          : [];

        this.notifications = this.mergeWithArchivedNotifications([
          ...requestNotifications,
          ...paymentNotifications,
        ]);
        this.archiveNotifications(this.notifications);
        this.notificationRefreshService.setUnreadKeys(
          'freelancer',
          this.notifications
            .filter((notification) => !notification.isRead)
            .map((notification) => notification.key),
        );
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Unable to load notifications right now.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  markAllAsRead(): void {
    this.notificationRefreshService.markAllAsRead(
      'freelancer',
      this.notifications.map((notification) => notification.key),
    );
    this.notifications = this.notifications.map((notification) => ({
      ...notification,
      isRead: true,
    }));
    this.archiveNotifications(this.notifications);
    this.cdr.detectChanges();
  }

  private mapHireRequestNotification(request: HireRequestResponse): NotificationItem {
    const serviceTitle = request.gigTitle || 'your service';
    const status = String(request.status ?? '').toLowerCase();

    return {
      key: this.hireRequestNotificationKey(request),
      id: request.id,
      title: this.hireRequestTitle(status),
      description: this.hireRequestDescription(request.clientName, serviceTitle, status),
      time: this.formatRelativeTime(this.notificationTime(request)),
      type: status === 'cancelled' || status === 'rejected' ? 'alert' : 'order',
      isRead: this.notificationRefreshService.isRead(
        'freelancer',
        this.hireRequestNotificationKey(request),
      ),
      sortValue: this.timestamp(this.notificationTime(request)),
    };
  }

  private mapPaymentNotification(transaction: PaymentTransactionResponse): NotificationItem {
    const status = String(transaction.status ?? '').toUpperCase();
    const isSubmitted = status === 'PAYMENT_SUBMITTED';

    return {
      key: this.paymentNotificationKey(transaction),
      id: Number(transaction.id ?? transaction.projectId ?? 0),
      title: isSubmitted ? 'Payment Proof Submitted' : 'Payment Confirmed',
      description: isSubmitted
        ? `Client submitted payment proof for project #${transaction.projectId ?? 'N/A'}. Check your bank app and confirm it.`
        : `Client payment for project #${transaction.projectId ?? 'N/A'} is paid.`,
      time: this.formatRelativeTime(transaction.paidAt ?? transaction.createdAt ?? undefined),
      type: 'order',
      isRead: this.notificationRefreshService.isRead(
        'freelancer',
        this.paymentNotificationKey(transaction),
      ),
      sortValue: this.timestamp(transaction.paidAt ?? transaction.createdAt ?? undefined),
    };
  }

  private hireRequestNotificationKey(request: HireRequestResponse): string {
    return `hire:${request.id}:${request.status}:${request.projectId ?? 'none'}`;
  }

  private paymentNotificationKey(transaction: PaymentTransactionResponse): string {
    return `payment:${transaction.id ?? 'none'}:${transaction.projectId ?? 'none'}:${transaction.status ?? 'unknown'}`;
  }

  private hireRequestTitle(status: string): string {
    switch (status) {
      case 'accepted':
        return 'Hire Request Accepted';
      case 'rejected':
        return 'Hire Request Rejected';
      case 'cancelled':
        return 'Hire Request Cancelled';
      case 'pending':
        return 'New Hire Request';
      default:
        return 'Hire Request Updated';
    }
  }

  private hireRequestDescription(
    clientName: string | undefined,
    serviceTitle: string,
    status: string,
  ): string {
    const name = clientName || 'A client';

    switch (status) {
      case 'accepted':
        return `You accepted the hire request from ${name} for "${serviceTitle}".`;
      case 'rejected':
        return `You rejected the hire request from ${name} for "${serviceTitle}".`;
      case 'cancelled':
        return `${name} cancelled the hire request for "${serviceTitle}".`;
      case 'pending':
        return `${name} sent a hire request for "${serviceTitle}".`;
      default:
        return `${name}'s hire request for "${serviceTitle}" was updated.`;
    }
  }

  private mergeWithArchivedNotifications(liveNotifications: NotificationItem[]): NotificationItem[] {
    const archived = this.readArchivedNotifications();
    const byKey = new Map<string, NotificationItem>();

    for (const notification of archived) {
      byKey.set(notification.key, notification);
    }

    for (const notification of liveNotifications) {
      byKey.set(notification.key, notification);
    }

    return [...byKey.values()]
      .sort((a, b) => this.sortNewestFirst(a, b))
      .slice(0, this.maxArchivedNotifications);
  }

  private archiveNotifications(notifications: NotificationItem[]): void {
    localStorage.setItem(
      this.archiveStorageKey,
      JSON.stringify(notifications.slice(0, this.maxArchivedNotifications)),
    );
  }

  private readArchivedNotifications(): NotificationItem[] {
    try {
      const parsed = JSON.parse(localStorage.getItem(this.archiveStorageKey) ?? '[]') as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter((item): item is NotificationItem => this.isNotificationItem(item));
    } catch {
      return [];
    }
  }

  private isNotificationItem(item: unknown): item is NotificationItem {
    if (!item || typeof item !== 'object') {
      return false;
    }

    const record = item as Record<string, unknown>;
    return (
      typeof record['key'] === 'string' &&
      typeof record['id'] === 'number' &&
      typeof record['title'] === 'string' &&
      typeof record['description'] === 'string' &&
      typeof record['time'] === 'string' &&
      typeof record['type'] === 'string' &&
      typeof record['isRead'] === 'boolean' &&
      typeof record['sortValue'] === 'number'
    );
  }

  private notificationTime(request: HireRequestResponse): string | undefined {
    return request.updatedAt ?? request.createdAt;
  }

  private sortNewestFirst(a: NotificationItem, b: NotificationItem): number {
    return b.sortValue - a.sortValue || b.id - a.id;
  }

  private formatRelativeTime(value?: string | null): string {
    const time = this.timestamp(value);
    if (!time) {
      return '';
    }

    const diffMs = Date.now() - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return new Date(time).toLocaleDateString();
  }

  private timestamp(value?: string | null): number {
    if (!value) {
      return 0;
    }

    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }
}
