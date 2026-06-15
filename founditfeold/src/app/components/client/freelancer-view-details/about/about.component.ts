import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { FreelancerProfile } from '../../../../services/Client/freelancer.service';

@Component({
  selector: 'app-client-freelancer-about-component',
  templateUrl: 'about.component.html',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
})
export class AboutComponent {
  title = 'About';

  @Input() freelancer: FreelancerProfile | null = null;
  @Input() description = '';

  get displayDescription(): string {
    return this.freelancer?.about?.trim() || this.description.trim();
  }
}
