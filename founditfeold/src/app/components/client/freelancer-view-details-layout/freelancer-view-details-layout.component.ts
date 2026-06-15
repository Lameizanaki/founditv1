import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LUCIDE_ICONS, LucideAngularModule, LucideIconProvider } from 'lucide-angular';
import { AboutComponent } from '../freelancer-view-details/about/about.component.js';
import { GigPriceCardComponent } from '../freelancer-view-details/profile/profile.component.js';
import { ExperienceComponent } from '../freelancer-view-details/experience/experience.component.js';
import { SkillsComponent } from '../freelancer-view-details/skills/skills.component.js';
import { ReviewComponent } from '../freelancer-view-details/review/review.component.js';
import { ActiveGigsComponent } from '../freelancer-view-details/active-gigs/active-gigs.component.js';
import { FreelancerService, FreelancerProfile } from '../../../services/Client/freelancer.service';

@Component({
  selector: 'app-client-freelancer-view-details',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    AboutComponent,
    GigPriceCardComponent,
    ExperienceComponent,
    SkillsComponent,
    ReviewComponent,
    ActiveGigsComponent,
  ],
  providers: [
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({}),
    },
  ],
  templateUrl: './freelancer-view-details-layout.component.html',
})
export class ViewDetailsLayoutComponent implements OnInit {
  freelancerId: number | null = null;
  routeId: string | null = null;
  freelancer: FreelancerProfile | null = null;
  isLoading = false;
  errorMessage: string | null = null;

  private resolveFreelancerId(profile: FreelancerProfile | null): number | null {
    const candidateIds = [
      profile?.id,
      profile?.profileId,
      profile?.freelancerId,
      profile?.freelancerProfileId,
    ];

    for (const candidateId of candidateIds) {
      if (candidateId !== undefined && candidateId !== null && !Number.isNaN(Number(candidateId))) {
        return Number(candidateId);
      }
    }

    return null;
  }

  constructor(
    private route: ActivatedRoute,
    private freelancerService: FreelancerService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadFreelancerProfile();
  }

  private loadFreelancerProfile(): void {
    const freelancerId = this.route.snapshot.paramMap.get('id');

    if (!freelancerId) {
      this.errorMessage = 'Freelancer ID not found';
      return;
    }

    // Store the original route parameter
    this.routeId = freelancerId;

    const parsedFreelancerId = Number(freelancerId);
    this.freelancerId = Number.isNaN(parsedFreelancerId) ? null : parsedFreelancerId;

    this.isLoading = true;
    this.errorMessage = null;

    this.freelancerService.getFreelancerProfileByIdOrName(freelancerId).subscribe({
      next: (data) => {
        this.freelancer = data;
        // Try to resolve numeric ID, but keep routeId as fallback
        this.freelancerId = this.resolveFreelancerId(data) ?? this.freelancerId;
        this.isLoading = false;
        this.cdr.detectChanges();
        console.log('Freelancer profile loaded');
      },
      error: (error) => {
        console.error('Error loading freelancer profile');
        this.errorMessage = 'Failed to load freelancer profile. Please try again later.';
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }
}
