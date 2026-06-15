import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Filter, LucideAngularModule, MapPin, Search, Star } from 'lucide-angular';
import { Header } from '../header/header.component';
import { Footer } from '../footer/footer.component';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { FreelancerProfileService } from '../../../services/Freelancer/Profile/freelancer-profile.service';
import { FreelancerProfile, FreelancerService } from '../../../services/Client/freelancer.service';

@Component({
  selector: 'app-browse-freelancer-component',
  templateUrl: 'browse-freelancer.component.html',
  imports: [CommonModule, LucideAngularModule, FormsModule, Header, Footer, RouterLink],
  standalone: true,
})
export class BrowseFreelancerComponent implements OnInit {
  private readonly freelancerService = inject(FreelancerService);
  private readonly freelancerProfileService = inject(FreelancerProfileService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly icons = { Search, Filter, MapPin, Star };

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

  currentPage = 1;
  pageSize = 6;
  totalPages = 1;

  ngOnInit(): void {
    this.loadFreelancers();
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
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.errorMessage = 'Failed to load freelancers. Please try again later.';
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private enrichFreelancersWithViews(freelancers: FreelancerProfile[]) {
    if (freelancers.length === 0) {
      return of<FreelancerProfile[]>([]);
    }

    const lookups = freelancers.map((freelancer) => {
      const freelancerId = Number(this.getFreelancerId(freelancer));
      if (!Number.isFinite(freelancerId) || freelancerId <= 0) {
        return of(freelancer);
      }

      return this.freelancerProfileService.getClientRightSidebar(freelancerId).pipe(
        map((sidebar) => ({
          ...freelancer,
          profileViews: Number(
            sidebar.viewCount ?? sidebar.view ?? sidebar.views ?? sidebar.sideBarView ?? 0,
          ),
        })),
        catchError(() => of({ ...freelancer, profileViews: Number(freelancer.profileViews ?? 0) })),
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
        freelancer.freelancerName?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        freelancer.freelancerJob?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        freelancer.about?.toLowerCase().includes(this.searchQuery.toLowerCase());

      const matchesCategory =
        this.category === '' ||
        (freelancer.skill &&
          freelancer.skill.some((skill) =>
            skill.toLowerCase().includes(this.category.toLowerCase()),
          ));

      const matchesLocation =
        this.location === '' ||
        freelancer.workLocation?.toLowerCase().includes(this.location.toLowerCase());

      const matchesRating =
        this.rating === '' || Number(freelancer.rating ?? 0) >= parseFloat(this.rating);

      return matchesSearch && matchesCategory && matchesLocation && matchesRating;
    });

    this.currentPage = 1;
    this.cdr.detectChanges();
  }

  get paginatedFreelancers(): FreelancerProfile[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.totalPages = Math.max(1, Math.ceil(this.filteredFreelancers.length / this.pageSize));
    return this.filteredFreelancers.slice(startIndex, startIndex + this.pageSize);
  }

  get visiblePages(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
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

    return freelancer.freelancerName || 'unknown';
  }

  getFreelancerAvatar(freelancer: FreelancerProfile): string {
    if (!freelancer.profilePictureData) {
      return '/assets/images/whiteBg.png';
    }

    return `data:${freelancer.profilePictureType ?? 'image/jpeg'};base64,${freelancer.profilePictureData}`;
  }

  getFreelancerStartingPrice(freelancer: FreelancerProfile): number | null {
    const servicePrices =
      freelancer.activeService
        ?.map((service) => Number(service.price))
        .filter((price) => !Number.isNaN(price) && price > 0) || [];

    if (servicePrices.length > 0) {
      return Math.min(...servicePrices);
    }

    return null;
  }
}
