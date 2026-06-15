import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input, OnInit, inject } from '@angular/core';
import { ChevronDown, ChevronUp, LucideAngularModule, Star, Trash2 } from 'lucide-angular';
import { catchError, forkJoin, map, of } from 'rxjs';
import { ProfileService } from '../../../../services/Client/Profile/MeProfile.service';
import { MeProfileResponse } from '../../../../services/Client/Profile/MeProfileResponse';
import {
  FreelancerProfileService,
  FreelancerReviewResponse,
} from '../../../../services/Freelancer/Profile/freelancer-profile.service';
import { ImageUrlService } from '../../../../services/media/image-url.service';

interface EnrichedReview extends FreelancerReviewResponse {
  displayName?: string;
  avatarUrl?: string;
}

@Component({
  selector: 'app-freelancer-review-component',
  templateUrl: 'review.component.html',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
})
export class ReviewComponent implements OnInit {
  private readonly profileService = inject(FreelancerProfileService);
  private readonly clientProfileService = inject(ProfileService);
  private readonly imageUrlService = inject(ImageUrlService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly icons = {
    Star,
    ChevronDown,
    ChevronUp,
    Trash2,
  };

  @Input() title = 'Reviews';
  @Input() initialVisibleCount = 3;

  reviews: EnrichedReview[] = [];
  showAll = false;
  isLoading = false;
  errorMessage = '';
  deletingReviewId: number | null = null;

  ngOnInit(): void {
    this.loadReviews();
  }

  get visibleReviews(): EnrichedReview[] {
    return this.showAll ? this.reviews : this.reviews.slice(0, this.initialVisibleCount);
  }

  get remainingCount(): number {
    return Math.max(this.reviews.length - this.initialVisibleCount, 0);
  }

  toggleShowMore(): void {
    this.showAll = !this.showAll;
    this.cdr.detectChanges();
  }

  deleteReview(review: FreelancerReviewResponse): void {
    if (!review.id || this.deletingReviewId) return;

    this.deletingReviewId = review.id;
    this.errorMessage = '';

    this.profileService.deleteReview(review.id).subscribe({
      next: () => {
        this.reviews = this.reviews.filter((item) => item.id !== review.id);
        this.deletingReviewId = null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Unable to delete this review right now.';
        this.deletingReviewId = null;
        this.cdr.detectChanges();
      },
    });
  }

  loadReviews(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.profileService
      .getMyReviews()
      .pipe(catchError(() => of([])))
      .subscribe((reviews) => {
        this.enrichReviews(this.sortNewestFirst(reviews ?? [])).subscribe((enriched) => {
          this.reviews = enriched;
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      });
  }

  formatDate(value?: string): string {
    if (!value) return 'Recently';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Recently';

    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  initials(review: EnrichedReview): string {
    const source = review.displayName?.trim() || review.clientName?.trim() || 'Client';
    return source
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  trackByReviewId(index: number, review: EnrichedReview): number {
    return review.id ?? index;
  }

  private enrichReviews(reviews: FreelancerReviewResponse[]) {
    if (reviews.length === 0) {
      return of([]);
    }

    const lookups = reviews.map((review) => {
      const clientId = Number(review.clientId);
      if (!Number.isFinite(clientId) || clientId <= 0) {
        return of(this.toEnrichedReview(review));
      }

      return this.clientProfileService.getFreelancerViewProfile(clientId).pipe(
        map((profile) => this.toEnrichedReview(review, profile)),
        catchError(() => of(this.toEnrichedReview(review))),
      );
    });

    return forkJoin(lookups);
  }

  private toEnrichedReview(
    review: FreelancerReviewResponse,
    profile?: MeProfileResponse,
  ): EnrichedReview {
    return {
      ...review,
      displayName:
        profile?.fullName?.trim() ||
        profile?.clientName?.trim() ||
        review.clientName ||
        'Client',
      avatarUrl: this.buildAvatarUrl(profile),
    };
  }

  private buildAvatarUrl(profile?: MeProfileResponse): string | undefined {
    const imageUrl = this.imageUrlService.resolve(profile?.profilePictureUrl);
    if (imageUrl) return imageUrl;

    const imageData = profile?.profilePictureData;
    if (!imageData) return undefined;

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
      (a, b) => this.toTimestamp(b.createdAt) - this.toTimestamp(a.createdAt) || b.id - a.id,
    );
  }

  private toTimestamp(value?: string): number {
    if (!value) return 0;

    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }
}
