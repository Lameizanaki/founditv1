import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LucideAngularModule, LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';
import { catchError, of } from 'rxjs';

import { Header } from '../../components/landing/header/header.component';
import { Footer } from '../../components/landing/footer/footer.component';
import { SkillsComponent } from '../../components/landing/freelancer-view-details/skills/skills.component';
import { ActiveGigsComponent } from '../../components/landing/freelancer-view-details/active-gigs/active.component';
import { ExperienceComponent } from '../../components/landing/freelancer-view-details/experience/experience.component';
import { ReviewComponent } from '../../components/landing/freelancer-view-details/review/review.component';
import { GigPriceCardComponent } from '../../components/landing/freelancer-view-details/profile/profile.component';
import {
  FreelancerProfileService,
  FreelancerReviewResponse,
} from '../../services/Freelancer/Profile/freelancer-profile.service';
import {
  FreelancerProfileResponse,
  FreelancerExperienceResponse,
} from '../../services/Freelancer/Profile/freelancer-profile.models';

interface LandingReviewItem {
  clientId?: number;
  name: string;
  timeAgo: string;
  service: string;
  rating: number;
  comment: string;
}

interface LandingExperienceItem {
  title: string;
  company: string;
  period: string;
  description: string;
}

@Component({
  selector: 'app-freelancer-view-details',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    Header,
    Footer,
    SkillsComponent,
    ActiveGigsComponent,
    ExperienceComponent,
    ReviewComponent,
    GigPriceCardComponent,
  ],
  providers: [
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({}),
    },
  ],
  templateUrl: './freelancer-view-details.html',
})
export class FreelancerViewDetailsPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly freelancerProfileService = inject(FreelancerProfileService);
  private readonly cdr = inject(ChangeDetectorRef);

  isLoading = true;
  errorMessage = '';
  freelancerId: number | null = null;
  freelancer: FreelancerProfileResponse | null = null;
  experiences: FreelancerExperienceResponse[] = [];
  reviews: LandingReviewItem[] = [];

  ngOnInit(): void {
    const routeId = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(routeId) || routeId <= 0) {
      this.errorMessage = 'Freelancer not found.';
      this.isLoading = false;
      return;
    }

    this.freelancerId = routeId;

    this.freelancerProfileService
      .getClientProfile(routeId)
      .pipe(catchError(() => of(null as FreelancerProfileResponse | null)))
      .subscribe((profile) => {
        this.freelancer = profile;
        this.freelancerId = profile?.id ?? routeId;
        this.errorMessage = profile ? '' : 'Freelancer details are unavailable right now.';
        this.isLoading = false;
        this.cdr.detectChanges();

        if (!profile) {
          return;
        }

        this.loadExperience(routeId);
        this.loadReviews(routeId);
      });
  }

  private loadExperience(freelancerId: number): void {
    this.freelancerProfileService
      .getClientExperience(freelancerId)
      .pipe(catchError(() => of([] as FreelancerExperienceResponse[])))
      .subscribe((experience) => {
        this.experiences = experience ?? [];
        this.cdr.detectChanges();
      });
  }

  private loadReviews(freelancerId: number): void {
    this.freelancerProfileService
      .getFreelancerReviews(freelancerId)
      .pipe(catchError(() => of([] as FreelancerReviewResponse[])))
      .subscribe((reviews) => {
        this.reviews = this.mapReviews(reviews ?? []);
        this.cdr.detectChanges();
      });
  }

  get description(): string {
    return this.freelancer?.description || this.freelancer?.about || '';
  }

  get skills(): string[] {
    return this.freelancer?.skill ?? [];
  }

  get landingExperiences(): LandingExperienceItem[] {
    return (this.experiences || []).map((experience) => ({
      title: experience.title || 'Freelancer Experience',
      company: experience.company || 'N/A',
      period:
        experience.period || this.buildPeriod(experience.startDate, experience.endDate) || 'N/A',
      description: experience.description || experience.bio || 'No description provided.',
    }));
  }

  private mapReviews(reviews: FreelancerReviewResponse[]): LandingReviewItem[] {
    return [...reviews]
      .sort((a, b) => this.toTimestamp(b.createdAt) - this.toTimestamp(a.createdAt))
      .map((review) => ({
        clientId: review.clientId,
        name: review.clientName?.trim() || 'Client',
        timeAgo: this.formatDate(review.createdAt),
        service: review.service?.trim() || 'Freelancer service',
        rating: review.rating && review.rating > 0 ? review.rating : 5,
        comment: review.comment?.trim() || 'No comment provided.',
      }));
  }

  private formatDate(value?: string): string {
    if (!value) {
      return 'Recently';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Recently';
    }

    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  private toTimestamp(value?: string): number {
    if (!value) {
      return 0;
    }

    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  private buildPeriod(startDate?: string, endDate?: string): string {
    const start = startDate ? this.formatShortDate(startDate) : '';
    const end = endDate ? this.formatShortDate(endDate) : 'Present';

    if (!start && !endDate) {
      return '';
    }

    if (!start) {
      return end;
    }

    return `${start} - ${end}`;
  }

  private formatShortDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString([], {
      month: 'short',
      year: 'numeric',
    });
  }
}
