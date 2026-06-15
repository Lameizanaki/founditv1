import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { LUCIDE_ICONS, LucideAngularModule, LucideIconProvider } from 'lucide-angular';
import { AboutComponent } from '../profile/about/about.component';
import { GigPriceCardComponent } from '../profile/profile/profile.component';
import { ExperienceComponent } from '../profile/experience/experience.component';
import { SkillsComponent } from '../profile/skills/skills.component';
import { ReviewComponent } from '../profile/review/review.component';
import { ActiveGigsComponent } from "../profile/active-gigs/active-gigs.component";

@Component({
  selector: 'app-client-freelancer-view-details',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    GigPriceCardComponent,
    AboutComponent,
    SkillsComponent,
    ActiveGigsComponent,
    ReviewComponent,
    ExperienceComponent
],
  providers: [
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({}),
    },
  ],
  templateUrl: './freelancer-view-details-layout.component.html',
})
export class ViewDetailsLayoutComponent {}
