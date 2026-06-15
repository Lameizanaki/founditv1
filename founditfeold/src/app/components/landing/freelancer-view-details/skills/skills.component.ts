import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";
import { LucideAngularModule } from "lucide-angular";

@Component({
    selector: "app-freelancer-skills-component",
    templateUrl: "skills.component.html",
    standalone: true,
    imports: [CommonModule, LucideAngularModule]
})
export class SkillsComponent {
    title = 'Skills';

    @Input() skills: string[] = [
        'React',
        'TypeScript',
        'Node.js',
        'Tailwind CSS',
        'UI/UX Design',
        'Figma',
        'Next.js',
        'PostgreSQL',
        'AWS',
        'Git',
    ];
}