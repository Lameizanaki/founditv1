import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Eye, Filter, LucideAngularModule, MapPin, Search, Star } from 'lucide-angular';
import { catchError, forkJoin, map, of } from 'rxjs';
import { FreelancerService, FreelancerProfile } from '../../../services/Client/freelancer.service';
import { FreelancerProfileService } from '../../../services/Freelancer/Profile/freelancer-profile.service';

@Component({
  selector: 'app-client-browse-freelancer-component',
  templateUrl: 'browse-freelancer.component.html',
  imports: [CommonModule, LucideAngularModule, FormsModule, RouterLink],
  standalone: true,
})
export class BrowseFreelancerComponent implements OnInit, OnDestroy {
  readonly icons = { Search, Filter, MapPin, Star, Eye };

  showFilters = false;
  isLoading = false;
  errorMessage: string | null = null;

  category = '';
  budgetRange = '';
  rating = '';
  location = '';
  searchQuery = '';

  freelancers: FreelancerProfile[] = [];
  filteredFreelancers: FreelancerProfile[] = [];
  private readonly avatarObjectUrls = new Map<string, string>();
  private readonly avatarRequests = new Set<string>();

  constructor(
    private freelancerService: FreelancerService,
    private freelancerProfileService: FreelancerProfileService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadFreelancers();
  }

  ngOnDestroy(): void {
    this.avatarObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.avatarObjectUrls.clear();
    this.avatarRequests.clear();
  }

  private loadFreelancers(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.cdr.detectChanges();

    this.freelancerService.getActiveFreelancers().subscribe({
      next: (data) => {
        this.enrichFreelancersWithViews(data || []).subscribe((freelancers) => {
        this.freelancers = freelancers;
        this.filteredFreelancers = this.shuffleFreelancers(this.freelancers);
        this.loadVisibleFreelancerAvatars();
        this.isLoading = false;
        this.cdr.detectChanges();
        });
      },
      error: (error) => {
        console.error('Error loading freelancers:', error);
        this.errorMessage = 'Failed to load freelancers. Please try again later.';
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private enrichFreelancersWithViews(
    freelancers: FreelancerProfile[],
  ) {
    if (freelancers.length === 0) {
      return of([]);
    }

    const lookups = freelancers.map((freelancer) => {
      const freelancerId = Number(this.getFreelancerId(freelancer));
      if (!Number.isFinite(freelancerId) || freelancerId <= 0) {
        return of(freelancer);
      }

      return this.freelancerProfileService.getClientRightSidebar(freelancerId).pipe(
        map((sidebar) => ({
          ...freelancer,
          profileViews: Number(sidebar.viewCount ?? sidebar.view ?? sidebar.views ?? sidebar.sideBarView ?? 0),
        })),
        catchError(() => of({ ...freelancer, profileViews: 0 })),
      );
    });

    return forkJoin(lookups);
  }

  private shuffleFreelancers(items: FreelancerProfile[]): FreelancerProfile[] {
    const shuffled = [...items];

    for (let index = shuffled.length - 1; index > 0; index--) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }

    return shuffled;
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  clearAllFilters(): void {
    this.category = '';
    this.budgetRange = '';
    this.rating = '';
    this.location = '';
    this.searchQuery = '';
    this.applyFilters();
  }

  applyFilters(): void {
    this.filteredFreelancers = this.freelancers.filter((freelancer) => {
      const matchesSearch =
        this.searchQuery === '' ||
        freelancer.freelancerName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        freelancer.freelancerJob?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        freelancer.about?.toLowerCase().includes(this.searchQuery.toLowerCase());

      const matchesCategory =
        this.category === '' ||
        freelancer.freelancerJob?.toLowerCase().includes(this.category.toLowerCase());

      const matchesBudget = this.matchesBudgetRange(freelancer);

      const matchesLocation =
        this.location === '' ||
        freelancer.workLocation?.toLowerCase().includes(this.location.toLowerCase());

      const matchesRating = this.rating === '' || freelancer.rating >= parseFloat(this.rating);

      return matchesSearch && matchesCategory && matchesBudget && matchesLocation && matchesRating;
    });

    this.currentPage = 1;
    this.loadVisibleFreelancerAvatars();
    this.cdr.detectChanges();
  }

  currentPage = 1;
  pageSize = 6;
  totalPages = 1;

  get paginatedFreelancers(): FreelancerProfile[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.totalPages = Math.ceil(this.filteredFreelancers.length / this.pageSize);
    return this.filteredFreelancers.slice(startIndex, startIndex + this.pageSize);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadVisibleFreelancerAvatars();
  }

  goToPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadVisibleFreelancerAvatars();
    }
  }

  goToNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadVisibleFreelancerAvatars();
    }
  }

  getFreelancerFullName(freelancer: FreelancerProfile): string {
    return freelancer.freelancerName;
  }

  getFreelancerId(freelancer: FreelancerProfile): string | number {
    const candidateIds = [
      freelancer.id,
      freelancer.profileId,
      freelancer.freelancerId,
      freelancer.freelancerProfileId,
    ];

    for (const candidateId of candidateIds) {
      if (candidateId !== undefined && candidateId !== null && !isNaN(Number(candidateId))) {
        return candidateId;
      }
    }
    // Fallback: log warning and return a safe identifier
    console.warn(
      'Freelancer ID is missing or invalid. Backend should include id field in response.',
      freelancer,
    );
    return freelancer.freelancerName || 'unknown';
  }

  getFreelancerAvatarSrc(freelancer: FreelancerProfile): string {
    const freelancerId = this.getFreelancerId(freelancer);
    const cached = this.avatarObjectUrls.get(String(freelancerId));
    if (cached) {
      return cached;
    }

    if (freelancer.profilePictureUrl) {
      return freelancer.profilePictureUrl;
    }

    if (freelancer.profilePictureData) {
      return `data:${freelancer.profilePictureType || 'image/jpeg'};base64,${freelancer.profilePictureData}`;
    }

    return '';
  }

  private loadVisibleFreelancerAvatars(): void {
    window.setTimeout(() => {
      for (const freelancer of this.paginatedFreelancers) {
        const freelancerId = this.getFreelancerId(freelancer);
        const key = String(freelancerId);
        if (!key || key === 'unknown' || this.avatarObjectUrls.has(key) || this.avatarRequests.has(key)) {
          continue;
        }

        this.avatarRequests.add(key);
        this.freelancerService.downloadFreelancerAvatar(freelancerId).subscribe({
          next: (blob) => {
            if (!blob || blob.size === 0) {
              return;
            }

            const url = URL.createObjectURL(blob);
            this.avatarObjectUrls.set(key, url);
            this.cdr.detectChanges();
          },
          error: () => {
            // Missing avatars fall back to initials.
          },
        });
      }
    });
  }

  getFreelancerExperienceLabel(freelancer: FreelancerProfile): string {
    return freelancer.yearExperience > 0
      ? `${freelancer.yearExperience}+ years experience`
      : 'Experience not listed';
  }

  getFreelancerStartingPrice(freelancer: FreelancerProfile): number | null {
    const servicePrices = this.getFreelancerGigPrices(freelancer);

    if (servicePrices.length > 0) {
      return Math.min(...servicePrices);
    }

    return null;
  }

  private matchesBudgetRange(freelancer: FreelancerProfile): boolean {
    const budget = this.parseBudgetRange(this.budgetRange);
    if (!budget) {
      return true;
    }

    const servicePrices = this.getFreelancerGigPrices(freelancer);
    if (servicePrices.length === 0) {
      return false;
    }

    return servicePrices.some((price) => price >= budget.min && price <= budget.max);
  }

  private parseBudgetRange(value: string): { min: number; max: number } | null {
    const numbers = value
      .match(/(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?/g)
      ?.map((part) => this.parseMoneyValue(part))
      .filter((number) => Number.isFinite(number));

    if (!numbers || numbers.length === 0) {
      return null;
    }

    if (numbers.length === 1) {
      return { min: 0, max: numbers[0] };
    }

    const [first, second] = numbers;
    return {
      min: Math.min(first, second),
      max: Math.max(first, second),
    };
  }

  private getFreelancerGigPrices(freelancer: FreelancerProfile): number[] {
    return (
      freelancer.activeService
        ?.map((service) => this.parseMoneyValue(service.price))
        .filter((price) => Number.isFinite(price) && price > 0) || []
    );
  }

  private parseMoneyValue(value: number | string | null | undefined): number {
    if (typeof value === 'number') {
      return value;
    }

    const normalized = String(value ?? '').replace(/,/g, '');
    const match = normalized.match(/\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : Number.NaN;
  }
}
