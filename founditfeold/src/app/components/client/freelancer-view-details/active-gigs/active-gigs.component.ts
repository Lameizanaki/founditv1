import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { ChevronRight, CirclePlus, Clock3, LucideAngularModule, Star } from 'lucide-angular';
import { RouterLink } from '@angular/router';
import { FreelancerProfile } from '../../../../services/Client/freelancer.service';
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
  selector: 'app-client-freelancer-active-gigs-component',
  templateUrl: './active-gigs.component.html',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterLink],
})
export class ActiveGigsComponent {
  private readonly imageUrlService = inject(ImageUrlService);
  @Input() freelancer: FreelancerProfile | null = null;

  readonly icons = {
    CirclePlus,
    Clock3,
    ChevronRight,
    Star,
  };

  getStatusClasses(status: Gig['status']): string {
    return status === 'Active' ? 'bg-[#16a34a] text-white' : 'bg-[#f59e0b] text-white';
  }

  createGig(): void {
    console.log('Create gig');
  }

  viewAllGigs(): void {
    console.log('View all gigs');
  }

  get browseGigsLink(): unknown[] {
    return ['/client/browse-gigs'];
  }

  get browseGigsQueryParams(): Record<string, number> | null {
    const freelancerId = this.freelancer?.freelancerId ?? this.freelancer?.id;
    return freelancerId ? { freelancerId: Number(freelancerId) } : null;
  }

  get displayGigs(): Gig[] {
    return (this.freelancer?.activeService ?? []).map((service, index) => ({
      id: service.gigId ?? service.id ?? index,
      title: service.serviceTitle || 'Untitled gig',
      image: this.imageUrlService.fromDataOrUrl(
        service.gigMainImageData,
        service.gigMainImageContentType,
        service.gigMainImageUrl,
      ),
      status: String(service.status ?? 'active').toLowerCase() === 'paused' ? 'Paused' : 'Active',
      rating: Number(service.rating ?? this.freelancer?.rating ?? 0),
      reviews: Number(service.reviews ?? 0),
      orders: Number(service.orders ?? 0),
      days: Number(service.deliveryDate ?? 0),
      price: Number(service.price ?? 0),
    }));
  }
}
