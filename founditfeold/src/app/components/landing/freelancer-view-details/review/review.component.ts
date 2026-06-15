import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  inject,
} from '@angular/core';
import { catchError, forkJoin, map, of } from 'rxjs';
import { ChevronDown, ChevronUp, LucideAngularModule, Star } from 'lucide-angular';
import { ProfileService } from '../../../../services/Client/Profile/MeProfile.service';
import { MeProfileResponse } from '../../../../services/Client/Profile/MeProfileResponse';

interface ReviewItem {
  clientId?: number;
  avatarUrl?: string;
  name: string;
  timeAgo: string;
  service: string;
  rating: number;
  comment: string;
}

@Component({
  selector: 'app-freelancer-review-component',
  templateUrl: 'review.component.html',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
})
export class ReviewComponent {
  private readonly clientProfileService = inject(ProfileService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly icons = {
    Star,
    ChevronDown,
    ChevronUp,
  };

  @Input() title = 'Reviews';
  @Input() initialVisibleCount = 3;

  @Input() reviews: ReviewItem[] = [];
  enrichedReviews: ReviewItem[] = [];

  showAll = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['reviews']) {
      this.enrichReviews();
    }
  }

  private enrichReviews(): void {
    const source = this.reviews || [];

    if (source.length === 0) {
      this.enrichedReviews = [];
      this.cdr.markForCheck();
      return;
    }

    const lookups = source.map((review) => {
      const clientId = Number(review.clientId);
      if (!Number.isFinite(clientId) || clientId <= 0) {
        return of(this.toReviewItem(review));
      }

      return this.clientProfileService.getFreelancerViewProfile(clientId).pipe(
        map((profile) => this.toReviewItem(review, profile)),
        catchError(() => of(this.toReviewItem(review))),
      );
    });

    forkJoin(lookups).subscribe((items) => {
      this.enrichedReviews = items;
      this.cdr.markForCheck();
    });
  }

  private toReviewItem(review: ReviewItem, profile?: MeProfileResponse): ReviewItem {
    return {
      ...review,
      avatarUrl: this.buildAvatarUrl(profile),
      name: profile?.fullName?.trim() || profile?.clientName?.trim() || review.name || 'Client',
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

  get visibleReviews(): ReviewItem[] {
    return this.showAll
      ? this.enrichedReviews
      : this.enrichedReviews.slice(0, this.initialVisibleCount);
  }

  get remainingCount(): number {
    return Math.max(this.enrichedReviews.length - this.initialVisibleCount, 0);
  }

  toggleShowMore(): void {
    this.showAll = !this.showAll;
  }

  trackByIndex(index: number): number {
    return index;
  }
}
