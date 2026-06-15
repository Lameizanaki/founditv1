import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BriefcaseBusiness, Plus, Pencil } from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';
import { finalize } from 'rxjs';
import { FreelancerExperienceResponse } from '../../../../services/Freelancer/Profile/freelancer-profile.models';
import { FreelancerProfileService } from '../../../../services/Freelancer/Profile/freelancer-profile.service';

@Component({
  selector: 'app-freelancer-experience-component',
  templateUrl: './experience.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
})
export class ExperienceComponent implements OnInit {
  private profileService = inject(FreelancerProfileService);
  private cd = inject(ChangeDetectorRef);

  title = 'Experience';

  icons = {
    BriefcaseBusiness,
    Plus,
    Pencil,
  };

  experiences: FreelancerExperienceResponse[] = [];
  isEditorOpen = false;
  isSaving = false;
  errorMessage = '';
  selectedExperienceId: number | null = null;

  experienceForm = {
    title: '',
    company: '',
    period: '',
    description: '',
    bio: '',
  };

  ngOnInit(): void {
    this.loadExperiences();
  }

  loadExperiences(): void {
    this.profileService.getMyExperience().subscribe({
      next: (response) => {
        this.experiences = response;
        this.cd.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Failed to load experience history';
        this.cd.detectChanges();
      },
    });
  }

  openCreateExperience(): void {
    this.selectedExperienceId = null;
    this.experienceForm = {
      title: '',
      company: '',
      period: '',
      description: '',
      bio: '',
    };
    this.errorMessage = '';
    this.isEditorOpen = true;
  }

  openEditExperience(experience: FreelancerExperienceResponse): void {
    this.selectedExperienceId = experience.experienceId ?? experience.id ?? null;
    this.experienceForm = {
      title: experience.title ?? '',
      company: experience.company ?? '',
      period: experience.period ?? '',
      description: experience.description ?? '',
      bio: experience.bio ?? '',
    };
    this.errorMessage = '';
    this.isEditorOpen = true;
  }

  closeEditor(): void {
    this.isEditorOpen = false;
  }

  saveExperience(): void {
    const request = {
      title: this.experienceForm.title.trim(),
      description: this.experienceForm.description.trim() || this.experienceForm.bio.trim(),
      bio: this.experienceForm.bio.trim(),
    };

    if (!request.title) {
      this.errorMessage = 'Experience title is required';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    const request$ = this.selectedExperienceId
      ? this.profileService.updateExperience(this.selectedExperienceId, request)
      : this.profileService.createExperience(request);

    request$
      .pipe(
        finalize(() => {
          this.isSaving = false;
        }),
      )
      .subscribe({
        next: () => {
          this.isEditorOpen = false;
          this.loadExperiences();
        },
        error: () => {
          this.errorMessage = 'Failed to save experience';
        },
      });
  }

  formatPeriod(experience: FreelancerExperienceResponse): string {
    if (experience.period?.trim()) {
      return experience.period;
    }

    if (experience.startDate || experience.endDate) {
      const start = experience.startDate ?? 'Unknown start';
      const end = experience.endDate ?? 'Present';
      return `${start} - ${end}`;
    }

    return 'Experience dates not specified';
  }
}
