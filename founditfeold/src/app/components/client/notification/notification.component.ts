import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { Subscription } from 'rxjs';
import { ChatService, HireRequestResponse } from '../../../services/chat/chat.service';
import { NotificationRefreshService } from '../../../services/notification/notification-refresh.service';

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
  selector: 'app-client-notification-component',
  templateUrl: './notification.component.html',
  imports: [CommonModule, LucideAngularModule],
})
export class NotificationsComponent implements OnInit, OnDestroy {
  private readonly chatService = inject(ChatService);
  private readonly notificationRefreshService = inject(NotificationRefreshService);
  private readonly cdr = inject(ChangeDetectorRef);
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

    this.chatService.getMyClientHireRequests().subscribe({
      next: (requests) => {
        this.notifications = (requests ?? [])
          .filter((request) => request.status !== 'pending')
          .map((request) => this.mapHireRequestNotification(request))
          .sort((a, b) => this.sortNewestFirst(a, b));
        this.notificationRefreshService.setUnreadKeys(
          'client',
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
      'client',
      this.notifications.map((notification) => notification.key),
    );
    this.notifications = this.notifications.map((notification) => ({
      ...notification,
      isRead: true,
    }));
    this.cdr.detectChanges();
  }

  private mapHireRequestNotification(request: HireRequestResponse): NotificationItem {
    const title =
      request.status === 'accepted'
        ? 'Hire Request Accepted'
        : request.status === 'rejected'
          ? 'Hire Request Rejected'
          : 'Hire Request Updated';
    const serviceTitle = request.gigTitle || 'your service request';
    const description =
      request.status === 'accepted'
        ? `Your hire request for "${serviceTitle}" was accepted. You can proceed with payment.`
        : request.status === 'rejected'
          ? `Your hire request for "${serviceTitle}" was rejected.`
          : `Your hire request for "${serviceTitle}" was ${request.status}.`;

    return {
      key: this.notificationKey(request),
      id: request.id,
      title,
      description,
      time: this.formatRelativeTime(this.notificationTime(request)),
      type: request.status === 'rejected' ? 'alert' : 'order',
      isRead: this.notificationRefreshService.isRead('client', this.notificationKey(request)),
      sortValue: this.timestamp(this.notificationTime(request)),
    };
  }

  private notificationTime(request: HireRequestResponse): string | undefined {
    return request.updatedAt ?? request.createdAt;
  }

  private sortNewestFirst(a: NotificationItem, b: NotificationItem): number {
    return b.sortValue - a.sortValue || b.id - a.id;
  }

  private notificationKey(request: HireRequestResponse): string {
    return `hire:${request.id}:${request.status}:${request.projectId ?? 'none'}`;
  }

  private formatRelativeTime(value?: string): string {
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

  private timestamp(value?: string): number {
    if (!value) {
      return 0;
    }

    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }
}
