import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Input, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Plus } from 'lucide-angular';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { FreelancerProfileService } from '../../../../services/Freelancer/Profile/freelancer-profile.service';
import { GigResponseDTO } from '../../../../services/Freelancer/Gig/GigResponse';

@Component({
  selector: 'app-freelancer-skills-component',
  templateUrl: 'skills.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
})
export class SkillsComponent implements OnInit {
  private profileService = inject(FreelancerProfileService);
  private cd = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  title = 'Skills';

  icons = {
    Plus,
  };

  @Input() skills: string[] = [
    'React',
    'TypeScript',
    'Node.js',
    'Tailwind CSS',
    'UI/UX Design',
    'Figma',
    'Next.js',
    'PostgreSQL',
    'AWS',
    'Git',
  ];

  isEditOpen = false;
  isSaving = false;
  errorMessage = '';
  newSkill = '';
  editedSkills: string[] = [];

  ngOnInit(): void {
    this.loadSkills();

    this.profileService.profileChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadSkills());
  }

  loadSkills(): void {
    this.profileService.ensureMyProfile().subscribe({
      next: (response) => {
        this.skills = this.extractSkills(response);
        this.cd.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Failed to load skills';
        this.cd.detectChanges();
      },
    });
  }

  openEditor(): void {
    this.editedSkills = [...this.skills];
    this.newSkill = '';
    this.errorMessage = '';
    this.isEditOpen = true;
  }

  closeEditor(): void {
    this.isEditOpen = false;
  }

  addSkill(): void {
    const skill = this.newSkill.trim();
    if (!skill) {
      return;
    }

    if (!this.editedSkills.some((item) => item.toLowerCase() === skill.toLowerCase())) {
      this.editedSkills = [...this.editedSkills, skill];
    }

    this.newSkill = '';
  }

  removeSkill(skill: string): void {
    this.editedSkills = this.editedSkills.filter((item) => item !== skill);
  }

  saveSkills(): void {
    this.isSaving = true;
    this.errorMessage = '';

    this.profileService
      .createSkill({ skill: this.editedSkills })
      .pipe(
        finalize(() => {
          this.isSaving = false;
        }),
      )
      .subscribe({
        next: (response) => {
          this.skills = this.extractSkills(response);
          this.isEditOpen = false;
          this.profileService.notifyProfileChanged();
        },
        error: () => {
          this.errorMessage = 'Failed to update skills';
        },
      });
  }

  private extractSkills(response: {
    skill?: string[];
    activeService?: GigResponseDTO[];
  }): string[] {
    const gigTags = (response.activeService ?? [])
      .flatMap((gig) => gig.tags ?? [])
      .filter((tag): tag is string => typeof tag === 'string')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    const profileSkills =
      response.skill
        ?.filter((skill): skill is string => typeof skill === 'string')
        .map((skill) => skill.trim())
        .filter((skill) => skill.length > 0) ?? [];

    return Array.from(new Set([...gigTags, ...profileSkills]));
  }
}
