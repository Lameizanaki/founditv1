import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { BriefcaseBusiness, LucideAngularModule } from 'lucide-angular';
import { GigDetailStateService } from '../gig-detail-state.service';

interface ExperienceItem {
  title: string;
  company: string;
  period: string;
  description: string;
}

@Component({
  selector: 'app-client-experience-component',
  templateUrl: 'experience.component.html',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
})
export class ExperienceComponent {
  private readonly detailState = inject(GigDetailStateService);

  readonly icons = {
    BriefcaseBusiness,
  };

  title = 'Experience';

  @Input() experiences: ExperienceItem[] = [];

  ngOnInit(): void {
    this.detailState.experiences$.subscribe({
      next: (items) => {
        this.experiences = items.map((experience) => ({
          title: experience.title?.trim() || 'Experience',
          company: experience.company?.trim() || 'Freelancer',
          period:
            experience.period?.trim() ||
            this.formatPeriod(experience.startDate, experience.endDate),
          description: experience.description?.trim() || experience.bio?.trim() || '',
        }));
      },
    });
  }

  private formatPeriod(startDate?: string, endDate?: string): string {
    if (!startDate && !endDate) {
      return 'N/A';
    }

    return `${startDate || 'Present'} - ${endDate || 'Present'}`;
  }
}
