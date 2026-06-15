import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { LucideAngularModule, LUCIDE_ICONS, LucideIconProvider, CodeXml, PanelsTopLeft, PenTool, Pencil, Video, Send,} from 'lucide-angular';

@Component({
    selector: 'landing-popular-category',
    standalone: true,
    imports: [CommonModule, LucideAngularModule],
    providers: [
        {
          provide: LUCIDE_ICONS,
          multi: true,
          useValue: new LucideIconProvider({CodeXml, PanelsTopLeft, PenTool, Pencil, Video, Send,}),
        }
    ],
    templateUrl: 'popular-category.component.html',
})
export class PopularCategory {

  categories = [
    {
      title: 'Web Development',
      subtitle: 'React, Node, WordPress',
      icon: CodeXml,
    },
    {
      title: 'UI/UX Design',
      subtitle: 'Web & Mobile Design',
      icon: PanelsTopLeft,
    },
    {
      title: 'Logo Design',
      subtitle: 'Brand Identity',
      icon: PenTool,
    },
    {
      title: 'Writing',
      subtitle: 'Copy & Content',
      icon: Pencil,
    },
    {
      title: 'Video Editing',
      subtitle: 'Animation & Post',
      icon: Video,
    },
    {
      title: 'Marketing',
      subtitle: 'SEO & Social Media',
      icon: Send,
    },
  ];

}