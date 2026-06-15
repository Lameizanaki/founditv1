import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  LucideAngularModule,
  LUCIDE_ICONS,
  LucideIconProvider,
  ArrowUpRight,
  CheckCircle2,
  PlusSquare,
} from 'lucide-angular';
import { LoginService } from '../../../services/auth/Login/login.service';

@Component({
  selector: 'landing-start-earning',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  providers: [
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({ ArrowUpRight, CheckCircle2, PlusSquare }),
    },
  ],
  templateUrl: 'start-earning.component.html',
})
export class StartEarning {
  private readonly router = inject(Router);
  private readonly loginService = inject(LoginService);

  readonly icons = { ArrowUpRight, CheckCircle2, PlusSquare };

  benefits = [
    {
      title: 'Create unlimited gigs',
      description: 'List as many services as you want across different categories.',
    },
    {
      title: 'Set your own rates',
      description: 'You control your pricing and delivery timelines.',
    },
    {
      title: 'Get discovered by clients',
      description: 'Your gigs appear in search results and category pages.',
    },
    {
      title: 'Secure payments',
      description: 'Get paid on time with our escrow payment system.',
    },
  ];

  onPostFirstGig(): void {
    if (!this.loginService.isLoggedIn()) {
      void this.router.navigate(['/auth/sign-in']);
      return;
    }

    void this.router.navigate(['/freelancer/create-new-service']);
  }

  onBrowseGigs(): void {
    void this.router.navigate(['/browse-gigs']);
  }
}
