import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ChevronDown, ChevronUp, LucideAngularModule, Star } from 'lucide-angular';
import { catchError, filter, forkJoin, map, of, Subject, takeUntil } from 'rxjs';
import { GigService } from '../../../../services/Freelancer/Gig/gig.service';
import { GigResponseDTO } from '../../../../services/Freelancer/Gig/GigResponse';
import { ProfileService } from '../../../../services/Client/Profile/MeProfile.service';
import { MeProfileResponse } from '../../../../services/Client/Profile/MeProfileResponse';
import {
  FreelancerProfileService,
  FreelancerReviewResponse,
} from '../../../../services/Freelancer/Profile/freelancer-profile.service';
import { GigDetailStateService } from '../gig-detail-state.service';

interface ReviewItem {
  avatarUrl?: string;
  id: number;
  name: string;
  timeAgo: string;
  service: string;
  rating: number;
  comment: string;
}

@Component({
  selector: 'app-client-review-component',
  templateUrl: 'review.component.html',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
})
export class ReviewComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly detailState = inject(GigDetailStateService);
  private readonly profileService = inject(FreelancerProfileService);
  private readonly clientProfileService = inject(ProfileService);
  private readonly gigService = inject(GigService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  readonly icons = {
    Star,
    ChevronDown,
    ChevronUp,
  };

  @Input() title = 'Reviews';
  @Input() initialVisibleCount = 3;

  reviews: ReviewItem[] = [];
  showAll = false;
  isLoading = false;
  errorMessage = '';
  private loadedFreelancerId: number | null = null;

  ngOnInit(): void {
    this.loadReviewsFromRoute();
    this.watchGigState();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get visibleReviews(): ReviewItem[] {
    return this.showAll ? this.reviews : this.reviews.slice(0, this.initialVisibleCount);
  }

  get remainingCount(): number {
    return Math.max(this.reviews.length - this.initialVisibleCount, 0);
  }

  toggleShowMore(): void {
    this.showAll = !this.showAll;
  }

  trackByReviewId(index: number, review: ReviewItem): number {
    return review.id || index;
  }

  initials(review: ReviewItem): string {
    return review.name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  private loadReviewsFromRoute(): void {
    const gigId = this.route.snapshot.paramMap.get('id');

    if (!gigId) {
      return;
    }

    this.gigService
      .getClientGigById(gigId)
      .pipe(
        catchError(() => of(null)),
        takeUntil(this.destroy$),
      )
      .subscribe((gig) => {
        const freelancerId = this.resolveFreelancerId(
          gig?.freelancerId ?? gig?.userId ?? gig?.createdBy,
        );

        if (freelancerId) {
          this.loadReviews(freelancerId);
        }
      });
  }

  private watchGigState(): void {
    this.detailState.gig$
      .pipe(
        map((gig) => this.resolveFreelancerId(gig?.freelancerId ?? gig?.userId ?? gig?.createdBy)),
        filter((freelancerId): freelancerId is number => freelancerId !== null && freelancerId > 0),
        takeUntil(this.destroy$),
      )
      .subscribe((freelancerId) => this.loadReviews(freelancerId));
  }

  private loadReviews(freelancerId: number): void {
    if (freelancerId === this.loadedFreelancerId && this.reviews.length > 0) {
      return;
    }

    this.loadedFreelancerId = freelancerId;
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.profileService
      .getFreelancerReviews(freelancerId)
      .pipe(
        catchError(() => of([])),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (reviews) => {
          this.enrichReviews(this.sortNewestFirst(reviews ?? [])).subscribe({
            next: (items) => {
              this.reviews = items;
              this.isLoading = false;
              this.cdr.detectChanges();
            },
            error: () => {
              this.reviews = [];
              this.errorMessage = 'Unable to load reviews right now.';
              this.loadedFreelancerId = null;
              this.isLoading = false;
              this.cdr.detectChanges();
            },
          });
        },
        error: () => {
          this.reviews = [];
          this.errorMessage = 'Unable to load reviews right now.';
          this.loadedFreelancerId = null;
          this.isLoading = false;
          this.cdr.detectChanges();
        },
      });
  }

  private enrichReviews(reviews: FreelancerReviewResponse[]) {
    if (reviews.length === 0) {
      return of([]);
    }

    const lookups = reviews.map((review, index) => {
      const clientId = Number(review.clientId);

      if (!Number.isFinite(clientId) || clientId <= 0) {
        return of(this.toReviewItem(review, index));
      }

      return this.clientProfileService.getFreelancerViewProfile(clientId).pipe(
        map((profile) => this.toReviewItem(review, index, profile)),
        catchError(() => of(this.toReviewItem(review, index))),
      );
    });

    return forkJoin(lookups);
  }

  private toReviewItem(
    review: FreelancerReviewResponse,
    index: number,
    profile?: MeProfileResponse,
  ): ReviewItem {
    return {
      avatarUrl: this.buildAvatarUrl(profile),
      id: review.id ?? index,
      name:
        profile?.fullName?.trim() ||
        profile?.clientName?.trim() ||
        review.clientName?.trim() ||
        'Client',
      timeAgo: this.formatRelativeDate(review.createdAt),
      service: review.service?.trim() || 'Freelancer service',
      rating: Math.max(0, Math.min(5, Number(review.rating ?? 0))),
      comment: review.comment?.trim() || 'No comment provided.',
    };
  }

  private sortNewestFirst(reviews: FreelancerReviewResponse[]): FreelancerReviewResponse[] {
    return [...reviews].sort(
      (a, b) => this.toTimestamp(b.createdAt) - this.toTimestamp(a.createdAt),
    );
  }

  private buildAvatarUrl(profile?: MeProfileResponse): string | undefined {
    const imageData = profile?.profilePictureData;

    if (!imageData) {
      return undefined;
    }

    const data =
      typeof imageData === 'string'
        ? imageData.trim()
        : imageData instanceof Uint8Array
          ? this.bytesToBase64(imageData)
          : '';

    return data ? `data:${profile?.profilePictureType || 'image/jpeg'};base64,${data}` : undefined;
  }

  private bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index]);
    }

    return btoa(binary);
  }

  private formatRelativeDate(value?: string): string {
    const timestamp = this.toTimestamp(value);
    if (!timestamp) return 'Recently';

    const diffMs = Date.now() - timestamp;
    const diffDays = Math.max(0, Math.floor(diffMs / 86_400_000));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays} days ago`;

    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths === 1) return '1 month ago';
    if (diffMonths < 12) return `${diffMonths} months ago`;

    const diffYears = Math.floor(diffMonths / 12);
    return diffYears === 1 ? '1 year ago' : `${diffYears} years ago`;
  }

  private toTimestamp(value?: string): number {
    if (!value) return 0;

    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  private resolveFreelancerId(candidate: number | string | null | undefined): number | null {
    const parsed = Number(candidate);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
}
