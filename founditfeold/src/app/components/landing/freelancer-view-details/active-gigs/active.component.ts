import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { ChevronRight, CirclePlus, Clock3, LucideAngularModule, Star } from 'lucide-angular';
import { GigResponseDTO } from '../../../../services/Freelancer/Gig/GigResponse';
import { ImageUrlService } from '../../../../services/media/image-url.service';

interface Gig {
  id: number;
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
  templateUrl: './active.component.html',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
})
export class ActiveGigsComponent {
  @Input() gigs: GigResponseDTO[] = [];
  @Input() freelancerId: number | null = null;

  constructor(private router: Router, private imageUrlService: ImageUrlService) {}

  readonly icons = {
    CirclePlus,
    Clock3,
    ChevronRight,
    Star,
  };

  get normalizedGigs(): Gig[] {
    return (this.gigs || []).map((gig, index) => ({
      id: index + 1,
      title: gig.serviceTitle || 'Freelancer Service',
      image: this.buildImageData(gig),
      status: 'Active',
      rating: 5,
      reviews: 0,
      orders: 0,
      days: Number(gig.deliveryDate) || 0,
      price: Number(gig.price) || 0,
    }));
  }

  private buildImageData(gig: GigResponseDTO): string {
    return this.imageUrlService.fromDataOrUrl(
      gig.gigMainImageData,
      gig.gigMainImageContentType,
      gig.gigMainImageUrl,
    );
  }

  getStatusClasses(status: Gig['status']): string {
    return status === 'Active' ? 'bg-[#16a34a] text-white' : 'bg-[#f59e0b] text-white';
  }

  createGig(): void {
    void this.router.navigate(['/auth/sign-in']);
  }

  viewAllGigs(): void {
    void this.router.navigate(['/browse-gigs'], {
      queryParams: this.freelancerId ? { freelancerId: this.freelancerId } : undefined,
    });
  }
}
