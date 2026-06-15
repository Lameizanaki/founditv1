import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { LucideAngularModule, LUCIDE_ICONS, LucideIconProvider, } from 'lucide-angular';
import { EkycComponent } from "../../components/ekyc/ekyc.component";

@Component({
    selector: 'app-ekyc',
    standalone: true,
    imports: [CommonModule, LucideAngularModule, EkycComponent],
    providers: [
        {
            provide: LUCIDE_ICONS,
            multi: true,
            useValue: new LucideIconProvider({}),
        }
    ],
    templateUrl: 'ekyc.html',
})
export class EkycPage {

}