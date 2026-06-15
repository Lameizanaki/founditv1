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
  ClipboardList,
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
import { ChatService } from '../../../services/chat/chat.service';
import { NotificationRefreshService } from '../../../services/notification/notification-refresh.service';

// ── Types ──────────────────────────────────────────────────────────────────────
type MenuToggle = 'dashboard' | 'my-work' | 'my-services' | 'incoming-requests' | 'payments';
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

@Component({
  selector: 'app-freelancer-header-component',
  templateUrl: './freelancer-header.component.html',

  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterLink],
})
export class FreelancerHeaderComponent implements OnInit, OnDestroy {
  private elRef = inject(ElementRef);
  private http = inject(HttpClient);
  private router = inject(Router);
  private chatService = inject(ChatService);
  private notificationRefreshService = inject(NotificationRefreshService);
  private destroy$ = new Subject<void>();
  private apiUrl = env.apiUrl;
  readonly defaultAvatarUrl = '/assets/images/default-avatar.png';

  // ── Lucide icons ─────────────────────────────────────────────────────────
  icons = {
    House,
    Search,
    SquarePlus,
    BriefcaseBusiness,
    ClipboardList,
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
    // Load initial user profile
    this.loadUserProfile();
    this.syncRouteState(this.router.url);
    this.chatService.startRealtimeConnection();
    this.chatService.watchMyConversationRooms().pipe(takeUntil(this.destroy$)).subscribe();
    this.notificationRefreshService.startRealtimeConnection();
    this.hasUnreadMessages.set(this.chatService.hasUnreadChat('freelancer'));
    this.chatService.unreadChatState$
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        this.hasUnreadMessages.set(!!state['freelancer']);
      });
    this.chatService.incomingMessages$
      .pipe(takeUntil(this.destroy$))
      .subscribe((message) => {
        this.chatService.trackIncomingUnread('freelancer', message, this.router.url);
      });
    this.hasUnreadNotifications.set(this.notificationRefreshService.hasUnread('freelancer'));
    this.notificationRefreshService.unreadState$
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        this.hasUnreadNotifications.set(!!state['freelancer']);
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadUserProfile(): void {
    const tokenFallbackProfile = this.getProfileFromToken();

    if (!localStorage.getItem('token')) {
      this.user.set(tokenFallbackProfile);
      this.loading.set(false);
      return;
    }

    this.requestMyProfile()
      .pipe(
        catchError(() => of(null)),
        finalize(() => {
          this.loading.set(false);
        }),
      )
      .subscribe((profilePayload) => {
        const mapped = this.mapProfile(profilePayload);
        this.user.set(mapped ?? tokenFallbackProfile);
        this.refreshEkycStatus();
      });
  }

  private requestMyProfile(): Observable<unknown> {
    const headers = this.buildAuthHeaders();
    const candidateUrls = [
      `${this.apiUrl}/freelancer/me/client/profile`,
      `${this.apiUrl}/freelancer/me`,
      `${this.apiUrl}/freelancer/profile/me`,
    ];

    const tryFetch = (index: number): Observable<unknown> => {
      return this.http.get<unknown>(candidateUrls[index], { headers }).pipe(
        catchError((error) => {
          if (error?.status === 404 && index < candidateUrls.length - 1) {
            return tryFetch(index + 1);
          }
          throw error;
        }),
      );
    };

    return tryFetch(0);
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
        if (status === 'PENDING' || status === 'IN_REVIEW') {
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

  private mapProfile(payload: unknown): UserProfile | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const wrapper = payload as { data?: unknown; result?: unknown; profile?: unknown };
    const unwrapped = wrapper.data ?? wrapper.result ?? wrapper.profile ?? payload;
    if (!unwrapped || typeof unwrapped !== 'object') {
      return null;
    }

    const profileObject = unwrapped as Record<string, unknown>;
    const name =
      this.normalizeDisplayName(
        this.pickStringDeep(
          profileObject,
          [
            'freelancerName',
            'freelancer_name',
            'businessName',
            'business_name',
            'displayName',
            'display_name',
            'fullName',
            'full_name',
            'name',
            'username',
          ],
          5,
        ),
      ) ?? 'Anonymous';

    const email =
      this.pickStringDeep(profileObject, ['email', 'mail', 'user_email', 'contactEmail'], 5) ?? '';

    // Try to get avatar from avatarProfileData or other avatar fields
    let avatar: string = '';
    const avatarData = profileObject['avatarProfileData'] ?? profileObject['profilePictureData'];
    if (avatarData && typeof avatarData === 'string') {
      // If it's already a base64 string or data URL
      avatar = avatarData.startsWith('data:') ? avatarData : `data:image/jpeg;base64,${avatarData}`;
    } else if (Array.isArray(avatarData)) {
      const bytes = new Uint8Array(avatarData as number[]);
      let binary = '';

      for (let index = 0; index < bytes.length; index += 1) {
        binary += String.fromCharCode(bytes[index]);
      }

      avatar = `data:image/jpeg;base64,${btoa(binary)}`;
    } else {
      // Fallback to other avatar fields
      avatar =
        this.pickStringDeep(
          profileObject,
          [
            'avatar',
            'avatarUrl',
            'avatar_url',
            'avatarProfileUrl',
            'profilePictureUrl',
            'profileImage',
            'profile_image',
            'image',
            'photo',
            'profilePhoto',
            'profilePhotoUrl',
            'photoUrl',
          ],
          6,
        ) ?? '';
    }

    return {
      name,
      email,
      avatarUrl: this.resolveAvatarUrl(avatar),
      kycStatus: this.inferKycStatus(profileObject),
    };
  }

  private getProfileFromToken(): UserProfile | null {
    const token = localStorage.getItem('token');
    if (!token) {
      return null;
    }

    const payload = this.decodeJwtPayload(token);
    if (!payload) {
      return null;
    }

    const claims = payload as Record<string, unknown>;
    const name =
      this.normalizeDisplayName(
        this.getStringClaim(claims, [
          'freelancerName',
          'freelancer_name',
          'businessName',
          'business_name',
          'displayName',
          'display_name',
          'fullName',
          'full_name',
          'name',
          'preferred_username',
          'username',
        ]) ?? this.getStringClaim(claims, ['sub']),
      ) ?? 'Anonymous';

    const email = this.getStringClaim(claims, ['email']) ?? '';
    const avatar =
      this.getStringClaim(claims, ['avatar', 'avatarUrl', 'picture', 'profile_image']) ?? '';

    return {
      name,
      email,
      avatarUrl: this.resolveAvatarUrl(avatar),
      kycStatus: this.getStoredKycStatus() ?? 'not_started',
    };
  }

  private pickStringDeep(source: unknown, keys: string[], depth: number): string | null {
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
          const nested = this.pickStringDeep(entry, keys, depth - 1);
          if (nested) {
            return nested;
          }
        }
        continue;
      }

      const nested = this.pickStringDeep(value, keys, depth - 1);
      if (nested) {
        return nested;
      }
    }

    return null;
  }

  private resolveAvatarUrl(rawAvatar: string): string {
    if (!rawAvatar) {
      return '';
    }

    if (/^https?:\/\//i.test(rawAvatar) || rawAvatar.startsWith('data:')) {
      return rawAvatar;
    }

    const normalizedBase = this.apiUrl.replace(/\/$/, '');
    const normalizedPath = rawAvatar.startsWith('/') ? rawAvatar : `/${rawAvatar}`;
    return `${normalizedBase}${normalizedPath}`;
  }

  private inferKycStatus(profileObject: Record<string, unknown>): KycStatus {
    const storedStatus = this.getStoredKycStatus();
    if (storedStatus) {
      return storedStatus;
    }

    const rawStatus = this.pickStringDeep(
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

    const isVerifiedFlag = this.pickBooleanDeep(
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

  private pickBooleanDeep(source: unknown, keys: string[], depth: number): boolean | null {
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
          const nested = this.pickBooleanDeep(entry, keys, depth - 1);
          if (nested !== null) {
            return nested;
          }
        }
        continue;
      }

      const nested = this.pickBooleanDeep(value, keys, depth - 1);
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
      const value = record[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return true;
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        return true;
      }
      if (typeof value === 'boolean') {
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

  // ── Computed helpers ──────────────────────────────────────────────────────
  get displayName(): string {
    return this.normalizeDisplayName(this.user()?.name) ?? 'Anonymous';
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
    const stored = this.getStoredKycStatus();
    if (stored) {
      return stored;
    }

    if (this.hasSubmittedEkyc) {
      return 'pending';
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

  private getStoredKycStatus(): KycStatus | null {
    const raw = localStorage.getItem(this.getEkycStatusStorageKey());
    if (!raw) {
      return null;
    }

    const normalized = raw.trim().toLowerCase();
    if (normalized === 'verified') {
      return 'verified';
    }

    if (normalized === 'pending') {
      return 'pending';
    }

    if (normalized === 'in_review' || normalized === 'failed') {
      return 'pending';
    }

    return null;
  }

  private getEkycStatusStorageKey(): string {
    return `freelancer_ekyc_status:${this.getCredentialIdentity()}`;
  }

  private getEkycSubmittedStorageKey(): string {
    return `freelancer_ekyc_submitted:${this.getCredentialIdentity()}`;
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
      this.getStringClaim(claims, ['id', 'userId', 'freelancerId']);

    return identity ? encodeURIComponent(identity) : 'anonymous';
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
        this.pickStringDeep(
          record,
          ['freelancerName', 'businessName', 'displayName', 'fullName', 'name', 'username'],
          3,
        ) ?? this.pickStringDeep(record, ['preferred_username', 'given_name'], 3);

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

  // ── Actions ───────────────────────────────────────────────────────────────
  private syncRouteState(url: string): void {
    if (/\/freelancer\/(?:chat|[^/]+\/chat)(?:[/?#]|$)/.test(url)) {
      this.messageToggle = 'unread';
      this.chatService.markChatRead('freelancer');
    } else {
      this.messageToggle = 'read';
    }

    if (url.includes('/freelancer/notification')) {
      this.notificationToggle = 'unnotify';
    } else {
      this.notificationToggle = 'notify';
    }

    if (url.includes('/freelancer/active-work')) {
      this.menuToggle = 'my-work';
    } else if (url.includes('/freelancer/my-services')) {
      this.menuToggle = 'my-services';
    } else if (url.includes('/freelancer/hire-requests')) {
      this.menuToggle = 'incoming-requests';
    } else if (url.includes('/freelancer/earnings')) {
      this.menuToggle = 'payments';
    } else {
      this.menuToggle = 'dashboard';
    }
  }

  toggleProfilePanel(): void {
    this.profilePanelOpen.update((v) => !v);
  }

  onAvatarError(): void {
    this.avatarError.set(true);
  }

  selectMenuItem(key: string): void {
    if (key === 'ekyc' && this.hasSubmittedEkyc) {
      return;
    }

    this.activeMenuItem.set(key);
    this.profilePanelOpen.set(false);

    switch (key) {
      case 'profile':
        this.router.navigate(['/freelancer/profile']);
        break;
      case 'settings':
        this.router.navigate(['/freelancer/setting']);
        break;
      case 'ekyc':
        this.router.navigate(['/index/ekyc']);
        break;
    }
  }

  logout(): void {
    localStorage.removeItem('token');
    this.profilePanelOpen.set(false);
    this.router.navigate(['/auth/sign-in']);
  }

  onMessagesClick(): void {
    this.messageToggle = 'unread';
    this.chatService.markChatRead('freelancer');
  }

  onNotificationClick(): void {
    this.notificationToggle = 'unnotify';
  }

  // ── Close panel on outside click ──────────────────────────────────────────
  @HostListener('document:mousedown', ['$event'])
  onClickOutside(event: MouseEvent): void {
    if (this.profilePanelOpen() && !this.elRef.nativeElement.contains(event.target)) {
      this.profilePanelOpen.set(false);
    }
  }
}
