import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideAngularModule,
  LUCIDE_ICONS,
  LucideIconProvider,
  Star,
  Clock,
  ArrowRight,
} from 'lucide-angular';
import { GigService } from '../../../services/Freelancer/Gig/gig.service';
import { GigResponseDTO } from '../../../services/Freelancer/Gig/GigResponse';
import { ImageUrlService } from '../../../services/media/image-url.service';

interface PopularGigCard {
  id: number | string;
  category: string;
  image: string;
  author: string;
  title: string;
  rating: number;
  reviews: number;
  delivery: string;
  price: number;
}

@Component({
  selector: 'landing-popular-gigs',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterLink],
  providers: [
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({ Star, Clock, ArrowRight }),
    },
  ],
  templateUrl: 'popular-gigs.component.html',
})
export class PopularGigs implements OnInit {
  private readonly gigService = inject(GigService);
  private readonly imageUrlService = inject(ImageUrlService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly icons = { Star, Clock, ArrowRight };
  isLoading = false;
  gigs: PopularGigCard[] = [];

  ngOnInit(): void {
    this.loadPopularGigs();
  }

  private loadPopularGigs(): void {
    this.isLoading = true;

    this.gigService.getClientGigs().subscribe({
      next: (items) => {
        const selectedItems = this.selectPopularGigs(items ?? []);
        this.gigs = selectedItems.map((item) => this.mapGigToCard(item));
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.gigs = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private selectPopularGigs(items: GigResponseDTO[]): GigResponseDTO[] {
    if (items.length <= 4) {
      return items;
    }

    const sorted = [...items].sort(
      (left, right) => this.getViewerScore(right) - this.getViewerScore(left),
    );

    const topPool = sorted.slice(0, Math.min(12, sorted.length));
    const pool = [...topPool];
    const picked: GigResponseDTO[] = [];

    while (picked.length < 4 && pool.length > 0) {
      const randomIndex = Math.floor(Math.random() * pool.length);
      const [pickedItem] = pool.splice(randomIndex, 1);
      picked.push(pickedItem);
    }

    return picked;
  }

  private getViewerScore(gig: GigResponseDTO): number {
    const dynamicGig = gig as unknown as Record<string, unknown>;
    const viewCandidates = [
      dynamicGig['viewCount'],
      dynamicGig['views'],
      dynamicGig['viewer'],
      dynamicGig['viewerCount'],
      gig.reviews,
    ];

    for (const candidate of viewCandidates) {
      const numericValue = Number(candidate);
      if (Number.isFinite(numericValue) && numericValue > 0) {
        return numericValue;
      }
    }

    return 0;
  }

  private mapGigToCard(gig: GigResponseDTO): PopularGigCard {
    const gigId = gig.gigId ?? gig.id ?? 0;
    const deliveryDays = Number(gig.deliveryDate);

    return {
      id: gigId,
      category: gig.category || 'General',
      image: this.toGigImage(gig),
      author: gig.freelancerName || gig.seller || 'Freelancer',
      title: gig.serviceTitle || gig.packageDescription || 'Untitled gig',
      rating: Number(gig.rating ?? 0),
      reviews: Number(gig.reviews ?? 0),
      delivery: Number.isFinite(deliveryDays) && deliveryDays > 0 ? `${deliveryDays} days` : 'N/A',
      price: Number(gig.price ?? 0),
    };
  }

  private toGigImage(gig: GigResponseDTO): string {
    return this.imageUrlService.fromDataOrUrl(
      gig.gigMainImageData,
      gig.gigMainImageContentType,
      gig.gigMainImageUrl,
    ) || '/assets/images/whiteBg.png';
  }
}
