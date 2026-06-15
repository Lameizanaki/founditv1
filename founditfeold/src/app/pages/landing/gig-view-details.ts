import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { LUCIDE_ICONS, LucideAngularModule, LucideIconProvider } from 'lucide-angular';
import { Header } from '../../components/landing/header/header.component';
import { Footer } from '../../components/landing/footer/footer.component';
import { GigPriceCardComponent } from '../../components/landing/gig-view-details/content/content.component';
import { AboutComponent } from '../../components/landing/gig-view-details/about/about.component';
import { ReviewComponent } from '../../components/landing/gig-view-details/review/review.component';

@Component({
  selector: 'app-freelancer-gig-view-details',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    GigPriceCardComponent,
    AboutComponent,
    ReviewComponent,
    Footer,
    Header,
  ],
  providers: [
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({}),
    },
  ],
  templateUrl: './gig-view-details.html',
})
export class GigViewDetailsPage {}
