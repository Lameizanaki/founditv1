import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { FreelancerProfile } from '../../../../services/Client/freelancer.service';

@Component({
  selector: 'app-client-freelancer-skills-component',
  templateUrl: 'skills.component.html',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
})
export class SkillsComponent {
  title = 'Skills';

  @Input() freelancer: FreelancerProfile | null = null;
  @Input() skills: string[] = [];

  get displaySkills(): string[] {
    const profileSkills = this.freelancer?.skill ?? [];
    return (profileSkills.length > 0 ? profileSkills : this.skills)
      .map((skill) => skill.trim())
      .filter((skill) => skill.length > 0);
  }
}
