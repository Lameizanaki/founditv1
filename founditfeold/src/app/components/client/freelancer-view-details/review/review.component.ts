import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChevronDown, ChevronUp, LucideAngularModule, Send, Star } from 'lucide-angular';
import { catchError, forkJoin, map, of } from 'rxjs';
import { FreelancerProfile } from '../../../../services/Client/freelancer.service';
import { ProfileService } from '../../../../services/Client/Profile/MeProfile.service';
import {
  FreelancerProfileService,
  FreelancerReviewResponse,
} from '../../../../services/Freelancer/Profile/freelancer-profile.service';
import { MeProfileResponse } from '../../../../services/Client/Profile/MeProfileResponse';
import { env } from '../../../../../environments/env';

interface EnrichedReview extends FreelancerReviewResponse {
  displayName?: string;
  avatarUrl?: string;
}

@Component({
  selector: 'app-client-freelancer-review-component',
  templateUrl: 'review.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
})
export class ReviewComponent implements OnChanges {
  private readonly profileService = inject(FreelancerProfileService);
  private readonly clientProfileService = inject(ProfileService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly icons = {
    Star,
    ChevronDown,
    ChevronUp,
    Send,
  };

  @Input() freelancer: FreelancerProfile | null = null;
  @Input() freelancerId: number | null = null;
  @Input() title = 'Reviews';
  @Input() initialVisibleCount = 3;

  reviews: EnrichedReview[] = [];
  showAll = false;
  isLoading = false;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  form = {
    rating: 5,
    service: '',
    comment: '',
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['freelancerId'] || changes['freelancer']) {
      this.loadReviews();
    }
  }

  get visibleReviews(): EnrichedReview[] {
    return this.showAll ? this.reviews : this.reviews.slice(0, this.initialVisibleCount);
  }

  get remainingCount(): number {
    return Math.max(this.reviews.length - this.initialVisibleCount, 0);
  }

  get resolvedFreelancerId(): number | null {
    const candidate = this.freelancerId ?? this.freelancer?.freelancerId ?? this.freelancer?.id;
    const parsed = Number(candidate);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  get canSubmit(): boolean {
    return this.form.comment.trim().length > 0 && !this.isSubmitting && !!this.resolvedFreelancerId;
  }

  toggleShowMore(): void {
    this.showAll = !this.showAll;
  }

  setRating(rating: number): void {
    this.form.rating = rating;
  }

  submitReview(): void {
    const freelancerId = this.resolvedFreelancerId;
    if (!freelancerId || !this.canSubmit) return;

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.profileService
      .createReview(freelancerId, {
        rating: this.form.rating,
        service: this.form.service.trim() || 'Freelancer service',
        comment: this.form.comment.trim(),
      })
      .subscribe({
        next: (review) => {
          this.enrichReviews([review]).subscribe((enriched) => {
            this.reviews = [...enriched, ...this.reviews];
            this.cdr.detectChanges();
          });
          this.form = { rating: 5, service: '', comment: '' };
          this.successMessage = 'Thanks, your review was posted.';
          this.isSubmitting = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Unable to post your review right now.';
          this.isSubmitting = false;
          this.cdr.detectChanges();
        },
      });
  }

  loadReviews(): void {
    const freelancerId = this.resolvedFreelancerId;
    if (!freelancerId) {
      this.reviews = [];
      this.cdr.detectChanges();
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges();
    this.profileService
      .getFreelancerReviews(freelancerId)
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
    if (!value) return 'Just now';

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
    const imageUrl = profile?.profilePictureUrl?.trim();
    if (imageUrl) {
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('data:')) {
        return imageUrl;
      }

      const base = env.apiUrl.replace(/\/$/, '');
      const path = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
      return `${base}${path}`;
    }

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
