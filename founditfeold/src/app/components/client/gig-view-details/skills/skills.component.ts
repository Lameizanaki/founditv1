import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { GigDetailStateService } from '../gig-detail-state.service';

@Component({
  selector: 'app-client-skills-component',
  templateUrl: 'skills.component.html',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
})
export class SkillsComponent {
  private readonly detailState = inject(GigDetailStateService);

  title = 'Skills';

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

  ngOnInit(): void {
    this.detailState.profile$.subscribe({
      next: (profile) => {
        this.skills = profile?.skill?.length ? profile.skill : this.skills;
      },
    });
  }
}
