import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  inject,
  ChangeDetectorRef,
  OnInit,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { BriefcaseBusiness, LucideAngularModule } from 'lucide-angular';
import { FreelancerProfile } from '../../../../services/Client/freelancer.service';
import { finalize, Subscription } from 'rxjs';
import { FreelancerExperienceResponse } from '../../../../services/Freelancer/Profile/freelancer-profile.models';
import { FreelancerProfileService } from '../../../../services/Freelancer/Profile/freelancer-profile.service';

@Component({
  selector: 'app-client-freelancer-experience-component',
  templateUrl: 'experience.component.html',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
})
export class ExperienceComponent implements OnChanges, OnInit, AfterViewInit, OnDestroy {
  private readonly profileService = inject(FreelancerProfileService);
  private readonly cd = inject(ChangeDetectorRef);

  readonly icons = {
    BriefcaseBusiness,
  };

  title = 'Experience';
  @Input() freelancer: FreelancerProfile | null = null;
  @Input() freelancerId: number | null = null;

  experiences: FreelancerExperienceResponse[] = [];
  isLoading = false;
  errorMessage = '';
  private subscriptions: Subscription[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['freelancer'] || changes['freelancerId']) {
      this.loadExperiences();
    }
  }

  ngOnInit(): void {
    // Reload when profile changes elsewhere in the app
    const sub = this.profileService.profileChanged$.subscribe(() => {
      this.loadExperiences();
    });
    this.subscriptions.push(sub);
  }

  ngAfterViewInit(): void {
    // Ensure initial load runs after view init so bindings settle
    setTimeout(() => this.loadExperiences(), 0);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  loadExperiences(): void {
    const freelancerId = this.freelancerId ?? this.freelancer?.id;
    if (!freelancerId) {
      this.experiences = [];
      this.errorMessage = 'Freelancer ID not available for experience lookup.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.profileService
      .getClientExperience(freelancerId)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: (response) => {
          this.experiences = response || [];
          this.cd.detectChanges();
        },
        error: () => {
          this.experiences = [];
          this.errorMessage = 'Failed to load experience history.';
          this.cd.detectChanges();
        },
      });
  }
}
