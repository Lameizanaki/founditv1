import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { LucideAngularModule, Search, Briefcase, ShieldCheck, LucideIconProvider, LUCIDE_ICONS} from 'lucide-angular';

@Component({
    selector: 'landing-how-it-work',
    standalone: true,
    imports: [CommonModule, LucideAngularModule],
    providers: [
        {
            provide: LUCIDE_ICONS,
            multi: true,
            useValue: new LucideIconProvider({Search, Briefcase, ShieldCheck}),
        }
    ],
    templateUrl: 'how-it-work.component.html',
})
export class HowItWork {
    steps = [
    {
      step: 'STEP 01',
      title: 'Browse Freelancers',
      description:
        'Explore thousands of expert freelancer profiles across categories like design, development, writing, and more.',
      icon: Search
    },
    {
      step: 'STEP 02',
      title: 'Hire Instantly',
      description:
        'Review profiles, compare fixed-price services, and send a hire request with one click.',
      icon: Briefcase
    },
    {
      step: 'STEP 03',
      title: 'Pay & Get Delivered',
      description:
        "Use secure escrow payment. Release funds only when you're 100% satisfied with the delivery.",
      icon: ShieldCheck
    }
  ];
}