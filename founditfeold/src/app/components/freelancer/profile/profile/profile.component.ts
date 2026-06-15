import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { finalize, map, switchMap, tap, takeUntil } from 'rxjs';
import {
  ArrowLeft,
  BriefcaseBusiness,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Eye,
  FileText,
  LucideAngularModule,
  MapPin,
  MessageSquare,
  Pencil,
  SquarePen,
  Star,
  Upload,
  Wallet,
} from 'lucide-angular';
import {
  FreelancerProfileResponse,
  FreelancerRightSideBarResponse,
} from '../../../../services/Freelancer/Profile/freelancer-profile.models';
import { FreelancerProfileService } from '../../../../services/Freelancer/Profile/freelancer-profile.service';
import { ImageUrlService } from '../../../../services/media/image-url.service';

type PackageType = 'basic' | 'standard' | 'premium';

interface GigPackage {
  key: PackageType;
  label: string;
  title: string;
  price: number;
  deliveryDays: number;
  revisions: string;
  features: string[];
}

interface GalleryImage {
  id: number;
  src: string;
  alt: string;
}

@Component({
  selector: 'app-freelancer-profile-component',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: 'profile.component.html',
})
export class GigPriceCardComponent implements OnInit, OnDestroy {
  private profileService = inject(FreelancerProfileService);
  private imageUrlService = inject(ImageUrlService);
  private cd = inject(ChangeDetectorRef);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  readonly icons = {
    ChevronLeft,
    Star,
    MapPin,
    BriefcaseBusiness,
    Clock3,
    SquarePen,
    Pencil,
    Wallet,
    Calendar,
    Eye,
    Upload,
  };

  profile = {
    name: 'Loading...',
    title: '',
    rating: 0,
    location: '',
    experience: '',
    workStatus: '',
    startingPrice: 0,
    responseTime: '',
    availability: '',
    profileViews: 0,
    description: '',
  };
  avatarUrl = '/assets/images/default-avatar.png';
  isLoading = false;
  errorMessage = '';
  isEditOpen = false;
  isSaving = false;
  isAvatarUploading = false;
  isDescriptionEditorOpen = false;
  isDescriptionSaving = false;
  isPriceEditorOpen = false;
  rightSidebarId: number | null = null;
  priceForm = '';
  descriptionForm = '';

  editForm = {
    freelancerName: '',
    freelancerJob: '',
    rating: 0,
    workLocation: '',
    yearExperience: 0,
    about: '',
    description: '',
    skill: '',
  };

  ngOnInit(): void {
    this.loadProfile();
    // Subscribe to profile changes to reload data when saved
    this.profileService.profileChanged$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.loadProfile();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProfile(): void {
    this.isLoading = true;
    this.cd.detectChanges();

    this.profileService.ensureMyProfile().subscribe({
      next: (profileResponse) => {
        this.applyProfile(profileResponse);
        this.cd.detectChanges();

        this.profileService.ensureMyRightSidebar().subscribe({
          next: (rightSidebar) => {
            this.applyRightSidebar(rightSidebar);
            this.isLoading = false;
            this.cd.detectChanges();
          },
          error: () => {
            this.isLoading = false;
            this.cd.detectChanges();
          },
        });
      },
      error: () => {
        this.errorMessage = 'Failed to load freelancer profile';
        this.isLoading = false;
        this.cd.detectChanges();
      },
    });
  }

  private applyProfile(response: FreelancerProfileResponse): void {
    const skills = Array.isArray(response.skill)
      ? response.skill.filter((skill): skill is string => typeof skill === 'string')
      : [];

    this.profile = {
      ...this.profile,
      name: response.freelancerName || 'Freelancer',
      title: response.freelancerJob || 'Freelancer',
      rating: response.rating ?? 0,
      location: response.workLocation || 'Remote',
      experience: response.yearExperience
        ? `${response.yearExperience}+ years experience`
        : 'Experience not added',
      workStatus: response.about?.trim() || response.description?.trim()
        ? 'Profile ready'
        : 'Add your profile details',
      responseTime: 'Managed from profile settings',
      availability: response.about?.trim() || response.description?.trim()
        ? 'Open for projects'
        : 'Set availability in profile',
      description: response.description || 'Add your description to introduce your services.',
    };

    this.editForm = {
      freelancerName: response.freelancerName || '',
      freelancerJob: response.freelancerJob || '',
      rating: response.rating ?? 0,
      workLocation: response.workLocation || '',
      yearExperience: response.yearExperience ?? 0,
      about: response.about || '',
      description: response.description || '',
      skill: skills.join(', '),
    };

    this.avatarUrl =
      this.imageUrlService.fromDataOrUrl(
        typeof response.profilePictureData === 'string' ? response.profilePictureData : '',
        response.profilePictureType,
        response.profilePictureUrl,
      ) || '/assets/images/default-avatar.png';
  }

  private applyRightSidebar(response: FreelancerRightSideBarResponse): void {
    const resolvedViewCount = this.resolveViewCount(response);

    this.rightSidebarId = response.id ?? this.rightSidebarId;
    this.priceForm = String(response.startPrice ?? 0);
    this.profile = {
      ...this.profile,
      startingPrice: response.startPrice ?? 0,
      profileViews: resolvedViewCount,
    };
  }

  private resolveViewCount(response: FreelancerRightSideBarResponse): number {
    const candidates = [response.viewCount, response.view, response.views, response.sideBarView];
    for (const candidate of candidates) {
      if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate >= 0) {
        return candidate;
      }
    }

    return this.profile.profileViews ?? 0;
  }

  goBack(): void {
    void this.router.navigate(['/freelancer/dashboard']);
  }

  editProfile(): void {
    this.isEditOpen = true;
  }

  updateAvailability(): void {
    this.isEditOpen = true;
  }

  updateRate(): void {
    this.priceForm = String(this.profile.startingPrice ?? 0);
    this.isPriceEditorOpen = true;
  }

  uploadAvatar(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file) {
      return;
    }

    this.isAvatarUploading = true;
    this.errorMessage = '';

    this.profileService
      .createAvatar(file)
      .pipe(
        finalize(() => {
          this.isAvatarUploading = false;
        }),
      )
      .subscribe({
        next: (response) => {
          this.applyProfile(response);
          this.cd.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Failed to upload profile image';
          this.cd.detectChanges();
        },
      });
  }

  editDescription(): void {
    this.descriptionForm = this.editForm.description || '';
    this.isDescriptionEditorOpen = true;
  }

  closeEditor(): void {
    this.isEditOpen = false;
  }

  closeDescriptionEditor(): void {
    this.isDescriptionEditorOpen = false;
  }

  closePriceEditor(): void {
    this.isPriceEditorOpen = false;
  }

  savePrice(): void {
    const startPrice = Number(this.priceForm);
    if (!Number.isFinite(startPrice) || startPrice < 0) {
      this.errorMessage = 'Please enter a valid starting price';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    const request = {
      startPrice,
      viewCount: this.profile.profileViews ?? 0,
    };

    const priceRequest$ = this.rightSidebarId
      ? this.profileService.updateRightSidebar(this.rightSidebarId, request)
      : this.profileService.createRightSidebar(request);

    priceRequest$
      .pipe(
        tap((response) => this.applyRightSidebar(response)),
        finalize(() => {
          this.isSaving = false;
        }),
      )
      .subscribe({
        next: () => {
          this.isPriceEditorOpen = false;
          this.cd.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Failed to update starting price';
          this.cd.detectChanges();
        },
      });
  }

  saveProfile(): void {
    const profileRequest = {
      freelancerName: this.editForm.freelancerName.trim(),
      freelancerJob: this.editForm.freelancerJob.trim(),
      rating: Number(this.editForm.rating) || 0,
      workLocation: this.editForm.workLocation.trim(),
      yearExperience: Number(this.editForm.yearExperience) || 0,
      about: this.editForm.about.trim(),
      description: this.editForm.description.trim(),
    };

    const skillRequest = {
      skill: this.editForm.skill
        .split(',')
        .map((skill) => skill.trim())
        .filter((skill) => skill.length > 0),
    };

    this.isSaving = true;
    this.errorMessage = '';

    this.profileService
      .updateProfile(profileRequest)
      .pipe(
        tap((response) => this.applyProfile(response)),
        switchMap((response) =>
          this.profileService
            .createSkill(skillRequest)
            .pipe(map((skillResponse) => ({ response, skillResponse }))),
        ),
        finalize(() => {
          this.isSaving = false;
        }),
      )
      .subscribe({
        next: ({ response, skillResponse }) => {
          this.applyProfile({
            ...response,
            skill: skillResponse.skill ?? skillRequest.skill,
          });
          this.isEditOpen = false;
          this.cd.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Failed to update freelancer profile';
          this.cd.detectChanges();
        },
      });
  }

  saveDescription(): void {
    const profileRequest = {
      freelancerName: this.editForm.freelancerName.trim(),
      freelancerJob: this.editForm.freelancerJob.trim(),
      rating: Number(this.editForm.rating) || 0,
      workLocation: this.editForm.workLocation.trim(),
      yearExperience: Number(this.editForm.yearExperience) || 0,
      about: this.editForm.about.trim(),
      description: this.descriptionForm.trim(),
    };

    this.isDescriptionSaving = true;
    this.errorMessage = '';

    this.profileService
      .updateProfile(profileRequest)
      .pipe(
        tap((response) => this.applyProfile(response)),
        finalize(() => {
          this.isDescriptionSaving = false;
        }),
      )
      .subscribe({
        next: () => {
          this.isDescriptionEditorOpen = false;
          this.cd.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Failed to update description';
          this.cd.detectChanges();
        },
      });
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(value);
  }
}
