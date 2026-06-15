import { inject, Injectable } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import { BehaviorSubject, Subject } from 'rxjs';
import SockJS from 'sockjs-client';
import { env } from '../../../environments/env';
import {
  NotificationPreferenceKey,
  NotificationScope,
  NotificationPreferenceService,
} from './notification-preference.service';

export interface NotificationSocketEvent {
  type?: string;
  title?: string;
  message?: string;
  hireRequestId?: number;
  projectId?: number;
  status?: string;
  createdAt?: string;
  data?: Record<string, unknown>;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationRefreshService {
  private readonly notificationPreferenceService = inject(NotificationPreferenceService);
  private readonly refreshSubject = new Subject<void>();
  private readonly socketEventSubject = new Subject<NotificationSocketEvent>();
  private readonly unreadStateSubject = new BehaviorSubject<Record<string, boolean>>({
    client: false,
    freelancer: false,
  });
  private stompClient: Client | null = null;
  private stompReadyPromise: Promise<void> | null = null;

  readonly refresh$ = this.refreshSubject.asObservable();
  readonly socketEvents$ = this.socketEventSubject.asObservable();
  readonly unreadState$ = this.unreadStateSubject.asObservable();

  requestRefresh(): void {
    this.refreshSubject.next();
  }

  hasUnread(scope: string): boolean {
    return this.getUnreadKeys(scope).length > 0;
  }

  isRead(scope: string, key: string): boolean {
    return this.getReadKeys(scope).includes(key);
  }

  setUnreadKeys(scope: string, keys: string[]): void {
    this.writeKeys(this.unreadStorageKey(scope), keys);
    this.emitUnreadState(scope);
  }

  markAllAsRead(scope: string, keys: string[]): void {
    const readKeys = new Set([...this.getReadKeys(scope), ...keys]);
    this.writeKeys(this.readStorageKey(scope), [...readKeys]);
    this.setUnreadKeys(scope, []);
  }

  startRealtimeConnection(): void {
    this.emitUnreadState('client');
    this.emitUnreadState('freelancer');
    this.ensureSocketConnection().catch(() => {
      // REST refresh remains available; retry happens the next time the page starts realtime.
    });
  }

  private ensureSocketConnection(): Promise<void> {
    if (this.stompClient?.connected) {
      return Promise.resolve();
    }

    if (this.stompReadyPromise) {
      return this.stompReadyPromise;
    }

    this.stompReadyPromise = new Promise<void>((resolve, reject) => {
      try {
        const client = new Client({
          webSocketFactory: () => new SockJS(env.webSocketUrl ?? `${env.apiUrl}/ws`),
          connectHeaders: this.buildConnectHeaders(),
          reconnectDelay: 5000,
          debug: () => undefined,
        });

        client.onConnect = () => {
          client.subscribe('/user/queue/notifications', (message: IMessage) => {
            try {
              this.socketEventSubject.next(JSON.parse(message.body) as NotificationSocketEvent);
            } catch {
              this.socketEventSubject.next({});
            }

            this.setHasRealtimeUnread(true, this.resolvePreferenceKey(this.parseMessageBody(message)));
            this.requestRefresh();
          });

          resolve();
        };

        client.onStompError = () => reject(new Error('Notification STOMP connection failed'));
        client.onWebSocketError = () => reject(new Error('Notification WebSocket connection failed'));

        this.stompClient = client;
        client.activate();
      } catch (error) {
        this.cleanupSocket();
        reject(error);
      }
    }).finally(() => {
      this.stompReadyPromise = null;
    });

    return this.stompReadyPromise;
  }

  private cleanupSocket(): void {
    this.stompClient?.deactivate();
    this.stompClient = null;
  }

  private buildConnectHeaders(): Record<string, string> {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private setHasRealtimeUnread(value: boolean, preferenceKey: NotificationPreferenceKey | null): void {
    const scope = this.resolveCurrentScope();
    if (
      !preferenceKey ||
      !this.notificationPreferenceService.isEnabled(scope as NotificationScope, preferenceKey)
    ) {
      this.emitUnreadState(scope);
      return;
    }

    const key = `socket:${Date.now()}`;
    if (value) {
      this.setUnreadKeys(scope, [...this.getUnreadKeys(scope), key]);
    }
  }

  private parseMessageBody(message: IMessage): NotificationSocketEvent {
    try {
      return JSON.parse(message.body) as NotificationSocketEvent;
    } catch {
      return {};
    }
  }

  private resolvePreferenceKey(event: NotificationSocketEvent): NotificationPreferenceKey | null {
    const text = `${event.type ?? ''} ${event.title ?? ''} ${event.message ?? ''}`.toLowerCase();
    if (text.includes('message') || text.includes('chat')) return 'messages';
    if (text.includes('hire') || text.includes('job') || text.includes('offer')) {
      return 'newJobOffers';
    }
    if (text.includes('review') || text.includes('rating')) return 'reviewsAndRatings';
    if (text.includes('payment') || text.includes('order') || text.includes('project')) {
      return 'orderUpdates';
    }
    return null;
  }

  private resolveCurrentScope(): string {
    const path = window.location.pathname.toLowerCase();
    return path.includes('/freelancer') ? 'freelancer' : 'client';
  }

  private getReadKeys(scope: string): string[] {
    return this.readKeys(this.readStorageKey(scope));
  }

  private getUnreadKeys(scope: string): string[] {
    return this.readKeys(this.unreadStorageKey(scope));
  }

  private readStorageKey(scope: string): string {
    return `foundit:${scope}:notification:read`;
  }

  private unreadStorageKey(scope: string): string {
    return `foundit:${scope}:notification:unread`;
  }

  private readKeys(storageKey: string): string[] {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) ?? '[]') as unknown;
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
    } catch {
      return [];
    }
  }

  private writeKeys(storageKey: string, keys: string[]): void {
    localStorage.setItem(storageKey, JSON.stringify([...new Set(keys)]));
  }

  private emitUnreadState(scope: string): void {
    this.unreadStateSubject.next({
      ...this.unreadStateSubject.value,
      [scope]: this.hasUnread(scope),
    });
  }
}
