import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ChevronDown, ChevronUp, LucideAngularModule, Star } from 'lucide-angular';
import { catchError, forkJoin, map, of } from 'rxjs';
import { ProfileService } from '../../../../services/Client/Profile/MeProfile.service';
import { MeProfileResponse } from '../../../../services/Client/Profile/MeProfileResponse';
import {
  FreelancerProfileService,
  FreelancerReviewResponse,
} from '../../../../services/Freelancer/Profile/freelancer-profile.service';
import { GigDetailStateService } from '../../../client/gig-view-details/gig-detail-state.service';

interface ReviewItem {
  avatarUrl?: string;
  name: string;
  timeAgo: string;
  service: string;
  rating: number;
  comment: string;
}

@Component({
  selector: 'app-freelancer-gig-review-component',
  templateUrl: 'review.component.html',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
})
export class ReviewComponent {
  private readonly detailState = inject(GigDetailStateService);
  private readonly profileService = inject(FreelancerProfileService);
  private readonly clientProfileService = inject(ProfileService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly icons = {
    Star,
    ChevronDown,
    ChevronUp,
  };

  title = 'Reviews';
  initialVisibleCount = 3;

  reviews: ReviewItem[] = [];

  showAll = false;
  private loadedFreelancerId: number | null = null;

  ngOnInit(): void {
    this.detailState.profile$.subscribe({
      next: (profile) => {
        const freelancerId = this.resolveFreelancerId(profile?.id);

        if (freelancerId) {
          this.loadReviews(freelancerId);
        }
      },
    });

    this.detailState.gig$.subscribe({
      next: (gig) => {
        const freelancerId = this.resolveFreelancerId(
          gig?.freelancerId ?? gig?.userId ?? gig?.createdBy,
        );

        if (freelancerId && freelancerId !== this.loadedFreelancerId) {
          this.loadReviews(freelancerId);
        }
      },
    });
  }

  private loadReviews(freelancerId: number): void {
    this.loadedFreelancerId = freelancerId;

    this.profileService
      .getFreelancerReviews(freelancerId)
      .pipe(catchError(() => of([])))
      .subscribe((reviews) => {
        this.enrichReviews(this.sortNewestFirst(reviews ?? [])).subscribe((items) => {
          this.reviews = items;
          this.cdr.markForCheck();
        });
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

  private toTimeAgo(createdAt?: string): string {
    if (!createdAt) {
      return 'Recently';
    }

    const created = new Date(createdAt);
    if (Number.isNaN(created.getTime())) {
      return 'Recently';
    }

    const diffMs = Date.now() - created.getTime();
    const diffDays = Math.max(Math.floor(diffMs / (1000 * 60 * 60 * 24)), 0);

    if (diffDays < 1) {
      return 'Today';
    }

    if (diffDays === 1) {
      return '1 day ago';
    }

    if (diffDays < 30) {
      return `${diffDays} days ago`;
    }

    const months = Math.floor(diffDays / 30);
    return months === 1 ? '1 month ago' : `${months} months ago`;
  }

  private toReviewItem(
    review: FreelancerReviewResponse,
    index: number,
    profile?: MeProfileResponse,
  ): ReviewItem {
    return {
      avatarUrl: this.buildAvatarUrl(profile),
      name:
        profile?.fullName?.trim() ||
        profile?.clientName?.trim() ||
        review.clientName?.trim() ||
        `Client ${index + 1}`,
      timeAgo: this.toTimeAgo(review.createdAt),
      service: review.service?.trim() || 'Service',
      rating: Number(review.rating) || 0,
      comment: review.comment?.trim() || '',
    };
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

  private sortNewestFirst(reviews: FreelancerReviewResponse[]): FreelancerReviewResponse[] {
    return [...reviews].sort(
      (left, right) => this.toTimestamp(right.createdAt) - this.toTimestamp(left.createdAt),
    );
  }

  private toTimestamp(value?: string): number {
    if (!value) {
      return 0;
    }

    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  private resolveFreelancerId(candidate: number | string | null | undefined): number | null {
    const parsed = Number(candidate);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
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

  trackByIndex(index: number): number {
    return index;
  }
}
