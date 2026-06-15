import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Eye, LUCIDE_ICONS, LucideAngularModule, LucideIconProvider } from 'lucide-angular';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LoginService } from '../../services/auth/Login/login.service';
import { LocalRoleService } from '../../services/auth/Role/local-role.service';

@Component({
  selector: 'app-sign-in-component',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule, RouterLink],
  providers: [
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({ Eye }),
    },
  ],
  templateUrl: 'sign-in.component.html',
})
export class SignInComponent implements OnInit {
  private loginService = inject(LoginService);
  private localRoleService = inject(LocalRoleService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly icons = { Eye };

  email = '';
  password = '';
  rememberMe = false;
  showPassword = false;

  isLoading = false;
  errorMessage = '';

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const email = params.get('email');

      if (email) {
        this.email = email;
      }
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.isLoading = true;
    this.loginService
      .login({
        email: this.email,
        password: this.password,
      })
      .subscribe({
        next: (response) => {
          console.log('Login success');
          let role = this.loginService.getRoleFromToken(response.token);

          // If role is null from JWT, fallback to locally stored role
          if (!role) {
            const localRole = this.localRoleService.getSelectedRole();
            if (localRole) {
              role = localRole;
              this.loginService.setRole(localRole);
            }
          }

          if (!role) {
            this.isLoading = false;
            this.router.navigateByUrl('/index', { replaceUrl: true });
            return;
          }

          const normalizedRole = role.trim().toUpperCase();
          if (normalizedRole.includes('ADMIN')) {
            this.isLoading = false;
            this.router.navigateByUrl('/admin', { replaceUrl: true });
            return;
          }

          if (normalizedRole.includes('FREELANCER')) {
            this.isLoading = false;
            this.router.navigateByUrl('/freelancer', { replaceUrl: true });
            return;
          }

          if (normalizedRole.includes('CLIENT')) {
            this.isLoading = false;
            this.router.navigateByUrl('/client', { replaceUrl: true });
            return;
          }

          this.isLoading = false;
          this.router.navigateByUrl('/', { replaceUrl: true });
        },
        error: (error) => {
          console.error('Login failed');
          this.errorMessage = 'Invalid email or password';
          this.isLoading = false;
        },
      });
  }

  continueWithGoogle(): void {
    // Save email before redirecting to Google OAuth (for existing users)
    if (this.email) {
      localStorage.setItem('pending_email', this.email);
    }
    this.loginService.continueWithGoogle();
  }

}
