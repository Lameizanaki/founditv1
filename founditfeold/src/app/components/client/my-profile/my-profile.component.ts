import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Clock3,
  DollarSign,
  Edit3,
  Mail,
  MapPin,
  MessageSquareQuote,
  MoreVertical,
  Phone,
  RefreshCw,
  Save,
  Send,
  Sparkles,
  Star,
  Flag,
  Upload,
  TrendingUp,
  User,
  X,
  LucideAngularModule,
} from 'lucide-angular';
import { MeProfileResponse } from '../../../services/Client/Profile/MeProfileResponse';
import { env } from '../../../../environments/env';
import { ProfileService } from '../../../services/Client/Profile/MeProfile.service';
import { ProjectHistoryResponse } from '../../../services/Client/Profile/ProjectHistoryResponse';
import { AccountReportService } from '../../../services/account/account-report.service';

type AvailabilityTone = 'emerald' | 'amber' | 'slate';

interface ClientProfileViewModel {
  id: number;
  fullName: string;
  email: string;
  avatarUrl: string;
  company: string;
  location: string;
  phone: string;
  about: string;
  availability: boolean;
  website: string;
  completedProjects: number;
  activeProjects: number;
  totalSpent: number;
  averageRating: number;
}

interface ClientProfileDraft {
  fullName: string;
  email: string;
  company: string;
  location: string;
  phone: string;
  about: string;
  availability: boolean;
  website: string;
}

interface ProjectHistoryCard {
  id: string;
  title: string;
  collaborator: string;
  description: string;
  dateLabel: string;
  ratingLabel: string;
  ratingValue: number | null;
  amountLabel: string;
  amountValue: number | null;
  statusLabel: string;
  statusTone: AvailabilityTone;
}

interface StatCard {
  label: string;
  value: string;
  hint: string;
  tone: 'blue' | 'emerald' | 'violet' | 'amber';
}

interface TestimonialCard {
  author: string;
  role: string;
  quote: string;
}

const DEFAULT_AVATAR = '/assets/images/default-avatar.png';

const FALLBACK_PROFILE: ClientProfileViewModel = {
  id: 0,
  fullName: '',
  email: '',
  avatarUrl: DEFAULT_AVATAR,
  company: '',
  location: '',
  phone: '',
  about: '',
  availability: false,
  website: '',
  completedProjects: 0,
  activeProjects: 0,
  totalSpent: 0,
  averageRating: 0,
};

const FALLBACK_HISTORY: ProjectHistoryCard[] = [];

const FALLBACK_TESTIMONIALS: TestimonialCard[] = [];
// (profile cache removed)

@Component({
  selector: 'app-client-my-profile',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './my-profile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientMyProfileComponent {
  private profileService = inject(ProfileService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private accountReportService = inject(AccountReportService);
  private destroyRef = inject(DestroyRef);
  private readonly avatarPreviewUrl = signal<string | null>(null);
  private readonly previousAvatarUrl = signal<string | null>(null);

  readonly icons = {
    ArrowLeft,
    BadgeCheck,
    BriefcaseBusiness,
    Building2,
    CalendarDays,
    Clock3,
    DollarSign,
    Edit3,
    Mail,
    MapPin,
    MessageSquareQuote,
    MoreVertical,
    Phone,
    RefreshCw,
    Save,
    Send,
    Upload,
    Sparkles,
    Star,
    Flag,
    TrendingUp,
    User,
    X,
  };

  readonly profile = signal<ClientProfileViewModel>(FALLBACK_PROFILE);
  readonly projectHistory = signal<ProjectHistoryCard[]>(FALLBACK_HISTORY);
  readonly testimonials = signal<TestimonialCard[]>(FALLBACK_TESTIMONIALS);
  readonly isLoading = signal(true);
  readonly isUploadingAvatar = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly isEditing = signal(false);
  readonly isViewerMode = signal(false);
  readonly isReportMenuOpen = signal(false);
  readonly isReportModalOpen = signal(false);
  readonly isSubmittingReport = signal(false);
  readonly reportMessage = signal('');
  readonly reportSuccessMessage = signal<string | null>(null);
  readonly reportErrorMessage = signal<string | null>(null);
  readonly returnUrl = signal<string | null>(null);
  readonly draft = signal<ClientProfileDraft>(this.createDraft(FALLBACK_PROFILE));

  readonly displayName = computed(() => {
    const draftName = this.draft().fullName.trim();
    return draftName.length > 0 ? draftName : this.profile().fullName;
  });

  readonly initials = computed(
    () =>
      this.displayName()
        .split(' ')
        .filter((part) => part.trim().length > 0)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('') || 'C',
  );

  readonly avatarUrl = computed(
    () => this.avatarPreviewUrl() || this.profile().avatarUrl || DEFAULT_AVATAR,
  );

  readonly availabilityTone = computed<AvailabilityTone>(() =>
    this.draft().availability ? 'emerald' : 'amber',
  );

  readonly availabilityLabel = computed(() =>
    this.draft().availability ? 'Available for New Projects' : 'Temporarily Unavailable',
  );

  readonly statistics = computed<StatCard[]>(() => {
    const profile = this.profile();
    const history = this.projectHistory();
    const completed =
      profile.completedProjects || history.filter((item) => item.statusTone === 'emerald').length;
    const active =
      profile.activeProjects || history.filter((item) => item.statusTone === 'amber').length;
    const spent =
      profile.totalSpent || history.reduce((sum, item) => sum + (item.amountValue ?? 0), 0);
    const averageRating =
      profile.averageRating ||
      (history.length
        ? history
            .map((item) => item.ratingValue)
            .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
            .reduce((sum, value, index, values) => sum + value / values.length, 0)
        : 0);

    return [
      {
        label: 'Completed',
        value: String(completed),
        hint: 'projects delivered',
        tone: 'blue',
      },
      {
        label: 'Active',
        value: String(active),
        hint: 'projects in progress',
        tone: 'emerald',
      },
      {
        label: 'Total Spent',
        value: this.formatCurrency(spent),
        hint: 'lifetime spend',
        tone: 'violet',
      },
      {
        label: 'Avg Rating',
        value: averageRating ? averageRating.toFixed(1) : '0.0',
        hint: 'from project history',
        tone: 'amber',
      },
    ];
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    const viewedClientId = this.getViewedClientId();
    this.isViewerMode.set(viewedClientId !== null);
    this.returnUrl.set(this.route.snapshot.queryParamMap.get('returnUrl'));

    // Do not use local cache; always attempt to load fresh data from server

    if (viewedClientId !== null) {
      forkJoin({
        profile: this.profileService.getFreelancerViewProfile(viewedClientId).pipe(
          catchError(() => of(null)),
        ),
        history: this.profileService.getFreelancerViewProjectHistory(viewedClientId).pipe(
          catchError(() => of([])),
        ),
      })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: ({ profile, history }) => {
            const displayProfile = profile ? this.mapProfile(profile) : FALLBACK_PROFILE;
            const mappedHistory = history?.length ? history.map((item) => this.mapHistory(item)) : [];
            this.profile.set(displayProfile);
            this.projectHistory.set(mappedHistory);
            this.draft.set(this.createDraft(displayProfile));
            if (this.hasRenderableProfileData(displayProfile)) {
              this.tryLoadAuthenticatedAvatar(displayProfile);
            }
            this.testimonials.set([]);
            this.isEditing.set(false);
          },
          error: () => {
            this.errorMessage.set('Unable to load client profile. Please try again.');
            this.profile.set(FALLBACK_PROFILE);
            this.projectHistory.set([]);
            this.draft.set(this.createDraft(FALLBACK_PROFILE));
            this.testimonials.set([]);
            this.isEditing.set(false);
          },
          complete: () => {
            this.isLoading.set(false);
          },
        });
      return;
    }

    forkJoin({
      profile: this.profileService.ensureMyProfile().pipe(catchError(() => of(null))),
      history: this.profileService.getProjectHistory().pipe(catchError(() => of([]))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ profile, history }) => {
          const mappedProfile = profile ? this.mapProfile(profile) : null;
          const mappedHistory = history?.length ? history.map((item) => this.mapHistory(item)) : [];
          const displayProfile = mappedProfile ?? FALLBACK_PROFILE;

          this.profile.set(displayProfile);
          this.projectHistory.set(mappedHistory);
          this.draft.set(this.createDraft(displayProfile));
          if (this.hasRenderableProfileData(displayProfile)) {
            // Try to load the avatar via authenticated fetch if the URL is protected
            this.tryLoadAuthenticatedAvatar(displayProfile);
          }
          this.testimonials.set([]);
          this.isEditing.set(false);
        },
        error: () => {
          this.errorMessage.set('Unable to load client profile. Please try again.');
          this.profile.set(FALLBACK_PROFILE);
          this.projectHistory.set([]);
          this.draft.set(this.createDraft(FALLBACK_PROFILE));
          this.testimonials.set([]);
          this.isEditing.set(false);
        },
        complete: () => {
          this.isLoading.set(false);
        },
      });
  }

  enableEditing(): void {
    if (this.isViewerMode()) {
      return;
    }

    this.isEditing.set(true);
  }

  cancelEditing(): void {
    this.draft.set(this.createDraft(this.profile()));
    this.isEditing.set(false);
  }

  saveChanges(): void {
    if (this.isViewerMode()) {
      return;
    }

    const currentProfile = this.profile();
    const tokenProfileId = this.getProfileIdFromToken();

    this.isSaving.set(true);
    this.errorMessage.set(null);

    const resolveProfileId$ =
      currentProfile.id && currentProfile.id > 0
        ? of(currentProfile.id)
        : tokenProfileId
          ? of(tokenProfileId)
          : this.profileService.ensureMyProfile().pipe(map((p) => this.mapProfile(p).id));

    resolveProfileId$
      .pipe(
        switchMap((resolvedId) => {
          if (!resolvedId) {
            // No profile id could be resolved; apply draft locally and bail out
            console.warn(
              '[Client My Profile] Could not resolve profile id; applying draft locally.',
            );
            this.profile.set(this.applyDraft(currentProfile, this.draft()));
            this.isEditing.set(false);
            this.isSaving.set(false);
            return of(null);
          }

          // saving profile to server

          return forkJoin({
            contact: this.profileService.updateContactInfo(
              resolvedId,
              this.buildContactInfoPayload(this.draft()),
            ),
            about: this.profileService.updateAbout(
              resolvedId,
              this.buildAboutPayload(this.draft()),
            ),
          });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => {
          if (!result) {
            return;
          }

          this.isEditing.set(false);
          this.loadProfile();
        },
        error: (err) => {
          // saveChanges failed - handled by UI error state
          this.errorMessage.set('Unable to save profile changes. Please try again.');
        },
        complete: () => {
          this.isSaving.set(false);
        },
      });
  }

  goBack(): void {
    const returnUrl = this.returnUrl();
    if (returnUrl) {
      void this.router.navigateByUrl(returnUrl);
      return;
    }

    void this.router.navigate(['/client/dashboard']);
  }

  retry(): void {
    this.loadProfile();
  }

  updateDraftValue(field: keyof ClientProfileDraft, event: Event): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | null;
    const value = target?.value ?? '';

    this.draft.update((current) => ({
      ...current,
      [field]: field === 'availability' ? current.availability : value,
    }));
  }

  toggleAvailability(): void {
    if (this.isViewerMode() || !this.isEditing()) {
      return;
    }

    this.draft.update((current) => ({
      ...current,
      availability: !current.availability,
    }));
  }

  updateReportMessage(event: Event): void {
    const target = event.target as HTMLTextAreaElement | null;
    this.reportMessage.set(target?.value ?? '');
  }

  openReportModal(): void {
    this.isReportMenuOpen.set(false);
    this.isReportModalOpen.set(true);
    this.reportErrorMessage.set(null);
    this.reportSuccessMessage.set(null);
  }

  closeReportModal(): void {
    if (this.isSubmittingReport()) return;

    this.isReportModalOpen.set(false);
    this.reportMessage.set('');
    this.reportErrorMessage.set(null);
    this.reportSuccessMessage.set(null);
  }

  submitReport(): void {
    const message = this.reportMessage().trim();
    if (!message || this.isSubmittingReport()) return;

    const profile = this.profile();
    this.isSubmittingReport.set(true);
    this.reportErrorMessage.set(null);
    this.reportSuccessMessage.set(null);

    this.accountReportService
      .submitReport({
        subject: `Report client profile: ${profile.fullName || profile.email || 'Client'}`,
        message: [
          `Reported profile: ${profile.fullName || 'Unknown client'}`,
          `Client profile id: ${profile.id || 'Unknown'}`,
          `Issue: ${message}`,
        ].join('\n'),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSubmittingReport.set(false);
          this.reportMessage.set('');
          this.reportSuccessMessage.set('Report sent to admin for review.');
        },
        error: () => {
          this.isSubmittingReport.set(false);
          this.reportErrorMessage.set('Unable to send report right now.');
        },
      });
  }

  private getViewedClientId(): number | null {
    const value = Number(
      this.route.snapshot.paramMap.get('clientId') ??
        this.route.snapshot.queryParamMap.get('clientId'),
    );
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  handleAvatarSelection(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    const file = target?.files?.[0];

    if (!file) {
      return;
    }

    if (this.avatarPreviewUrl()) {
      URL.revokeObjectURL(this.avatarPreviewUrl() as string);
    }

    this.previousAvatarUrl.set(this.profile().avatarUrl);
    this.avatarPreviewUrl.set(URL.createObjectURL(file));
    this.profile.set({
      ...this.profile(),
      avatarUrl: this.avatarPreviewUrl() ?? this.profile().avatarUrl,
    });

    this.isUploadingAvatar.set(true);
    this.errorMessage.set(null);

    const currentProfile = this.profile();
    const profileId = currentProfile.id || this.getProfileIdFromToken();

    if (!profileId) {
      this.errorMessage.set('Unable to resolve the client profile for avatar upload.');
      this.isUploadingAvatar.set(false);
      target.value = '';
      this.restoreAvatarPreview();
      return;
    }

    this.profileService
      .updateAvatar(profileId, file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedProfile) => {
          const mappedProfile = this.mapProfile(updatedProfile);
          this.profile.set(mappedProfile);
          this.draft.set(this.createDraft(mappedProfile));
          if (mappedProfile.avatarUrl && mappedProfile.avatarUrl !== DEFAULT_AVATAR) {
            this.clearAvatarPreviewState();
          }
        },
        error: (error) => {
          this.errorMessage.set('Unable to upload the profile photo. Please try again.');
          this.restoreAvatarPreview();
        },
        complete: () => {
          this.isUploadingAvatar.set(false);
          target.value = '';
        },
      });
  }

  trackByProject = (_index: number, item: ProjectHistoryCard): string => item.id;

  trackByTestimonial = (_index: number, item: TestimonialCard): string => item.author;

  private createDraft(profile: ClientProfileViewModel): ClientProfileDraft {
    return {
      fullName: profile.fullName,
      email: profile.email,
      company: profile.company,
      location: profile.location,
      phone: profile.phone,
      about: profile.about,
      availability: profile.availability,
      website: profile.website,
    };
  }

  private applyDraft(
    profile: ClientProfileViewModel,
    draft: ClientProfileDraft,
  ): ClientProfileViewModel {
    return {
      ...profile,
      fullName: draft.fullName || profile.fullName,
      email: draft.email || profile.email,
      company: draft.company || profile.company,
      location: draft.location || profile.location,
      phone: draft.phone || profile.phone,
      about: draft.about || profile.about,
      availability: draft.availability,
      website: draft.website || profile.website,
      completedProjects: profile.completedProjects,
      activeProjects: profile.activeProjects,
      totalSpent: profile.totalSpent,
      averageRating: profile.averageRating,
    };
  }

  private buildContactInfoPayload(draft: ClientProfileDraft): Record<string, unknown> {
    return {
      fullName: draft.fullName,
      name: draft.fullName,
      email: draft.email,
      phone: draft.phone,
      company: draft.company,
      organization: draft.company,
      businessName: draft.company,
      clientName: draft.fullName,
      clientEmail: draft.email,
      location: draft.location,
      workLocation: draft.location,
      work_location: draft.location,
      website: draft.website,
      availability: draft.availability,
      about: draft.about,
      bio: draft.about,
    };
  }

  private buildAboutPayload(draft: ClientProfileDraft): Record<string, unknown> {
    return {
      about: draft.about,
      bio: draft.about,
    };
  }

  private mapProfile(response: MeProfileResponse): ClientProfileViewModel {
    const record = response as unknown as Record<string, unknown>;
    const fullName = this.pickString(record, ['fullName', 'clientName', 'name']) ?? 'Client';
    const email = this.pickString(record, ['email', 'clientEmail']) ?? '';
    const location = this.pickString(record, ['location', 'workLocation']) ?? '';
    const company = this.pickString(record, ['company', 'businessName', 'organization']) ?? '';
    const id =
      this.pickNumber(record, [
        'id',
        'profileId',
        'clientProfileId',
        'client_profile_id',
        'clientId',
        'client_id',
        'userId',
      ]) ?? FALLBACK_PROFILE.id;

    const rawAvatarData =
      this.pickString(record, [
        'profilePictureUrl',
        'profilePictureData',
        'avatar',
        'avatarUrl',
        'profilePictureName',
      ]) ?? '';
    const avatarType = this.pickString(record, ['profilePictureType']) ?? 'image/jpeg';

    // Resolve avatar URL. If server returned just a filename (e.g. "selfie.jpg"),
    // construct the GET endpoint that serves the uploaded avatar instead of
    // creating a broken data: URI from the filename.
    let avatarUrl = this.resolveAvatarUrl(rawAvatarData, avatarType);
    const trimmedAvatar = (rawAvatarData || '').toString().trim();
    const looksLikeFilename =
      trimmedAvatar &&
      !/^data:/i.test(trimmedAvatar) &&
      !/^https?:\/\//i.test(trimmedAvatar) &&
      !trimmedAvatar.startsWith('/') &&
      trimmedAvatar.includes('.');
    if (looksLikeFilename && id && id > 0) {
      const base = env.apiUrl.replace(/\/$/, '');
      avatarUrl = `${base}/client/${id}/avatar`;
    }

    return {
      id,
      fullName,
      email,
      avatarUrl,
      company,
      location,
      phone: this.pickString(record, ['phone', 'phoneNumber', 'contactNumber']) ?? '',
      about: this.pickString(record, ['about', 'bio', 'description', 'summary']) ?? '',
      availability:
        this.pickBoolean(record, ['availability', 'availableForProjects', 'openForProjects']) ??
        false,
      website:
        this.pickString(record, ['website', 'portfolio', 'portfolioUrl', 'websiteUrl']) ?? '',
      completedProjects: this.pickNumber(record, ['completedProjects', 'projectsCompleted']) ?? 0,
      activeProjects: this.pickNumber(record, ['activeProjects']) ?? 0,
      totalSpent: this.pickNumber(record, ['totalSpent', 'spent', 'amountSpent']) ?? 0,
      averageRating: this.pickNumber(record, ['averageRating', 'avgRating', 'ratingAverage']) ?? 0,
    };
  }

  private getProfileIdFromToken(): number | null {
    const token = localStorage.getItem('token');
    if (!token) {
      return null;
    }

    const payload = this.decodeJwtPayload(token);
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const claims = payload as Record<string, unknown>;
    const candidate = this.pickNumber(claims, [
      'id',
      'profileId',
      'clientProfileId',
      'client_profile_id',
      'userId',
      'clientId',
      'client_id',
    ]);
    return candidate && candidate > 0 ? candidate : null;
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

  private mapHistory(response: ProjectHistoryResponse): ProjectHistoryCard {
    const record = response as unknown as Record<string, unknown>;
    const status = (
      this.pickString(record, ['status', 'projectStatus', 'state']) ?? 'completed'
    ).toLowerCase();
    const statusTone = this.resolveStatusTone(status);

    return {
      id:
        this.pickString(record, ['id', 'projectId', 'historyId']) ??
        `${this.pickString(record, ['title', 'projectName', 'projectTitle']) ?? 'project'}-${Math.random().toString(36).slice(2, 8)}`,
      title:
        this.pickString(record, ['title', 'projectName', 'projectTitle', 'serviceName']) ??
        'Project',
      collaborator:
        this.pickString(record, ['collaboratorName', 'clientName', 'freelancerName']) ??
        'with Client',
      description:
        this.pickString(record, ['description', 'feedback', 'summary', 'note']) ??
        'Project details from the client history feed.',
      dateLabel:
        this.pickString(record, ['completedAt', 'createdAt', 'updatedAt', 'date', 'monthYear']) ??
        'Recent',
      ratingLabel: this.pickNumber(record, ['rating', 'score', 'reviewRating'])?.toFixed(1) ?? '—',
      ratingValue: this.pickNumber(record, ['rating', 'score', 'reviewRating']),
      amountLabel: this.formatCurrency(
        this.pickNumber(record, ['amount', 'price', 'totalAmount', 'value']) ?? 0,
      ),
      amountValue: this.pickNumber(record, ['amount', 'price', 'totalAmount', 'value']),
      statusLabel: this.formatStatusLabel(status, statusTone),
      statusTone,
    };
  }

  private resolveStatusTone(status: string): AvailabilityTone {
    if (
      status.includes('complete') ||
      status.includes('done') ||
      status.includes('finished') ||
      status.includes('closed')
    ) {
      return 'emerald';
    }

    if (status.includes('active') || status.includes('progress') || status.includes('pending')) {
      return 'amber';
    }

    return 'slate';
  }

  private formatStatusLabel(status: string, tone: AvailabilityTone): string {
    if (tone === 'emerald') {
      return 'Completed';
    }

    if (tone === 'amber') {
      return status.includes('active') ? 'Active' : 'In Progress';
    }

    return status ? this.capitalize(status) : 'Unknown';
  }

  private pickString(source: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
      }
    }

    return null;
  }

  private pickNumber(source: Record<string, unknown>, keys: string[]): number | null {
    for (const key of keys) {
      const value = source[key];
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

    return null;
  }

  private pickBoolean(source: Record<string, unknown>, keys: string[]): boolean | null {
    for (const key of keys) {
      const value = source[key];
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

    return null;
  }

  private resolveAvatarUrl(rawAvatarData: string, avatarType: string): string {
    const trimmed = (rawAvatarData || '').toString().trim();
    if (!trimmed) {
      return DEFAULT_AVATAR;
    }

    if (/^data:/i.test(trimmed)) {
      return trimmed;
    }

    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }

    if (trimmed.startsWith('/')) {
      if (this.isLikelyAvatarBase64(trimmed)) {
        return `data:${avatarType || 'image/jpeg'};base64,${trimmed}`;
      }

      const base = env.apiUrl.replace(/\/$/, '');
      return `${base}${trimmed}`;
    }

    return `data:${avatarType || 'image/jpeg'};base64,${trimmed}`;
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

  private hasRenderableProfileData(profile: ClientProfileViewModel): boolean {
    return Boolean(
      profile.fullName.trim() ||
      profile.email.trim() ||
      profile.company.trim() ||
      profile.location.trim() ||
      profile.phone.trim() ||
      profile.about.trim() ||
      profile.website.trim() ||
      (profile.avatarUrl && profile.avatarUrl !== DEFAULT_AVATAR) ||
      profile.availability ||
      profile.completedProjects > 0 ||
      profile.activeProjects > 0 ||
      profile.totalSpent > 0 ||
      profile.averageRating > 0,
    );
  }

  private async tryLoadAuthenticatedAvatar(profile: ClientProfileViewModel): Promise<void> {
    try {
      if (!profile.avatarUrl || profile.avatarUrl === DEFAULT_AVATAR) return;

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

      this.profile.update((current) => ({ ...current, avatarUrl: blobUrl }));
    } catch (e) {
      // ignore avatar fetch failures
    }
  }

  private clearAvatarPreviewState(): void {
    if (this.avatarPreviewUrl()) {
      URL.revokeObjectURL(this.avatarPreviewUrl() as string);
    }

    this.avatarPreviewUrl.set(null);
    this.previousAvatarUrl.set(null);
  }

  private restoreAvatarPreview(): void {
    if (this.previousAvatarUrl()) {
      this.profile.set({
        ...this.profile(),
        avatarUrl: this.previousAvatarUrl() as string,
      });
    }

    this.clearAvatarPreviewState();
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  }

  private capitalize(value: string): string {
    if (!value) {
      return value;
    }

    return `${value[0].toUpperCase()}${value.slice(1)}`;
  }
}
