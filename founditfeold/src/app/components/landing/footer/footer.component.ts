import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { LucideAngularModule, LUCIDE_ICONS, LucideIconProvider, Facebook, Twitter, Instagram, Linkedin} from 'lucide-angular';

@Component({
    selector: 'landing-footer',
    standalone: true,
    imports: [CommonModule, LucideAngularModule],
    providers: [
        {
            provide: LUCIDE_ICONS,
            multi: true,
            useValue: new LucideIconProvider({Facebook, Twitter, Instagram, Linkedin}),
        }
    ],
    templateUrl: 'footer.component.html',
})
export class Footer {
    readonly icons = { Facebook, Twitter, Instagram, Linkedin };
}