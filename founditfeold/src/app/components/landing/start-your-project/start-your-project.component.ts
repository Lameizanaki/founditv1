import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LucideAngularModule, LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';
import { LoginService } from '../../../services/auth/Login/login.service';

@Component({
  selector: 'landing-start-your-project',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  providers: [
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({}),
    },
  ],
  templateUrl: 'start-your-project.component.html',
})
export class StartYourProject implements AfterViewInit {
  private readonly router = inject(Router);
  private readonly loginService = inject(LoginService);

  // properties []
  selectedOption: 'hire' | 'freelancer' = 'hire';

  ngAfterViewInit(): void {}

  // event ()
  selectOption(option: 'hire' | 'freelancer') {
    this.selectedOption = option;

    if (!this.loginService.isLoggedIn()) {
      void this.router.navigate(['/auth/sign-in']);
      return;
    }

    if (option === 'hire') {
      void this.router.navigate(['/browse-freelancers']);
      return;
    }

    void this.router.navigate(['/index']);
  }
}
