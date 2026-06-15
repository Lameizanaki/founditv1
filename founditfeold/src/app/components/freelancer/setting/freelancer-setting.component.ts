import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  Bell,
  CreditCard,
  History,
  LogOut,
  Plus,
  Settings,
  Shield,
  Upload,
  User,
  LucideAngularModule,
} from 'lucide-angular';
import { LoginService } from '../../../services/auth/Login/login.service';
import {
  FreelancerProfileRequest,
  FreelancerProfileResponse,
} from '../../../services/Freelancer/Profile/freelancer-profile.models';
import { FreelancerProfileService } from '../../../services/Freelancer/Profile/freelancer-profile.service';
import { SettingService } from '../../../services/Freelancer/Setting/setting.service';
import { SettingRequest } from '../../../services/Freelancer/Setting/SettingRequest';
import { SettingResponse } from '../../../services/Freelancer/Setting/SettingResponse';
import {
  NotificationPreference,
  NotificationPreferenceService,
} from '../../../services/notification/notification-preference.service';
import { ChatService } from '../../../services/chat/chat.service';
import { NotificationRefreshService } from '../../../services/notification/notification-refresh.service';
import { ImageUrlService } from '../../../services/media/image-url.service';

type SettingsTab = 'personal' | 'notifications' | 'security' | 'payments';

@Component({
  selector: 'app-freelancer-setting-component',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './freelancer-setting.component.html',
  styleUrls: ['./freelancer-setting.component.css'],
})
export class FreelancerSettingsComponent implements OnInit {
  private profileService = inject(FreelancerProfileService);
  private settingService = inject(SettingService);
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
  errorMessage = '';
  successMessage = '';
  profileLoaded = false;

  icons = {
    Settings,
    LogOut,
    Upload,
    CreditCard,
    History,
    Plus,
  };

  menuItems = [
    { key: 'personal' as SettingsTab, label: 'Personal Information', icon: User },
    { key: 'notifications' as SettingsTab, label: 'Notifications', icon: Bell },
    { key: 'security' as SettingsTab, label: 'Security', icon: Shield },
    { key: 'payments' as SettingsTab, label: 'Payment Methods', icon: CreditCard },
  ];

  profile: SettingResponse = {
    username: '',
    email: '',
    avatarProfileName: '',
    avatarProfileType: '',
    avatarProfileUrl: '',
  };

  private profileExists = false;

  avatarPreview: string | null = null;
  selectedAvatarFile: File | null = null;
  bankQrPreview: string | null = null;
  selectedBankQrFile: File | null = null;
  bankQrName = '';

  notifications: NotificationPreference[] = [];

  get avatarSrc(): string {
    return (
      this.avatarPreview ||
      this.imageUrlService.fromDataOrUrl(
        typeof this.profile.avatarProfileData === 'string' ? this.profile.avatarProfileData : '',
        this.profile.avatarProfileType,
        this.profile.avatarProfileUrl,
      ) ||
      this.defaultAvatarUrl
    );
  }

  security = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  };

  paymentHistory: Array<{
    title: string;
    date: string;
    status: string;
    amount: number;
  }> = [];

  ngOnInit(): void {
    this.notifications = this.notificationPreferenceService.getPreferences('freelancer');
    this.loadProfile();
  }

  toggleNotification(item: NotificationPreference): void {
    item.enabled = !item.enabled;
    this.notificationPreferenceService.setPreference('freelancer', item.key, item.enabled);
    if (!item.enabled) {
      if (item.key === 'messages') {
        this.chatService.markChatRead('freelancer');
      } else {
        this.notificationRefreshService.setUnreadKeys('freelancer', []);
      }
    }
    this.successMessage = '';
    this.errorMessage = '';
  }

  saveNotificationPreferences(): void {
    this.notificationPreferenceService.setPreferences('freelancer', this.notifications);
    this.successMessage = 'Notification preferences saved.';
    this.errorMessage = '';
  }

  /**
   * Load current freelancer profile settings
   */
  loadProfile(): void {
    if (!this.loginService.isLoggedIn()) {
      this.errorMessage = 'Please sign in again to continue setting up your freelancer profile.';
      void this.router.navigate(['/auth/sign-in']);
      return;
    }

    this.profileService.ensureMyProfile().subscribe({
      next: (response) => {
        this.profile = this.mapProfileToSettingsView(response);
        this.profileExists = true;
        this.profileLoaded = true;
        this.loadBankQrSetting();
        // ensure view updates after async profile load
        setTimeout(() => {
          try {
            this.cd.detectChanges();
          } catch {
            // ignore
          }
        });
      },
      error: (error) => {
        console.error('Error loading profile:', error);
        if (error.status === 0) {
          this.errorMessage = 'Network error: Cannot connect to backend';
        } else {
          this.errorMessage = error.error?.message || 'Failed to load profile';
        }
      },
    });
  }

  private loadBankQrSetting(): void {
    this.settingService.getMySetting().subscribe({
      next: (setting) => {
        this.bankQrName = setting.bankQrName ?? '';
        this.bankQrPreview = this.toImageSource(
          setting.bankQrData ?? null,
          setting.bankQrType ?? 'image/jpeg',
        );
        this.cd.detectChanges();
      },
      error: () => {
        this.bankQrName = '';
        this.bankQrPreview = null;
      },
    });
  }

  /**
   * Handle avatar file selection
   */
  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.errorMessage = '';
    this.successMessage = '';

    if (input.files && input.files[0]) {
      this.selectedAvatarFile = input.files[0];
      this.avatarPreview = URL.createObjectURL(this.selectedAvatarFile);
    }
  }

  /**
   * Upload avatar for profile (new profile setup or update)
   */
  uploadAvatar(): void {
    if (!this.selectedAvatarFile) {
      this.errorMessage = '';
      this.successMessage = '';
      return;
    }

    if (!this.loginService.isLoggedIn()) {
      this.errorMessage = 'Your session has expired. Please sign in again.';
      void this.router.navigate(['/auth/sign-in']);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const upload = (): void => {
      this.profileService.createAvatar(this.selectedAvatarFile as File).subscribe({
        next: (response) => {
          this.profile = this.mapProfileToSettingsView(response);
          this.profileLoaded = true;
          this.selectedAvatarFile = null;
          this.avatarPreview = null;
          this.isLoading = false;
          this.successMessage = '';

          // ensure change detection after avatar data changes
          setTimeout(() => {
            try {
              this.cd.detectChanges();
            } catch {
              // ignore
            }
          });

          this.router.navigate(['/freelancer/dashboard']);
        },
        error: (error) => {
          console.error('Error updating avatar:', error);
          this.isLoading = false;
          if (error.status === 0) {
            this.errorMessage = 'Network error: Cannot connect to backend';
          } else if (error.status === 400) {
            this.errorMessage = error.error?.message || 'Invalid avatar file';
          } else {
            this.errorMessage = error.error?.message || 'Failed to update avatar';
          }
        },
      });
    };

    if (this.profileExists) {
      upload();
      return;
    }

    this.profileService.createProfile(this.buildDefaultProfileRequest()).subscribe({
      next: (response) => {
        this.profileExists = true;
        this.profile = this.mapProfileToSettingsView(response);
        // ensure view updates after new profile creation
        setTimeout(() => {
          try {
            this.cd.detectChanges();
          } catch {
            // ignore
          }
        });
        upload();
      },
      error: (error) => {
        console.error('Error creating profile:', error);
        this.isLoading = false;
        if (error.status === 0) {
          this.errorMessage = 'Network error: Cannot connect to backend';
        } else if (error.status === 400) {
          this.errorMessage = error.error?.message || 'Invalid profile data';
        } else {
          this.errorMessage = error.error?.message || 'Failed to create profile';
        }
      },
    });
  }

  onBankQrSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedBankQrFile = file;
    this.errorMessage = '';
    this.successMessage = '';

    if (!file) {
      return;
    }

    this.bankQrName = file.name;
    this.bankQrPreview = URL.createObjectURL(file);
  }

  uploadBankQr(): void {
    if (!this.selectedBankQrFile) {
      this.errorMessage = 'Please choose your seller bank QR image first.';
      this.successMessage = '';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.settingService.uploadBankQr(this.selectedBankQrFile).subscribe({
      next: (setting) => {
        this.isLoading = false;
        this.selectedBankQrFile = null;
        this.bankQrName = setting.bankQrName ?? this.bankQrName;
        this.bankQrPreview = this.toImageSource(
          setting.bankQrData ?? null,
          setting.bankQrType ?? 'image/jpeg',
        );
        this.successMessage = 'Seller bank QR uploaded.';
        this.cd.detectChanges();
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || error.error || 'Failed to upload seller bank QR';
        this.cd.detectChanges();
      },
    });
  }

  /**
   * Change password
   */
  changePassword(): void {
    if (!this.security.currentPassword || !this.security.newPassword) {
      this.errorMessage = 'Current password and new password are required';
      return;
    }

    if (this.security.newPassword !== this.security.confirmPassword) {
      this.errorMessage = 'New password and confirm password do not match';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const request: SettingRequest = {
      currentPassword: this.security.currentPassword,
      newPassword: this.security.newPassword,
    };

    this.settingService.changePassword(request).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Password changed successfully!';
        this.security = {
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        };
      },
      error: (error) => {
        console.error('Error changing password:', error);
        this.isLoading = false;
        if (error.status === 0) {
          this.errorMessage = 'Network error: Cannot connect to backend';
        } else if (error.status === 400) {
          this.errorMessage = error.error?.message || 'Invalid password';
        } else {
          this.errorMessage = error.error?.message || 'Failed to change password';
        }
      },
    });
  }

  private mapProfileToSettingsView(response: FreelancerProfileResponse): SettingResponse {
    const identity = this.readTokenIdentity();

    return {
      username: identity.email || response.freelancerName || identity.name || '',
      email: identity.email || '',
      avatarProfileData: this.normalizeAvatarData(response.profilePictureData),
      avatarProfileUrl: response.profilePictureUrl || '',
      avatarProfileName: response.profilePictureName || '',
      avatarProfileType: response.profilePictureType || '',
    };
  }

  private buildDefaultProfileRequest(): FreelancerProfileRequest {
    const identity = this.readTokenIdentity();

    return {
      freelancerName: identity.name || 'Freelancer',
      freelancerJob: '',
      rating: 0,
      workLocation: '',
      yearExperience: 0,
      about: '',
      skill: [],
    };
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
      const name =
        this.readStringClaim(payload, [
          'freelancerName',
          'name',
          'preferred_username',
          'username',
          'sub',
        ]) || '';
      const email = this.readStringClaim(payload, ['email']) || '';

      return { name, email };
    } catch {
      return { name: '', email: '' };
    }
  }

  private readStringClaim(claims: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
      const value = claims[key];
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }

    return null;
  }

  private normalizeAvatarData(value: Uint8Array | string | undefined): string {
    if (!value) {
      return '';
    }

    if (typeof value === 'string') {
      return value.replace(/^data:[^;]+;base64,/, '');
    }

    const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
    let binary = '';

    for (let index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index]);
    }

    return btoa(binary);
  }

  private toImageSource(
    value: Uint8Array | string | number[] | null | undefined,
    contentType: string | null | undefined,
  ): string | null {
    if (!value) {
      return null;
    }

    const mime = contentType?.trim() || 'image/jpeg';
    if (typeof value === 'string') {
      return `data:${mime};base64,${value.replace(/^data:[^;]+;base64,/, '')}`;
    }

    const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
    let binary = '';
    for (let index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index]);
    }

    return `data:${mime};base64,${btoa(binary)}`;
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
