import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import {
  Clock3,
  LUCIDE_ICONS,
  LucideAngularModule,
  LucideIconProvider,
  Search,
  Star,
} from 'lucide-angular';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { mergeMap, catchError } from 'rxjs/operators';
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
  selector: 'app-client-browse-gig-component',
  templateUrl: 'browse-gig.component.html',
  imports: [CommonModule, LucideAngularModule, FormsModule, RouterLink],
  providers: [
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({ Search, Star, Clock3 }),
    },
  ],
  standalone: true,
})
export class BrowseGigComponent implements OnInit {
  private gigService = inject(GigService);
  private freelancerProfileService = inject(FreelancerProfileService);
  private imageUrlService = inject(ImageUrlService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  readonly icons = {
    Search,
    Star,
    Clock3,
  };

  readonly fallbackImage = 'assets/images/whiteBg.png';

  isLoading = false;
  errorMessage = '';

  currentPage = 1;
  readonly itemsPerPage = 10;

  selectedCategory = 'All';
  searchTerm = '';

  categories: string[] = ['All'];

  gigs: Gig[] = [];
  filteredFreelancerId: number | null = null;

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const freelancerId = Number(params.get('freelancerId'));
      this.filteredFreelancerId = Number.isFinite(freelancerId) && freelancerId > 0
        ? freelancerId
        : null;
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

          // Collect unique freelancer IDs
          source.forEach((gig: any) => {
            const freelancerId = gig.freelancerId || gig.userId || gig.createdBy;
            const freelancerIdStr = String(freelancerId);
            if (freelancerId && !profileRequests[freelancerIdStr]) {
              profileRequests[freelancerIdStr] = this.freelancerProfileService
                .getClientProfile(freelancerId)
                .pipe(catchError(() => of(null)));
            }
          });

          // Fetch all profiles in parallel
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

          this.currentPage = 1;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          if (error?.status === 0) {
            this.errorMessage =
              'Cannot reach backend (or blocked by CORS). Verify API is running on http://localhost:8085 and CORS allows your frontend origin.';
          } else {
            this.errorMessage =
              error?.error?.message ?? 'Failed to load gigs. Please try again in a moment.';
          }

          this.gigs = [];
          this.categories = ['All'];
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

    // Extract freelancer ID
    const freelancerId = gig.freelancerId || gig.userId || gig.createdBy;
    const freelancerIdStr = String(freelancerId);

    // Get freelancer profile from profiles map
    const freelancerProfile = freelancerId ? profiles[freelancerIdStr] : null;

    // Use freelancer name from profile first, then from gig, then fallback
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
    const numeric = this.toNumber(value);
    if (Number.isFinite(numeric) && numeric > 0) {
      return `${numeric} days`;
    }

    const text = this.toStringSafe(value);
    return text || 'N/A';
  }

  private toNumber(value: unknown): number {
    const normalized = String(value ?? '').replace(/,/g, '');
    const numeric = typeof value === 'number'
      ? value
      : Number(normalized.match(/\d+(?:\.\d+)?/)?.[0]);
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

    // Handle Uint8Array
    if (imageData instanceof Uint8Array) {
      try {
        imageData = String.fromCharCode.apply(null, Array.from(imageData));
        imageData = btoa(imageData);
      } catch (e) {
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

      return matchesSearch && matchesCategory;
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredGigs.length / this.itemsPerPage));
  }

  get paginatedGigs(): Gig[] {
    const safePage = Math.min(this.currentPage, this.totalPages);
    const startIndex = (safePage - 1) * this.itemsPerPage;
    return this.filteredGigs.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  get visibleStart(): number {
    if (this.filteredGigs.length === 0) {
      return 0;
    }

    return (Math.min(this.currentPage, this.totalPages) - 1) * this.itemsPerPage + 1;
  }

  get visibleEnd(): number {
    return Math.min(
      Math.min(this.currentPage, this.totalPages) * this.itemsPerPage,
      this.filteredGigs.length,
    );
  }

  resetPagination(): void {
    this.currentPage = 1;
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
    this.resetPagination();
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
