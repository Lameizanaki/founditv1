import { HttpClient } from '@angular/common/http';
import { Injectable, NgZone } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import { BehaviorSubject, Subject } from 'rxjs';
import SockJS from 'sockjs-client';
import { env } from '../../../environments/env';

export interface AdminNotification {
  key: string;
  type: string;
  title: string;
  message: string;
  route: string;
  createdAt: string | null;
  data: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class AdminNotificationService {
  private readonly baseUrl = `${env.apiUrl}/admin/notifications`;
  private readonly notificationsSubject = new BehaviorSubject<AdminNotification[]>([]);
  private readonly unreadSubject = new BehaviorSubject<boolean>(false);
  private readonly realtimeNotificationSubject = new Subject<AdminNotification>();
  private stompClient: Client | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  readonly notifications$ = this.notificationsSubject.asObservable();
  readonly unread$ = this.unreadSubject.asObservable();
  readonly realtimeNotifications$ = this.realtimeNotificationSubject.asObservable();

  constructor(
    private http: HttpClient,
    private ngZone: NgZone,
  ) {}

  load(): void {
    this.http.get<AdminNotification[]>(this.baseUrl).subscribe({
      next: (notifications) => {
        const previousKeys = new Set(this.notificationsSubject.value.map((item) => item.key));
        const normalized = (notifications ?? []).map((item) => this.normalize(item));
        const hasNewFromRefresh =
          previousKeys.size > 0 && normalized.some((item) => !previousKeys.has(item.key));
        this.notificationsSubject.next(normalized);
        this.unreadSubject.next(hasNewFromRefresh || this.hasUnread(normalized));
      },
      error: () => {
        this.notificationsSubject.next(this.notificationsSubject.value);
      },
    });
  }

  startRealtime(): void {
    if (this.stompClient?.active) return;
    this.startPolling();

    const client = new Client({
      webSocketFactory: () => new SockJS(env.webSocketUrl ?? `${env.apiUrl}/ws`),
      connectHeaders: this.buildConnectHeaders(),
      reconnectDelay: 5000,
      debug: () => undefined,
    });

    client.onConnect = () => {
      client.subscribe('/topic/admin/notifications', (message: IMessage) => {
        this.ngZone.run(() => {
          const notification = this.fromSocket(message);
          if (!notification) return;

          this.notificationsSubject.next([
            notification,
            ...this.notificationsSubject.value.filter((item) => item.key !== notification.key),
          ].slice(0, 30));
          this.realtimeNotificationSubject.next(notification);
          this.unreadSubject.next(true);
        });
      });
    };

    this.stompClient = client;
    client.activate();
  }

  stopRealtime(): void {
    this.stompClient?.deactivate();
    this.stompClient = null;
    this.stopPolling();
  }

  markAllRead(): void {
    const keys = this.notificationsSubject.value.map((item) => item.key);
    localStorage.setItem(this.readStorageKey(), JSON.stringify(keys));
    this.unreadSubject.next(false);
  }

  private startPolling(): void {
    if (this.pollTimer) return;
    this.pollTimer = setInterval(() => this.load(), 15000);
  }

  private stopPolling(): void {
    if (!this.pollTimer) return;
    clearInterval(this.pollTimer);
    this.pollTimer = null;
  }

  private fromSocket(message: IMessage): AdminNotification | null {
    try {
      const event = JSON.parse(message.body) as {
        type?: string;
        title?: string;
        message?: string;
        createdAt?: string;
        data?: Record<string, unknown>;
      };
      const data = event.data ?? {};
      const reportId = typeof data['reportId'] === 'number' ? data['reportId'] : null;
      const ekycId = typeof data['ekycId'] === 'number' ? data['ekycId'] : null;
      return this.normalize({
        key: reportId ? `report:${reportId}` : ekycId ? `ekyc:${ekycId}` : `socket:${Date.now()}`,
        type: event.type ?? 'admin_notification',
        title: event.title ?? 'Admin notification',
        message: event.message ?? 'A new admin item needs review.',
        route: typeof data['route'] === 'string' ? data['route'] : '/admin/dashboard',
        createdAt: event.createdAt ?? new Date().toISOString(),
        data,
      });
    } catch {
      return null;
    }
  }

  private normalize(notification: AdminNotification): AdminNotification {
    return {
      ...notification,
      data: notification.data ?? {},
      route: notification.route || '/admin/dashboard',
    };
  }

  private hasUnread(notifications: AdminNotification[]): boolean {
    const readKeys = this.readKeys();
    return notifications.some((item) => !readKeys.includes(item.key));
  }

  private readKeys(): string[] {
    try {
      const parsed = JSON.parse(localStorage.getItem(this.readStorageKey()) ?? '[]') as unknown;
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
    } catch {
      return [];
    }
  }

  private readStorageKey(): string {
    return 'foundit:admin:notification:read';
  }

  private buildConnectHeaders(): Record<string, string> {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}
