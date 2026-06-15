import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";
import { BriefcaseBusiness, LucideAngularModule } from "lucide-angular";

interface ExperienceItem {
  title: string;
  company: string;
  period: string;
  description: string;
}

@Component({
    selector: "app-freelancer-experience-component",
    templateUrl: "experience.component.html",
    standalone: true,
    imports: [CommonModule, LucideAngularModule]
})
export class ExperienceComponent {
    readonly icons = {
        BriefcaseBusiness,
    };

   title = 'Experience';

  @Input() experiences: ExperienceItem[] = [
    {
      title: 'Senior Full Stack Developer',
      company: 'TechCorp Inc.',
      period: '2021 - Present',
      description:
        'Lead developer on enterprise web applications. Built scalable React/Node.js systems serving 100k+ users.',
    },
    {
      title: 'Frontend Developer',
      company: 'Digital Agency',
      period: '2019 - 2021',
      description:
        'Developed client websites and web apps using modern JavaScript frameworks. Collaborated with design teams.',
    },
    {
      title: 'UI/UX Designer',
      company: 'StartupLab',
      period: '2018 - 2019',
      description:
        'Designed user interfaces for mobile and web applications. Created design systems and prototypes in Figma.',
    },
  ];
}