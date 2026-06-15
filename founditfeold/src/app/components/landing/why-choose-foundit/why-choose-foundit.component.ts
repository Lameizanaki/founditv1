import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { LucideAngularModule, LUCIDE_ICONS, LucideIconProvider, BadgeCheck, Lock, MessageSquare, Clock3 } from 'lucide-angular';

@Component({
    selector: 'landing-why-choose-foundit',
    standalone: true,
    imports: [CommonModule, LucideAngularModule],
    providers: [
        {
            provide: LUCIDE_ICONS,
            multi: true,
            useValue: new LucideIconProvider({BadgeCheck, Lock, MessageSquare, Clock3}),
        }
    ],
    templateUrl: 'why-choose-foundit.component.html',
})
export class WhyChooseFoundit {
    readonly icons = { BadgeCheck, Lock, MessageSquare, Clock3 };

    reasons = [
        {
            title: 'Verified Freelancers',
            description: 'Every professional is thoroughly vetted.',
            icon: BadgeCheck,
            boxClass: 'bg-[#eaf7ef] text-[#16a34a]',
        },
        {
            title: 'Secure Escrow',
            description: 'Funds are held safely until work is approved.',
            icon: Lock,
            boxClass: 'bg-[#eaf7ef] text-[#16a34a]',
        },
        {
            title: 'Built-in Chat',
            description: 'Communicate & share files instantly.',
            icon: MessageSquare,
            boxClass: 'bg-[#f3e8ff] text-[#9333ea]',
        },
        {
            title: 'Fast Delivery',
            description: 'Agree on a deadline, get it done — on time, every time.',
            icon: Clock3,
            boxClass: 'bg-[#fff1e8] text-[#f97316]',
        },
    ];
}