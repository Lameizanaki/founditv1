import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  Bell,
  LogOut,
  LucideAngularModule,
  Settings,
  Shield,
  Upload,
  User,
} from 'lucide-angular';
import { forkJoin } from 'rxjs';
import { ProfileService } from '../../../services/Client/Profile/MeProfile.service';
import { MeProfileResponse } from '../../../services/Client/Profile/MeProfileResponse';
import { LoginService } from '../../../services/auth/Login/login.service';
import {
  NotificationPreference,
  NotificationPreferenceService,
} from '../../../services/notification/notification-preference.service';
import { ChatService } from '../../../services/chat/chat.service';
import { NotificationRefreshService } from '../../../services/notification/notification-refresh.service';
import { ImageUrlService } from '../../../services/media/image-url.service';

type SettingsTab = 'personal' | 'notifications' | 'security';

@Component({
  selector: 'app-client-setting-component',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './client-setting.component.html',
  styleUrls: ['./client-setting.component.css'],
})
export class ClientSettingsComponent implements OnInit {
  private profileService = inject(ProfileService);
  private loginService = inject(LoginService);
  private notificationPreferenceService = inject(NotificationPreferenceService);
  private chatService = inject(ChatService);
  private notificationRefreshService = inject(NotificationRefreshService);
  private imageUrlService = inject(ImageUrlService);
  private router = inject(Router);
  private cd = inject(ChangeDetectorRef);

  readonly defaultAvatarUrl = '/assets/images/default-avatar.png';

  activeTab: SettingsTab = 'personal';
  isLoading = false;
  profileLoaded = false;
  errorMessage = '';
  successMessage = '';
  avatarPreview: string | null = null;
  selectedAvatarFile: File | null = null;

  icons = {
    Settings,
    LogOut,
    Upload,
  };

  menuItems = [
    { key: 'personal' as SettingsTab, label: 'Personal Information', icon: User },
    { key: 'notifications' as SettingsTab, label: 'Notifications', icon: Bell },
    { key: 'security' as SettingsTab, label: 'Security', icon: Shield },
  ];

  profile = {
    id: 0,
    username: '',
    email: '',
    workLocation: '',
    about: '',
    avatarData: '',
    avatarUrl: '',
    avatarType: 'image/jpeg',
    avatarName: '',
  };

  notifications: NotificationPreference[] = [];

  security = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  };

  get avatarSrc(): string {
    return (
      this.avatarPreview ||
      this.imageUrlService.fromDataOrUrl(
        this.profile.avatarData,
        this.profile.avatarType,
        this.profile.avatarUrl,
      ) ||
      this.defaultAvatarUrl
    );
  }

  ngOnInit(): void {
    this.notifications = this.notificationPreferenceService.getPreferences('client');
    this.loadProfile();
  }

  loadProfile(): void {
    if (!this.loginService.isLoggedIn()) {
      this.errorMessage = 'Please sign in again to continue setting up your client profile.';
      void this.router.navigate(['/auth/sign-in']);
      return;
    }

    this.isLoading = true;
    this.profileService.ensureMyProfile().subscribe({
      next: (response) => {
        this.profile = this.mapProfileToSettingsView(response);
        this.profileLoaded = true;
        this.isLoading = false;
        this.refreshView();
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage =
          error?.status === 0
            ? 'Network error: Cannot connect to backend'
            : error?.error?.message || 'Failed to load profile';
        this.refreshView();
      },
    });
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (!file) {
      return;
    }

    this.selectedAvatarFile = file;
    this.avatarPreview = URL.createObjectURL(file);
    this.refreshView();
  }

  savePersonalInformation(): void {
    if (!this.profile.id) {
      this.errorMessage = 'Profile is still loading. Please try again.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const updates = [
      this.profileService.updateContactInfo(this.profile.id, {
        workLocation: this.profile.workLocation,
      }),
      this.profileService.updateAbout(this.profile.id, {
        about: this.profile.about,
      }),
    ];

    const saveProfile$ = forkJoin(updates);
    saveProfile$.subscribe({
      next: (responses) => {
        const latest = responses[responses.length - 1];
        this.profile = this.mapProfileToSettingsView(latest);
        this.uploadAvatarAfterProfileSave();
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage =
          error?.status === 0
            ? 'Network error: Cannot connect to backend'
            : error?.error?.message || 'Failed to save profile';
        this.refreshView();
      },
    });
  }

  toggleNotification(item: NotificationPreference): void {
    item.enabled = !item.enabled;
    this.notificationPreferenceService.setPreference('client', item.key, item.enabled);
    if (!item.enabled) {
      if (item.key === 'messages') {
        this.chatService.markChatRead('client');
      } else {
        this.notificationRefreshService.setUnreadKeys('client', []);
      }
    }
    this.successMessage = '';
    this.errorMessage = '';
    this.refreshView();
  }

  saveNotificationPreferences(): void {
    this.notificationPreferenceService.setPreferences('client', this.notifications);
    this.successMessage = 'Notification preferences saved.';
    this.errorMessage = '';
    this.refreshView();
  }

  changePassword(): void {
    if (!this.security.currentPassword || !this.security.newPassword) {
      this.errorMessage = 'Current password and new password are required';
      this.successMessage = '';
      return;
    }

    if (this.security.newPassword !== this.security.confirmPassword) {
      this.errorMessage = 'New password and confirm password do not match';
      this.successMessage = '';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.profileService
      .changePassword({
        currentPassword: this.security.currentPassword,
        newPassword: this.security.newPassword,
      })
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.successMessage = 'Password changed successfully.';
          this.security = {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          };
          this.refreshView();
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage =
            error?.status === 0
              ? 'Network error: Cannot connect to backend'
              : error?.error?.message || error?.error || 'Failed to change password';
          this.refreshView();
        },
      });
  }

  logout(): void {
    this.profileService.clearCache();
    this.loginService.logout();
    void this.router.navigate(['/auth/sign-in']);
  }

  private uploadAvatarAfterProfileSave(): void {
    if (!this.selectedAvatarFile) {
      this.isLoading = false;
      this.successMessage = 'Profile updated successfully.';
      this.refreshView();
      return;
    }

    this.profileService.updateAvatar(this.profile.id, this.selectedAvatarFile).subscribe({
      next: (response) => {
        this.profile = this.mapProfileToSettingsView(response);
        this.selectedAvatarFile = null;
        this.avatarPreview = null;
        this.isLoading = false;
        this.successMessage = 'Profile updated successfully.';
        this.refreshView();
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage =
          error?.status === 0
            ? 'Network error: Cannot connect to backend'
            : error?.error?.message || 'Failed to update avatar';
        this.refreshView();
      },
    });
  }

  private refreshView(): void {
    setTimeout(() => {
      try {
        this.cd.detectChanges();
      } catch {
        // The component may already be destroyed during navigation.
      }
    });
  }

  private mapProfileToSettingsView(response: MeProfileResponse): typeof this.profile {
    const identity = this.readTokenIdentity();

    return {
      id: Number(response.id) || 0,
      username: response.fullName || response.clientName || identity.name || 'Client',
      email: response.email || response.clientEmail || identity.email || '',
      workLocation: response.workLocation || response.location || '',
      about: response.about || response.bio || '',
      avatarData: this.normalizeAvatarData(response.profilePictureData || response.avatar),
      avatarUrl: response.profilePictureUrl || '',
      avatarType: response.profilePictureType || 'image/jpeg',
      avatarName: response.profilePictureName || '',
    };
  }

  private normalizeAvatarData(value: Uint8Array | string | undefined): string {
    if (!value) {
      return '';
    }

    if (typeof value === 'string') {
      return value.replace(/^data:[^;]+;base64,/, '');
    }

    let binary = '';
    for (let index = 0; index < value.length; index += 1) {
      binary += String.fromCharCode(value[index]);
    }
    return btoa(binary);
  }

  private readTokenIdentity(): { name: string; email: string } {
    const token = localStorage.getItem('token');
    if (!token) {
      return { name: '', email: '' };
    }

    const parts = token.split('.');
    if (parts.length < 2) {
      return { name: '', email: '' };
    }

    try {
      const payload = JSON.parse(this.decodeJwtPayload(parts[1])) as Record<string, unknown>;
      return {
        name: this.readStringClaim(payload, ['fullName', 'name', 'preferred_username', 'username']) || '',
        email: this.readStringClaim(payload, ['email']) || '',
      };
    } catch {
      return { name: '', email: '' };
    }
  }

  private readStringClaim(claims: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
      const value = claims[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return null;
  }

  private decodeJwtPayload(base64UrlPayload: string): string {
    const normalized = base64UrlPayload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    return decodeURIComponent(
      atob(padded)
        .split('')
        .map((character) => `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    );
  }
}
