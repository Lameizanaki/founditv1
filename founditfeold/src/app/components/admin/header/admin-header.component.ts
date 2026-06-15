import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LucideAngularModule, Bell, CircleUserRound, LogOut } from 'lucide-angular';
import { Subscription } from 'rxjs';
import { AdminNotification, AdminNotificationService } from '../../../services/admin/admin-notification.service';
import { LoginService } from '../../../services/auth/Login/login.service';

@Component({
  selector: 'app-admin-header-component',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './admin-header.component.html',
})
export class AdminHeaderComponent implements OnInit, OnDestroy {
  readonly icons = {
    Bell,
    CircleUserRound,
    LogOut,
  };

  notifications: AdminNotification[] = [];
  hasUnread = false;
  isOpen = false;
  isUserMenuOpen = false;
  private subscription = new Subscription();

  constructor(
    private adminNotificationService: AdminNotificationService,
    private loginService: LoginService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.subscription.add(
      this.adminNotificationService.notifications$.subscribe((notifications) => {
        this.notifications = notifications;
      }),
    );
    this.subscription.add(
      this.adminNotificationService.unread$.subscribe((hasUnread) => {
        this.hasUnread = hasUnread;
      }),
    );
    this.adminNotificationService.load();
    this.adminNotificationService.startRealtime();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  toggleNotifications(): void {
    this.isOpen = !this.isOpen;
    this.isUserMenuOpen = false;
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen = !this.isUserMenuOpen;
    this.isOpen = false;
  }

  openNotification(notification: AdminNotification): void {
    this.isOpen = false;
    void this.router.navigateByUrl(notification.route);
  }

  markNotificationsRead(): void {
    this.adminNotificationService.markAllRead();
  }

  logout(): void {
    this.isUserMenuOpen = false;
    this.adminNotificationService.stopRealtime();
    this.loginService.logout();
    void this.router.navigate(['/admin/login']);
  }

  formatDate(value: string | null): string {
    if (!value) return 'Needs review';
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }
}
