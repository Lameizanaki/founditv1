import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  ChevronLeft,
  Eye,
  Filter,
  Pause,
  Pencil,
  Play,
  Search,
  Star,
  Trash2,
} from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';
import { GigResponseDTO } from '../../../services/Freelancer/Gig/GigResponse';
import { GigService } from '../../../services/Freelancer/Gig/gig.service';
import { ImageUrlService } from '../../../services/media/image-url.service';

type ServiceStatus = 'Active' | 'Paused';

interface ServiceItem {
  id: number;
  title: string;
  image: string;
  rating: number;
  activeOrders: number;
  status: ServiceStatus;
  price: number;
  impressions: number;
  clicks: number;
  createdAt: string;
  raw: GigResponseDTO;
}

@Component({
  selector: 'app-my-services',
  templateUrl: './my-services.component.html',
  imports: [CommonModule, LucideAngularModule, FormsModule, RouterLink],
})
export class MyServicesComponent implements OnInit {
  private readonly gigService = inject(GigService);
  private readonly imageUrlService = inject(ImageUrlService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  icons = {
    ChevronLeft,
    Eye,
    Search,
    Filter,
    Star,
    Pencil,
    Pause,
    Play,
    Trash2,
  };

  showFilter = false;
  searchTerm = '';
  loading = false;
  errorMessage = '';

  selectedStatus: 'all' | 'active' | 'paused' = 'all';
  sortBy: 'newest' | 'priceHigh' | 'rating' = 'newest';

  services: ServiceItem[] = [];
  filteredServices: ServiceItem[] = [];

  ngOnInit(): void {
    this.loadServices();
  }

  loadServices(): void {
    this.loading = true;
    this.errorMessage = '';

    this.gigService.getMyGigs().subscribe({
      next: (gigs) => {
        this.services = (gigs ?? [])
          .filter((gig) => this.normalizeStatus(gig.status) !== 'disabled')
          .map((gig, index) => this.mapGigToService(gig, index));
        this.loading = false;
        this.applyFilters();
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Unable to load your services right now.';
        this.loading = false;
        this.applyFilters();
        this.cdr.detectChanges();
      },
    });
  }

  toggleFilter(): void {
    this.showFilter = !this.showFilter;
  }

  setStatusFilter(status: 'all' | 'active' | 'paused'): void {
    this.selectedStatus = status;
    this.applyFilters();
  }

  setSortBy(sort: 'newest' | 'priceHigh' | 'rating'): void {
    this.sortBy = sort;
    this.applyFilters();
  }

  editService(id: number): void {
    void this.router.navigate(['/freelancer/create-new-service'], {
      queryParams: { editGigId: id },
    });
  }

  toggleServiceStatus(id: number): void {
    const service = this.services.find((item) => item.id === id);
    if (!service) return;

    this.errorMessage = '';
    const nextStatus: ServiceStatus = service.status === 'Active' ? 'Paused' : 'Active';
    this.services = this.services.map((item) =>
      item.id === id ? { ...item, status: nextStatus } : item,
    );
    this.applyFilters();

    const request =
      nextStatus === 'Paused' ? this.gigService.pauseGig(id) : this.gigService.resumeGig(id);

    request.subscribe({
      next: (updated) => {
        this.services = this.services.map((item) =>
          item.id === id ? this.mapGigToService(updated, 0, item) : item,
        );
        this.applyFilters();
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Unable to update service status.';
        this.services = this.services.map((item) =>
          item.id === id ? { ...item, status: service.status } : item,
        );
        this.applyFilters();
        this.cdr.detectChanges();
      },
    });
  }

  deleteService(id: number): void {
    const previous = [...this.services];
    this.errorMessage = '';
    this.services = this.services.filter((service) => service.id !== id);
    this.applyFilters();

    this.gigService.disableGig(id).subscribe({
      error: () => {
        this.errorMessage = 'Unable to disable this service.';
        this.services = previous;
        this.applyFilters();
        this.cdr.detectChanges();
      },
    });
  }

  applyFilters(): void {
    let result = [...this.services];

    const keyword = this.searchTerm.trim().toLowerCase();
    if (keyword) {
      result = result.filter((service) => service.title.toLowerCase().includes(keyword));
    }

    if (this.selectedStatus === 'active') {
      result = result.filter((service) => service.status === 'Active');
    } else if (this.selectedStatus === 'paused') {
      result = result.filter((service) => service.status === 'Paused');
    }

    if (this.sortBy === 'newest') {
      result.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    } else if (this.sortBy === 'priceHigh') {
      result.sort((a, b) => b.price - a.price);
    } else if (this.sortBy === 'rating') {
      result.sort((a, b) => b.rating - a.rating);
    }

    this.filteredServices = result;
  }

  private mapGigToService(
    gig: GigResponseDTO,
    index: number,
    existing?: ServiceItem,
  ): ServiceItem {
    const id = Number(gig.gigId ?? gig.id ?? existing?.id ?? index + 1);
    const status = this.normalizeStatus(gig.status) === 'paused' ? 'Paused' : 'Active';

    return {
      id,
      title: gig.serviceTitle || 'Untitled service',
      image: this.toImageSource(gig) || '/assets/images/default-avatar.png',
      rating: Number(gig.rating ?? existing?.rating ?? 0),
      activeOrders: existing?.activeOrders ?? 0,
      status,
      price: Number(gig.price ?? existing?.price ?? 0) || 0,
      impressions: existing?.impressions ?? 0,
      clicks: existing?.clicks ?? 0,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      raw: gig,
    };
  }

  private normalizeStatus(status: unknown): 'active' | 'paused' | 'disabled' {
    const normalized = String(status ?? 'active').trim().toLowerCase();
    if (normalized === 'paused') return 'paused';
    if (normalized === 'disabled') return 'disabled';
    return 'active';
  }

  private toImageSource(gig: GigResponseDTO): string {
    return this.imageUrlService.fromDataOrUrl(
      gig.gigMainImageData,
      gig.gigMainImageContentType,
      gig.gigMainImageUrl,
    );
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const clickedInsideFilter = target.closest('.relative');

    if (!clickedInsideFilter && this.showFilter) {
      this.showFilter = false;
    }
  }
}
