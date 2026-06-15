import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { GigDetailStateService } from '../gig-detail-state.service';

@Component({
  selector: 'app-client-about-component',
  templateUrl: 'about.component.html',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
})
export class AboutComponent {
  private readonly detailState = inject(GigDetailStateService);
  private readonly cdr = inject(ChangeDetectorRef);

  title = 'About';

  description =
    'Full-stack developer focused on scalable web applications, clean UI systems, and reliable project delivery. Experienced in React, TypeScript, Node.js, and product-focused frontend architecture. I bring 5+ years of professional experience building high-quality applications for startups and enterprises. My approach combines technical excellence with clear communication to ensure successful project outcomes.';

  ngOnInit(): void {
    this.detailState.gig$.subscribe({
      next: (gig) => {
        const gigDescription =
          gig?.serviceDescription?.trim() || gig?.packageDescription?.trim() || '';
        this.description = gigDescription || this.description;
        this.cdr.markForCheck();
      },
    });

    this.detailState.profile$.subscribe({
      next: (profile) => {
        const profileAbout = profile?.about?.trim() || '';
        const profileContext = [profile?.freelancerJob?.trim(), profile?.workLocation?.trim()]
          .filter(Boolean)
          .join(' • ');

        this.description = profileAbout || profileContext || this.description;
        this.cdr.markForCheck();
      },
    });
  }
}
