import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { ChevronRight, CirclePlus, Clock3, LucideAngularModule, Star } from 'lucide-angular';
import { GigResponseDTO } from '../../../../services/Freelancer/Gig/GigResponse';
import { GigService } from '../../../../services/Freelancer/Gig/gig.service';
import { ImageUrlService } from '../../../../services/media/image-url.service';

interface Gig {
  id: number | string;
  title: string;
  image: string;
  status: 'Active' | 'Paused';
  rating: number;
  reviews: number;
  orders: number;
  days: number;
  price: number;
}

@Component({
  selector: 'app-freelancer-active-gigs-component',
  templateUrl: './active-gigs.component.html',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
})
export class ActiveGigsComponent implements OnInit {
  private gigService = inject(GigService);
  private imageUrlService = inject(ImageUrlService);
  private cd = inject(ChangeDetectorRef);
  private router = inject(Router);

  readonly icons = {
    CirclePlus,
    Clock3,
    ChevronRight,
    Star,
  };

  gigs: Gig[] = [];
  errorMessage = '';
  isLoading = false;

  ngOnInit(): void {
    this.loadGigs();
  }

  loadGigs(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.gigService.getMyGigs().subscribe({
      next: (response) => {
        this.gigs = (response ?? [])
          .filter((service) => this.normalizeStatus(service.status) !== 'disabled')
          .map((service, index) => this.mapGig(service, index));
        this.isLoading = false;
        this.cd.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Failed to load active gigs';
        this.isLoading = false;
        this.cd.detectChanges();
      },
    });
  }

  private mapGig(service: GigResponseDTO, index: number): Gig {
    const priceValue = Number(service.price ?? 0);
    const deliveryValue = Number(service.deliveryDate ?? 0);
    const image = this.imageUrlService.fromDataOrUrl(
      service.gigMainImageData,
      service.gigMainImageContentType,
      service.gigMainImageUrl,
    );

    return {
      id: service.gigId ?? service.id ?? index + 1,
      title: service.serviceTitle || service.packageDescription || 'Untitled service',
      image,
      status: this.normalizeStatus(service.status) === 'paused' ? 'Paused' : 'Active',
      rating: Number(service.rating ?? 0),
      reviews: Number(service.reviews ?? 0),
      orders: Number(service.orders ?? 0),
      days: Number.isFinite(deliveryValue) && deliveryValue > 0 ? deliveryValue : 0,
      price: Number.isFinite(priceValue) && priceValue > 0 ? priceValue : 0,
    };
  }

  private normalizeStatus(status: unknown): 'active' | 'paused' | 'disabled' {
    const normalized = String(status ?? 'active').trim().toLowerCase();
    if (normalized === 'paused') return 'paused';
    if (normalized === 'disabled') return 'disabled';
    return 'active';
  }

  getStatusClasses(status: Gig['status']): string {
    return status === 'Active' ? 'bg-[#16a34a] text-white' : 'bg-[#f59e0b] text-white';
  }

  createGig(): void {
    void this.router.navigate(['/freelancer/create-new-service']);
  }

  viewAllGigs(): void {
    void this.router.navigate(['/freelancer/my-services']);
  }

  viewGig(gigId: number | string): void {
    void this.router.navigate(['/freelancer/gigs', gigId]);
  }
}
