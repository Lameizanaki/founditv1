import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Input, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Pencil } from 'lucide-angular';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { FreelancerProfileService } from '../../../../services/Freelancer/Profile/freelancer-profile.service';

@Component({
  selector: 'app-freelancer-about-component',
  templateUrl: 'about.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
})
export class AboutComponent implements OnInit {
  private profileService = inject(FreelancerProfileService);
  private cd = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  @Input() title = 'About';

  @Input() description = '';

  icons = {
    Pencil,
  };

  isEditOpen = false;
  editedDescription = '';
  isLoading = false;
  errorMessage = '';

  ngOnInit(): void {
    this.loadAbout();

    this.profileService.profileChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadAbout());
  }

  loadAbout(): void {
    this.profileService.ensureMyProfile().subscribe({
      next: (response) => {
        this.description = response.about ?? '';
        this.cd.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Failed to load about section';
        this.cd.detectChanges();
      },
    });
  }

  openEditModal(): void {
    this.editedDescription = this.description;
    this.isEditOpen = true;
  }

  closeEditModal(): void {
    this.isEditOpen = false;
  }

  saveAbout(): void {
    const nextDescription = this.editedDescription.trim();
    if (!nextDescription) {
      this.errorMessage = 'About text cannot be empty';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.profileService
      .createAbout({ about: nextDescription })
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: (response) => {
          this.description = response.about ?? '';
          this.isEditOpen = false;
          this.cd.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Failed to update about section';
          this.cd.detectChanges();
        },
      });
  }
}
