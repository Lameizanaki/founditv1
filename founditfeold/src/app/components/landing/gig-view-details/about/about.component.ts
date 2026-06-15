import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { GigService } from '../../../../services/Freelancer/Gig/gig.service';
import { GigResponseDTO } from '../../../../services/Freelancer/Gig/GigResponse';
import { FreelancerProfileService } from '../../../../services/Freelancer/Profile/freelancer-profile.service';
import { FreelancerProfileResponse } from '../../../../services/Freelancer/Profile/freelancer-profile.models';
import { GigDetailStateService } from '../../../client/gig-view-details/gig-detail-state.service';

@Component({
  selector: 'app-freelancer-gig-about-component',
  templateUrl: 'about.component.html',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
})
export class AboutComponent {
  private readonly gigService = inject(GigService);
  private readonly profileService = inject(FreelancerProfileService);
  private readonly detailState = inject(GigDetailStateService);
  private readonly cdr = inject(ChangeDetectorRef);

  title = 'About';

  description =
    'Full-stack developer focused on scalable web applications, clean UI systems, and reliable project delivery. Experienced in React, TypeScript, Node.js, and product-focused frontend architecture. I bring 5+ years of professional experience building high-quality applications for startups and enterprises. My approach combines technical excellence with clear communication to ensure successful project outcomes.';

  private loadedFreelancerId: number | null = null;

  ngOnInit(): void {
    this.detailState.gig$.subscribe({
      next: (gig) => {
        const gigDescription =
          gig?.serviceDescription?.trim() || gig?.packageDescription?.trim() || '';
        this.description = gigDescription || this.description;
        this.cdr.markForCheck();

        const freelancerId = this.resolveFreelancerId(gig);
        if (freelancerId && freelancerId !== this.loadedFreelancerId) {
          this.loadedFreelancerId = freelancerId;
          this.loadProfile(freelancerId);
        }
      },
    });
  }

  private loadProfile(freelancerId: number): void {
    this.profileService.getClientProfile(freelancerId).subscribe({
      next: (profile) => {
        this.detailState.setProfile(profile);

        const profileAbout = profile?.about?.trim() || profile?.description?.trim() || '';
        const profileContext = [profile?.freelancerJob?.trim(), profile?.workLocation?.trim()]
          .filter(Boolean)
          .join(' • ');

        this.description = profileAbout || profileContext || this.description;
        this.cdr.markForCheck();
      },
      error: () => {
        this.cdr.markForCheck();
      },
    });
  }

  private resolveFreelancerId(gig: GigResponseDTO | null): number | null {
    const candidate = Number(gig?.freelancerId ?? gig?.userId ?? gig?.createdBy);
    return Number.isFinite(candidate) && candidate > 0 ? candidate : null;
  }
}
