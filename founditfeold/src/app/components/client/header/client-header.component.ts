import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import {
  Bell,
  BriefcaseBusiness,
  ChevronDown,
  ChevronRight,
  CreditCard,
  House,
  LogOut,
  LucideAngularModule,
  MessageSquareMore,
  Search,
  Settings,
  SquarePlus,
  User,
} from 'lucide-angular';
import { catchError, finalize, Observable, of } from 'rxjs';
import { env } from '../../../../environments/env';
import { ProfileService } from '../../../services/Client/Profile/MeProfile.service';
import { ChatService } from '../../../services/chat/chat.service';
import { NotificationRefreshService } from '../../../services/notification/notification-refresh.service';
import { LoginService } from '../../../services/auth/Login/login.service';

// ── Types ──────────────────────────────────────────────────────────────────────
type MenuToggle = 'dashboard' | 'find-freelancers' | 'browse-gigs' | 'orders';
type MessageToggle = 'read' | 'unread';
type NotificationToggle = 'notify' | 'unnotify';
type KycStatus = 'verified' | 'pending' | 'not_started';

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl: string;
  kycStatus: KycStatus;
}

interface KycBadgeConfig {
  label: string;
  classes: string;
  dotClass: string;
}

interface MenuItem {
  key: string;
  label: string;
  desc: string;
  icon: any;
  accent: boolean;
}

// ── KYC badge config ───────────────────────────────────────────────────────────
const KYC_BADGE: Record<KycStatus, KycBadgeConfig> = {
  verified: {
    label: 'KYC Completed',
    classes: 'bg-emerald-50 text-emerald-700',
    dotClass: 'bg-emerald-500',
  },
  pending: {
    label: 'KYC Pending',
    classes: 'bg-amber-50 text-amber-700',
    dotClass: 'bg-amber-400',
  },
  not_started: {
    label: 'Required eKyc',
    classes: 'bg-rose-50 text-rose-700',
    dotClass: 'bg-rose-500',
  },
};

// (profile cache removed)

@Component({
  selector: 'app-client-header-component',
  templateUrl: './client-header.component.html',

  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterLink],
})
export class ClientHeaderComponent implements OnInit, OnDestroy {
  private elRef = inject(ElementRef);
  private http = inject(HttpClient);
  private router = inject(Router);
  private profileService = inject(ProfileService);
  private chatService = inject(ChatService);
  private notificationRefreshService = inject(NotificationRefreshService);
  private loginService = inject(LoginService);
  private destroy$ = new Subject<void>();
  private apiUrl = env.apiUrl;

  // ── Lucide icons ─────────────────────────────────────────────────────────
  icons = {
    House,
    Search,
    SquarePlus,
    BriefcaseBusiness,
    MessageSquareMore,
    Bell,
    ChevronDown,
    ChevronRight,
    User,
    Settings,
    CreditCard,
    LogOut,
  };

  // ── Nav / notification state ──────────────────────────────────────────────
  menuToggle: MenuToggle = 'dashboard';
  messageToggle: MessageToggle = 'read';
  notificationToggle: NotificationToggle = 'notify';

  // ── User profile state ────────────────────────────────────────────────────
  user = signal<UserProfile | null>(null);
  loading = signal(true);
  profilePanelOpen = signal(false);
  avatarError = signal(false);
  activeMenuItem = signal<string | null>(null);
  hasUnreadNotifications = signal(false);
  hasUnreadMessages = signal(false);

  readonly menuItems: MenuItem[] = [
    {
      key: 'profile',
      label: 'My Profile',
      desc: 'View & edit your details',
      icon: User,
      accent: false,
    },
    {
      key: 'settings',
      label: 'Settings',
      desc: 'Preferences & security',
      icon: Settings,
      accent: false,
    },
    { key: 'ekyc', label: 'eKYC', desc: 'Identity verification', icon: CreditCard, accent: true },
  ];

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadUserProfile();
    this.syncRouteState(this.router.url);
    this.chatService.startRealtimeConnection();
    this.chatService.watchMyConversationRooms().pipe(takeUntil(this.destroy$)).subscribe();
    this.notificationRefreshService.startRealtimeConnection();
    this.hasUnreadMessages.set(this.chatService.hasUnreadChat('client'));
    this.chatService.unreadChatState$
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        this.hasUnreadMessages.set(!!state['client']);
      });
    this.chatService.incomingMessages$
      .pipe(takeUntil(this.destroy$))
      .subscribe((message) => {
        this.chatService.trackIncomingUnread('client', message, this.router.url);
      });
    this.hasUnreadNotifications.set(this.notificationRefreshService.hasUnread('client'));
    this.notificationRefreshService.unreadState$
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        this.hasUnreadNotifications.set(!!state['client']);
      });

    // Refresh profile when navigating to dashboard from eKYC
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$),
      )
      .subscribe((event: any) => {
        this.syncRouteState(event.urlAfterRedirects ?? this.router.url);

        if (event.urlAfterRedirects.includes('dashboard')) {
          this.loadUserProfile();
        }
      });
  }

  // cache removed: no localStorage read

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadUserProfile(): void {
    this.loading.set(true);
    this.profileService
      .ensureMyProfile()
      .pipe(
        catchError((error) => {
          console.warn(
            '[ClientHeader] Failed to fetch profile, falling back to token data:',
            error,
          );
          const tokenFallbackProfile = this.getProfileFromToken();
          if (tokenFallbackProfile) {
            this.user.set(tokenFallbackProfile);
            if (tokenFallbackProfile.avatarUrl) {
              void this.tryLoadAuthenticatedAvatarForHeader(tokenFallbackProfile);
            }
          } else {
            this.user.set(null);
          }
          return of(null);
        }),
        finalize(() => {
          this.loading.set(false);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (profile) => {
          if (!profile) {
            this.refreshEkycStatus();
            return;
          }

          const mappedProfile = this.mapProfile(profile);
          this.user.set(mappedProfile);

          if (mappedProfile.avatarUrl) {
            void this.tryLoadAuthenticatedAvatarForHeader(mappedProfile);
          }

          this.refreshEkycStatus();
        },
        error: (error) => {
          console.error('[ClientHeader] Unexpected profile load failure:', error);
        },
      });
  }

  private refreshEkycStatus(): void {
    this.http
      .get<{ status?: string }>(`${this.apiUrl}/ekyc/review`, { headers: this.buildAuthHeaders() })
      .pipe(catchError(() => of(null)))
      .subscribe((review) => {
        const status = review?.status?.toUpperCase();
        if (status === 'VERIFIED') {
          localStorage.setItem(this.getEkycStatusStorageKey(), 'verified');
          localStorage.setItem(this.getEkycSubmittedStorageKey(), 'true');
          this.user.update((user) => (user ? { ...user, kycStatus: 'verified' } : user));
          return;
        }

        if (status === 'PENDING' || status === 'IN_REVIEW' || status === 'FAILED') {
          localStorage.setItem(this.getEkycStatusStorageKey(), 'pending');
          localStorage.setItem(this.getEkycSubmittedStorageKey(), 'true');
          this.user.update((user) => (user ? { ...user, kycStatus: 'pending' } : user));
        }
      });
  }

  private buildAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    if (!token) {
      return new HttpHeaders();
    }

    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private mapProfile(response: unknown): UserProfile {
    const record = response as Record<string, unknown>;
    const fullName =
      this.normalizeDisplayName(
        this.pickFirstString(record, ['fullName', 'clientName', 'name'], 6),
      ) ?? 'Anonymous';
    const email = this.pickFirstString(record, ['email', 'clientEmail'], 6) ?? '';
    const clientId = this.pickFirstNumber(record, ['id', 'clientId', 'client_id'], 6) ?? 0;
    const rawAvatarData =
      this.pickFirstString(
        record,
        ['profilePictureUrl', 'profilePictureData', 'avatar', 'avatarUrl', 'profilePictureName'],
        6,
      ) ?? '';

    let avatarUrl = this.resolveAvatarUrl(rawAvatarData);
    const trimmedAvatar = rawAvatarData.trim();
    const looksLikeFilename =
      trimmedAvatar.length > 0 &&
      !/^data:/i.test(trimmedAvatar) &&
      !/^https?:\/\//i.test(trimmedAvatar) &&
      !trimmedAvatar.startsWith('/') &&
      trimmedAvatar.includes('.');

    if (looksLikeFilename && clientId > 0) {
      const base = this.apiUrl.replace(/\/$/, '');
      avatarUrl = `${base}/client/${clientId}/avatar`;
    }

    return {
      name: fullName,
      email,
      avatarUrl,
      kycStatus: this.inferKycStatus(record),
    };
  }

  private getProfileFromToken(): UserProfile | null {
    const token = localStorage.getItem('token');
    if (!token) {
      return null;
    }

    const payload = this.decodeJwtPayload(token);
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const claims = payload as {
      fullName?: string;
      full_name?: string;
      name?: string;
      username?: string;
      preferred_username?: string;
      given_name?: string;
      sub?: string;
      email?: string;
      avatar?: string;
      avatarUrl?: string;
      profile_image?: string;
      kycStatus?: KycStatus | string;
      kyc_status?: KycStatus | string;
      eKycStatus?: KycStatus | string;
      ekycStatus?: KycStatus | string;
    };

    const kycRaw = claims.kycStatus ?? claims.kyc_status ?? claims.eKycStatus ?? claims.ekycStatus;
    const kycStatus: KycStatus =
      kycRaw === 'verified' || kycRaw === 'pending' || kycRaw === 'not_started'
        ? kycRaw
        : 'not_started';

    const name =
      this.normalizeDisplayName(
        claims.fullName ??
          claims.full_name ??
          claims.name ??
          claims.username ??
          claims.preferred_username ??
          claims.given_name ??
          claims.sub,
      ) ?? 'Anonymous';

    return {
      name,
      email: claims.email ?? '',
      avatarUrl: this.resolveAvatarUrl(
        claims.avatar ?? claims.avatarUrl ?? claims.profile_image ?? '',
      ),
      kycStatus,
    };
  }

  private decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
      const parts = token.split('.');
      if (parts.length < 2) {
        return null;
      }

      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const json = atob(padded);
      const parsed: unknown = JSON.parse(json);

      if (!parsed || typeof parsed !== 'object') {
        return null;
      }

      return parsed as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private inferKycStatus(profileObject: Record<string, unknown>): KycStatus {
    const storedStatus = this.getStoredKycStatus();
    if (storedStatus) {
      return storedStatus;
    }

    const rawStatus = this.pickFirstString(
      profileObject,
      [
        'kycStatus',
        'kyc_status',
        'eKycStatus',
        'ekycStatus',
        'verificationStatus',
        'reviewStatus',
        'status',
      ],
      6,
    );

    if (rawStatus) {
      const status = rawStatus.toLowerCase();
      if (
        status.includes('verified') ||
        status.includes('complete') ||
        status.includes('approved') ||
        status.includes('success')
      ) {
        return 'verified';
      }

      if (
        status.includes('pending') ||
        status.includes('process') ||
        status.includes('review') ||
        status.includes('submit') ||
        status.includes('progress')
      ) {
        return 'pending';
      }
    }

    const isVerifiedFlag = this.pickFirstBoolean(
      profileObject,
      ['isKycVerified', 'kycVerified', 'isEkycVerified', 'ekycVerified'],
      6,
    );

    if (isVerifiedFlag === true) {
      return 'verified';
    }

    const hasStep1 = this.hasAnyNonEmptyField(
      profileObject,
      [
        'fullName',
        'full_name',
        'dateOfBirth',
        'date_of_birth',
        'nationality',
        'gender',
        'phoneNumber',
      ],
      6,
    );

    const hasStep2 = this.hasAnyNonEmptyField(
      profileObject,
      ['frontId', 'backId', 'frontIdData', 'backIdData', 'frontIdType', 'backIdType'],
      6,
    );

    const hasStep3 = this.hasAnyNonEmptyField(
      profileObject,
      ['addressLine1', 'city', 'state_province', 'postal_code', 'country'],
      6,
    );

    if (hasStep1 && hasStep2 && hasStep3) {
      return 'verified';
    }

    if (hasStep1 || hasStep2 || hasStep3) {
      return 'pending';
    }

    return 'not_started';
  }

  private getStoredKycStatus(): KycStatus | null {
    const raw = localStorage.getItem(this.getEkycStatusStorageKey());
    if (!raw) {
      return this.hasSubmittedEkyc ? 'pending' : null;
    }

    const normalized = raw.trim().toLowerCase();
    if (normalized === 'verified') {
      return 'verified';
    }
    if (normalized === 'pending' || normalized === 'in_review' || normalized === 'failed') {
      return 'pending';
    }
    return this.hasSubmittedEkyc ? 'pending' : null;
  }

  private getEkycStatusStorageKey(): string {
    return `client_ekyc_status:${this.getCredentialIdentity()}`;
  }

  private getEkycSubmittedStorageKey(): string {
    return `client_ekyc_submitted:${this.getCredentialIdentity()}`;
  }

  private getCredentialIdentity(): string {
    const token = localStorage.getItem('token');
    if (!token) {
      return 'anonymous';
    }

    const payload = this.decodeJwtPayload(token);
    if (!payload) {
      return 'anonymous';
    }

    const claims = payload as Record<string, unknown>;
    const identity =
      this.getStringClaim(claims, ['sub', 'email', 'preferred_username', 'username']) ??
      this.getStringClaim(claims, ['id', 'userId', 'clientId']);

    return identity ? encodeURIComponent(identity) : 'anonymous';
  }

  private getStringClaim(claims: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
      const value = claims[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
      }
    }

    return null;
  }

  private pickFirstString(source: unknown, keys: string[], depth: number): string | null {
    if (!source || typeof source !== 'object' || depth < 0) {
      return null;
    }

    const record = source as Record<string, unknown>;

    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
    }

    for (const value of Object.values(record)) {
      if (Array.isArray(value)) {
        for (const entry of value) {
          const nestedInArray = this.pickFirstString(entry, keys, depth - 1);
          if (nestedInArray) {
            return nestedInArray;
          }
        }
        continue;
      }

      const nested = this.pickFirstString(value, keys, depth - 1);
      if (nested) {
        return nested;
      }
    }

    return null;
  }

  private pickFirstBoolean(source: unknown, keys: string[], depth: number): boolean | null {
    if (!source || typeof source !== 'object' || depth < 0) {
      return null;
    }

    const record = source as Record<string, unknown>;

    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'boolean') {
        return value;
      }
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true') {
          return true;
        }
        if (normalized === 'false') {
          return false;
        }
      }
    }

    for (const value of Object.values(record)) {
      if (Array.isArray(value)) {
        for (const entry of value) {
          const nestedInArray = this.pickFirstBoolean(entry, keys, depth - 1);
          if (nestedInArray !== null) {
            return nestedInArray;
          }
        }
        continue;
      }

      const nested = this.pickFirstBoolean(value, keys, depth - 1);
      if (nested !== null) {
        return nested;
      }
    }

    return null;
  }

  private pickFirstNumber(source: unknown, keys: string[], depth: number): number | null {
    if (!source || typeof source !== 'object' || depth < 0) {
      return null;
    }

    const record = source as Record<string, unknown>;

    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }

    for (const value of Object.values(record)) {
      if (Array.isArray(value)) {
        for (const entry of value) {
          const nestedInArray = this.pickFirstNumber(entry, keys, depth - 1);
          if (nestedInArray !== null) {
            return nestedInArray;
          }
        }
        continue;
      }

      const nested = this.pickFirstNumber(value, keys, depth - 1);
      if (nested !== null) {
        return nested;
      }
    }

    return null;
  }

  private hasAnyNonEmptyField(source: unknown, keys: string[], depth: number): boolean {
    if (!source || typeof source !== 'object' || depth < 0) {
      return false;
    }

    const record = source as Record<string, unknown>;

    for (const key of keys) {
      if (!(key in record)) {
        continue;
      }

      const value = record[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return true;
      }
      if (Array.isArray(value) && value.length > 0) {
        return true;
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        return true;
      }
      if (typeof value === 'boolean' && value) {
        return true;
      }
    }

    for (const value of Object.values(record)) {
      if (Array.isArray(value)) {
        for (const entry of value) {
          if (this.hasAnyNonEmptyField(entry, keys, depth - 1)) {
            return true;
          }
        }
        continue;
      }

      if (this.hasAnyNonEmptyField(value, keys, depth - 1)) {
        return true;
      }
    }

    return false;
  }

  public resolveAvatarUrl(rawAvatar: string): string {
    if (!rawAvatar) {
      return '';
    }

    if (/^https?:\/\//i.test(rawAvatar) || rawAvatar.startsWith('data:')) {
      return rawAvatar;
    }

    if (this.isLikelyAvatarBase64(rawAvatar)) {
      return `data:image/jpeg;base64,${rawAvatar}`;
    }

    const normalizedBase = env.apiUrl.replace(/\/$/, '');
    const normalizedPath = rawAvatar.startsWith('/') ? rawAvatar : `/${rawAvatar}`;
    if (normalizedPath.startsWith('/client/') || normalizedPath.startsWith('/assets/')) {
      return `${normalizedBase}${normalizedPath}`;
    }

    return normalizedPath;
  }

  private isLikelyAvatarBase64(value: string): boolean {
    const normalized = value.replace(/\s+/g, '');
    return (
      normalized.length > 64 &&
      (/^\/9j\//.test(normalized) ||
        /^iVBOR/.test(normalized) ||
        /^R0lGOD/.test(normalized) ||
        /^UklGR/.test(normalized) ||
        /^[A-Za-z0-9+/=]+$/.test(normalized.replace(/\//g, '')))
    );
  }

  private async tryLoadAuthenticatedAvatarForHeader(profile: UserProfile): Promise<void> {
    try {
      if (!profile.avatarUrl) return;
      const isHttp = /^https?:\/\//i.test(profile.avatarUrl);
      if (!isHttp) return;

      const token = localStorage.getItem('token');
      if (!token) return;

      const url = `${profile.avatarUrl}?t=${Date.now()}`;
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!resp.ok) return;

      const contentType = resp.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) return;

      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);

      this.user.update((cur) => ({
        ...(cur ?? { name: '', email: '', avatarUrl: '', kycStatus: 'not_started' }),
        avatarUrl: blobUrl,
      }));
    } catch (e) {
      // ignore avatar fetch failures
    }
  }

  // ── Computed helpers ──────────────────────────────────────────────────────
  get displayName(): string {
    return this.normalizeDisplayName(this.user()?.name) ?? 'Anonymous';
  }
  private normalizeDisplayName(value: unknown): string | null {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }

      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          return this.normalizeDisplayName(JSON.parse(trimmed));
        } catch {
          return trimmed;
        }
      }

      return trimmed;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }

    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      const candidate =
        this.pickFirstString(record, ['fullName', 'clientName', 'name', 'username'], 3) ??
        this.pickFirstString(record, ['displayName', 'preferred_username', 'given_name'], 3);

      if (candidate) {
        return candidate;
      }

      try {
        const serialized = JSON.stringify(record);
        return serialized || null;
      } catch {
        return null;
      }
    }

    return null;
  }

  get initials(): string {
    return this.displayName
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  get kycBadge(): KycBadgeConfig {
    const status = this.effectiveKycStatus;
    return KYC_BADGE[status];
  }

  get showKycAlert(): boolean {
    return this.effectiveKycStatus === 'not_started';
  }

  get showKycPending(): boolean {
    return this.effectiveKycStatus === 'pending';
  }

  get showKycDone(): boolean {
    return this.effectiveKycStatus === 'verified';
  }

  get hasSubmittedEkyc(): boolean {
    return localStorage.getItem(this.getEkycSubmittedStorageKey()) === 'true';
  }

  get effectiveKycStatus(): KycStatus {
    if (this.hasSubmittedEkyc) {
      return this.getStoredKycStatus() ?? 'pending';
    }

    return this.user()?.kycStatus ?? 'not_started';
  }

  get ekycMenuDescription(): string {
    const status = this.effectiveKycStatus;
    if (status === 'verified') {
      return 'Already submitted and completed';
    }
    if (status === 'pending') {
      return 'Submitted, waiting for review';
    }
    return 'Identity verification required';
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  toggleProfilePanel(): void {
    this.profilePanelOpen.update((v) => !v);
  }

  onAvatarError(): void {
    this.avatarError.set(true);
  }

  refreshProfile(): void {
    console.log('[ClientHeader] Manually refreshing profile');
    this.profileService.clearCache();
    this.loadUserProfile();
  }

  onNotificationClick(): void {
    this.notificationToggle = 'unnotify';
  }

  onMessagesClick(): void {
    this.chatService.markChatRead('client');
  }

  private syncRouteState(url: string): void {
    if (url.includes('/client/') && url.includes('/chat')) {
      this.messageToggle = 'unread';
      this.chatService.markChatRead('client');
    } else {
      this.messageToggle = 'read';
    }

    if (url.includes('/client/') && url.includes('/notification')) {
      this.notificationToggle = 'unnotify';
    } else {
      this.notificationToggle = 'notify';
    }
  }

  selectMenuItem(key: string): void {
    if (key === 'ekyc' && this.hasSubmittedEkyc) {
      return;
    }

    this.activeMenuItem.set(key);
    if (key === 'profile') {
      this.profilePanelOpen.set(false);
      this.router.navigate(['/client/my-profile']);
      return;
    }

    if (key === 'settings') {
      this.profilePanelOpen.set(false);
      this.router.navigate(['/client/setting']);
      return;
    }

    if (key === 'ekyc') {
      this.profilePanelOpen.set(false);
      this.router.navigate(['/index/ekyc']);
    }
  }

  logout(): void {
    this.profileService.clearCache();
    this.loginService.logout();
    this.profilePanelOpen.set(false);
    this.router.navigate(['/auth/sign-in']);
  }

  // ── Close panel on outside click ──────────────────────────────────────────
  @HostListener('document:mousedown', ['$event'])
  onClickOutside(event: MouseEvent): void {
    if (this.profilePanelOpen() && !this.elRef.nativeElement.contains(event.target)) {
      this.profilePanelOpen.set(false);
    }
  }
}
