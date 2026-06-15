import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  LucideAngularModule,
  Shield,
  BadgeCheck,
  Zap,
  LUCIDE_ICONS,
  LucideIconProvider,
  CircleCheck,
  ArrowRight,
} from 'lucide-angular';
import { LoginService } from '../../../services/auth/Login/login.service';

@Component({
  selector: 'landing-hero',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  providers: [
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({ Shield, BadgeCheck, Zap, CircleCheck, ArrowRight }),
    },
  ],
  templateUrl: 'hero.component.html',
})
export class Hero implements AfterViewInit {
  private readonly router = inject(Router);
  private readonly loginService = inject(LoginService);

  features = [
    { label: 'Secure payments', icon: Shield, color: 'text-[#10b981]' },
    { label: 'Verified freelancers', icon: BadgeCheck, color: 'text-[#22c55e]' },
    { label: 'Instant hiring', icon: Zap, color: 'text-[#f59e0b]' },
  ];

  readonly icons = { CircleCheck, ArrowRight };

  @ViewChild('heroVideo') heroVideo!: ElementRef<HTMLVideoElement>;
  ngAfterViewInit() {
    const video = this.heroVideo.nativeElement;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.load();

    video.play().catch((error) => {
      console.error('Error playing video:', error);
    });
  }

  onBrowseFreelancers(): void {
    if (!this.loginService.isLoggedIn()) {
      void this.router.navigate(['/auth/sign-in']);
      return;
    }

    void this.router.navigate(['/browse-freelancers']);
  }

  onBecomeFreelancer(): void {
    if (!this.loginService.isLoggedIn()) {
      void this.router.navigate(['/auth/sign-in']);
      return;
    }

    void this.router.navigate(['/index']);
  }
}
