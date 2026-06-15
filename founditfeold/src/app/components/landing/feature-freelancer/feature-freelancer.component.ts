import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import {
  LucideAngularModule,
  LUCIDE_ICONS,
  LucideIconProvider,
  Star,
  MapPin,
  ArrowRight,
} from 'lucide-angular';
import { FreelancerService, FreelancerProfile } from '../../../services/Client/freelancer.service';
import { FreelancerProfileService } from '../../../services/Freelancer/Profile/freelancer-profile.service';

@Component({
  selector: 'landing-feature-freelancer',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterLink],
  providers: [
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({ Star, MapPin, ArrowRight }),
    },
  ],
  templateUrl: './feature-freelancer.component.html',
})
export class FeatureFreelancer implements OnInit {
  private readonly freelancerService = inject(FreelancerService);
  private readonly freelancerProfileService = inject(FreelancerProfileService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly icons = { Star, MapPin, ArrowRight };
  freelancers: FreelancerProfile[] = [];
  isLoading = false;

  ngOnInit(): void {
    this.loadFeaturedFreelancers();
  }

  private loadFeaturedFreelancers(): void {
    this.isLoading = true;

    this.freelancerService.getActiveFreelancers().subscribe({
      next: (items) => {
        this.enrichFreelancersWithViews(items ?? []).subscribe((enrichedItems) => {
          this.freelancers = [...enrichedItems]
            .sort(
              (left, right) =>
                this.getFreelancerViewCount(right) - this.getFreelancerViewCount(left) ||
                Number(right.rating ?? 0) - Number(left.rating ?? 0),
            )
            .slice(0, 3);
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.freelancers = [];
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
        return of({ ...freelancer, profileViews: Number(freelancer.profileViews ?? 0) });
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

  getFreelancerId(freelancer: FreelancerProfile): number | string {
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

    return freelancer.freelancerName;
  }

  getFreelancerViewCount(freelancer: FreelancerProfile): number {
    return Number(freelancer.profileViews ?? 0) || 0;
  }

  getFreelancerAvatar(freelancer: FreelancerProfile): string {
    if (!freelancer.profilePictureData) {
      return '/assets/images/whiteBg.png';
    }

    return `data:${freelancer.profilePictureType ?? 'image/jpeg'};base64,${freelancer.profilePictureData}`;
  }

  getFreelancerStartingPrice(freelancer: FreelancerProfile): number | null {
    const prices = (freelancer.activeService ?? [])
      .map((service) => Number(service.price))
      .filter((price) => Number.isFinite(price) && price > 0);

    if (prices.length === 0) {
      return null;
    }

    return Math.min(...prices);
  }
}
