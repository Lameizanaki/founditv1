import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Footer } from '../footer/footer.component';
import { Header } from '../header/header.component';
import {
  Clock3,
  Filter,
  LUCIDE_ICONS,
  LucideIconProvider,
  Search,
  Star,
  LucideAngularModule,
} from 'lucide-angular';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';
import { GigService } from '../../../services/Freelancer/Gig/gig.service';
import { FreelancerProfileService } from '../../../services/Freelancer/Profile/freelancer-profile.service';
import { GigResponseDTO } from '../../../services/Freelancer/Gig/GigResponse';
import { ImageUrlService } from '../../../services/media/image-url.service';

interface Gig {
  id: number;
  image: string;
  category: string;
  seller: string;
  sellerProfileImage: string;
  title: string;
  rating: number;
  reviews: number;
  delivery: string;
  price: number;
}

@Component({
  selector: 'app-browse-gig-component',
  templateUrl: 'browse-gig.component.html',
  imports: [CommonModule, Footer, Header, LucideAngularModule, FormsModule, RouterLink],
  providers: [
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({ Search, Filter, Star, Clock3 }),
    },
  ],
  standalone: true,
})
export class BrowseGigComponent implements OnInit {
  private readonly gigService = inject(GigService);
  private readonly freelancerProfileService = inject(FreelancerProfileService);
  private readonly imageUrlService = inject(ImageUrlService);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly icons = {
    Search,
    Filter,
    Star,
    Clock3,
  };

  readonly fallbackImage = 'assets/images/whiteBg.png';

  isLoading = false;
  errorMessage = '';

  showFilters = false;

  currentPage = 1;
  pageSize = 8;
  totalPages = 1;

  selectedCategory = 'All';
  searchTerm = '';

  budgetRange = '';
  deliveryTime = '';
  sellerLevel = '';
  sortBy = '';

  categories: string[] = ['All'];

  gigs: Gig[] = [];
  filteredFreelancerId: number | null = null;

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const freelancerId = Number(params.get('freelancerId'));
      this.filteredFreelancerId =
        Number.isFinite(freelancerId) && freelancerId > 0 ? freelancerId : null;
      this.fetchClientGigs();
    });
  }

  fetchClientGigs(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.gigService
      .getClientGigs()
      .pipe(
        mergeMap((response) => {
          const source = this.filterByFreelancer(Array.isArray(response) ? response : []);
          const profileRequests: Record<string, any> = {};

          source.forEach((gig: any) => {
            const freelancerId = gig.freelancerId || gig.userId || gig.createdBy;
            const freelancerIdStr = String(freelancerId);
            if (freelancerId && !profileRequests[freelancerIdStr]) {
              profileRequests[freelancerIdStr] = this.freelancerProfileService
                .getClientProfile(freelancerId)
                .pipe(catchError(() => of(null)));
            }
          });

          const profileIds = Object.keys(profileRequests);
          if (profileIds.length === 0) {
            return of({ gigs: source, profiles: {} as Record<string, any> });
          }

          return forkJoin(profileRequests).pipe(
            mergeMap((profiles: Record<string, any>) => of({ gigs: source, profiles })),
            catchError(() => of({ gigs: source, profiles: {} as Record<string, any> })),
          );
        }),
      )
      .subscribe({
        next: (data: any) => {
          const { gigs, profiles } = data as {
            gigs: any[];
            profiles: Record<string, any>;
          };

          this.gigs = gigs.map((gig: any, index: number) =>
            this.mapGigResponse(gig, index, profiles),
          );

          const uniqueCategories = new Set(
            this.gigs.map((gig) => gig.category).filter((category) => category.trim().length > 0),
          );
          this.categories = ['All', ...Array.from(uniqueCategories)];

          this.totalPages = Math.max(1, Math.ceil(this.gigs.length / this.pageSize));
          this.currentPage = 1;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.errorMessage = 'Failed to load gigs. Please try again in a moment.';
          this.gigs = [];
          this.categories = ['All'];
          this.totalPages = 1;
          this.currentPage = 1;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  private mapGigResponse(
    gig: GigResponseDTO,
    index: number,
    profiles: Record<string, any> = {},
  ): Gig {
    const delivery = this.toDeliveryText(gig.deliveryDate);
    const price = this.toNumber(gig.price);
    const category = (gig.category ?? '').trim();
    const image = this.toImageSource(gig);
    const fallbackName = `Freelancer ${index + 1}`;

    const freelancerId = gig.freelancerId || gig.userId || gig.createdBy;
    const freelancerIdStr = String(freelancerId);
    const freelancerProfile = freelancerId ? profiles[freelancerIdStr] : null;

    const seller =
      this.toStringSafe(freelancerProfile?.freelancerName) ||
      this.toStringSafe(gig.freelancerName) ||
      this.toStringSafe(gig.seller) ||
      fallbackName;

    const sellerProfileImage = this.getProfileImage(freelancerProfile);

    return {
      id: this.toGigId(gig, index),
      image,
      category: category || 'General',
      seller,
      sellerProfileImage,
      title: (gig.serviceTitle ?? gig.packageDescription ?? '').trim() || 'Untitled service',
      rating: this.toNumber(freelancerProfile?.rating ?? gig.rating),
      reviews: this.toNumber(freelancerProfile?.reviews ?? gig.reviews),
      delivery,
      price,
    };
  }

  private filterByFreelancer(gigs: GigResponseDTO[]): GigResponseDTO[] {
    if (!this.filteredFreelancerId) return gigs;

    return gigs.filter((gig) => {
      const freelancerId = Number(gig.freelancerId ?? gig.userId ?? gig.createdBy);
      return Number.isFinite(freelancerId) && freelancerId === this.filteredFreelancerId;
    });
  }

  private toGigId(gig: GigResponseDTO, index: number): number {
    const raw = gig.gigId ?? gig.id;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : index + 1;
  }

  private toImageSource(gig: GigResponseDTO): string {
    return this.imageUrlService.fromDataOrUrl(
      gig.gigMainImageData,
      gig.gigMainImageContentType,
      gig.gigMainImageUrl,
    ) || this.fallbackImage;
  }

  private toDeliveryText(value: unknown): string {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) {
      return `${numeric} days`;
    }

    const text = this.toStringSafe(value);
    return text || 'N/A';
  }

  private toNumber(value: unknown): number {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
  }

  private toStringSafe(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private getProfileImage(profile: any): string {
    if (!profile) {
      return '';
    }

    const imageUrl = this.imageUrlService.resolve(profile.profilePictureUrl);
    if (imageUrl) return imageUrl;

    let imageData = profile.profilePictureData;

    if (imageData instanceof Uint8Array) {
      try {
        imageData = String.fromCharCode.apply(null, Array.from(imageData));
        imageData = btoa(imageData);
      } catch {
        return '';
      }
    } else if (typeof imageData === 'string') {
      imageData = imageData.trim();
    } else {
      return '';
    }

    if (!imageData) {
      return '';
    }

    const mime = profile.profilePictureType?.trim() || 'image/jpeg';
    return `data:${mime};base64,${imageData}`;
  }

  get filteredGigs(): Gig[] {
    return this.gigs.filter((gig) => {
      const matchesSearch =
        !this.searchTerm ||
        gig.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        gig.seller.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        gig.category.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesCategory =
        this.selectedCategory === 'All' ||
        gig.category.toLowerCase().includes(this.selectedCategory.toLowerCase()) ||
        this.selectedCategory.toLowerCase().includes(gig.category.toLowerCase());

      const matchesDelivery =
        !this.deliveryTime || gig.delivery.toLowerCase().includes(this.deliveryTime.toLowerCase());

      return matchesSearch && matchesCategory && matchesDelivery;
    });
  }

  get paginatedGigs(): Gig[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const filtered = this.filteredGigs;
    this.totalPages = Math.max(1, Math.ceil(filtered.length / this.pageSize));
    return filtered.slice(startIndex, startIndex + this.pageSize);
  }

  get visiblePages(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  clearAllFilters(): void {
    this.selectedCategory = 'All';
    this.searchTerm = '';
    this.budgetRange = '';
    this.deliveryTime = '';
    this.sellerLevel = '';
    this.sortBy = '';
    this.currentPage = 1;
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
  }

  goToPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  goToNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  loadMoreGigs(): void {
    console.log('Load more gigs clicked');
  }
}
