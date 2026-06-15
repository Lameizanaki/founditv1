import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Eye, LockKeyhole, LucideAngularModule, ShieldCheck } from 'lucide-angular';
import { LoginService } from '../../../services/auth/Login/login.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './admin-login.component.html',
})
export class AdminLoginComponent {
  private readonly loginService = inject(LoginService);
  private readonly router = inject(Router);

  readonly icons = { Eye, LockKeyhole, ShieldCheck };

  email = '';
  password = '';
  showPassword = false;
  isLoading = false;
  errorMessage = '';

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.isLoading = true;

    this.loginService.login({ email: this.email, password: this.password }).subscribe({
      next: (response) => {
        const role = this.loginService.getRoleFromToken(response.token);
        if (!role?.toUpperCase().includes('ADMIN')) {
          this.loginService.logout();
          this.errorMessage = 'This account does not have admin access.';
          this.isLoading = false;
          return;
        }

        this.isLoading = false;
        this.router.navigateByUrl('/admin/dashboard', { replaceUrl: true });
      },
      error: () => {
        this.errorMessage = 'Invalid admin email or password.';
        this.isLoading = false;
      },
    });
  }
}
