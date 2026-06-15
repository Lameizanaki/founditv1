import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { LucideAngularModule, LUCIDE_ICONS, LucideIconProvider, } from 'lucide-angular';
import { GigPriceCardComponent } from "../gig-view-details/content/content.component";
import { AboutComponent } from "../gig-view-details/about/about.component";
import { SkillsComponent } from "../gig-view-details/skills/skills.component";
import { ExperienceComponent } from "../gig-view-details/experience/experience.component";
import { ReviewComponent } from "../gig-view-details/review/review.component";

@Component({
    selector: 'app-client-gig-view-details',
    standalone: true,
    imports: [CommonModule, LucideAngularModule, GigPriceCardComponent, AboutComponent, SkillsComponent, ExperienceComponent, ReviewComponent],
    providers: [
        {
            provide: LUCIDE_ICONS,
            multi: true,
            useValue: new LucideIconProvider({}),
        }
    ],
    templateUrl: './view-details-layout.component.html',
})
export class ViewDetailsLayoutComponent {


}