import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { LucideAngularModule, LUCIDE_ICONS, LucideIconProvider, Star, StarOff} from 'lucide-angular';

@Component({
    selector: 'landing-love-by-business',
    standalone: true,
    imports: [CommonModule, LucideAngularModule],
    providers: [
        {
            provide: LUCIDE_ICONS,
            multi: true,
            useValue: new LucideIconProvider({Star, StarOff}),
        }
    ],
    templateUrl: 'love-by-business.component.html',
})
export class LoveByBusiness {
     readonly icons = { Star, StarOff };

    testimonials = [
        {
            quote:
                '"FoundIt made hiring a freelance developer incredibly easy. We launched our MVP three weeks ahead of schedule!"',
            name: 'Sarah T.',
            role: 'Startup Founder',
        },
        {
            quote:
                '"The graphic design freelancers here are top-notch. The secure payment system gave us complete peace of mind."',
            name: 'James W.',
            role: 'Marketing Director',
        },
        {
            quote:
                '"From finding talent to tracking deliveries, this freelance marketplace has the best project management tools built-in."',
            name: 'Anita P.',
            role: 'E-commerce Owner',
        },
    ];

    filledStars = Array(5);
}