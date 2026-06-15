import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Eye, LUCIDE_ICONS, LucideAngularModule, LucideIconProvider } from 'lucide-angular';
import { LoginService } from '../../services/auth/Login/login.service';
import { Router, RouterLink } from '@angular/router';
import { SignUpService } from '../../services/auth/SignUp/sign-up.service';

@Component({
  selector: 'app-sign-up-component',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, RouterLink],
  providers: [
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({ Eye }),
    },
  ],
  templateUrl: 'sign-up.component.html',
})
export class SignUpComponent {
  private signUpWithGoogle = inject(LoginService);
  private register = inject(SignUpService);
  private router = inject(Router);

  readonly icons = { Eye };

  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';
  rememberMe = false;
  agreeTerms = false;

  isLoading = false;
  errorMessage = '';

  showPassword = false;
  showConfirmPassword = false;

  continueWithGoogle(): void {
    // Save email before redirecting to Google OAuth
    if (this.email) {
      localStorage.setItem('pending_email', this.email);
    }
    this.signUpWithGoogle.continueWithGoogle();
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmit(): void {
    this.errorMessage = '';

    const validationError = this.validateSignUpForm();
    if (validationError) {
      this.errorMessage = validationError;
      return;
    }

    this.isLoading = true;

    this.register
      .signUp({
        username: this.fullName.trim(),
        email: this.email.trim(),
        password: this.password,
      })
      .subscribe({
        next: (response) => {
          console.log('Signup success');
          localStorage.setItem('pending_email', this.email);
          this.router.navigateByUrl('/index', { replaceUrl: true });
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Signup failed');
          this.errorMessage = this.readSignupError(error);
          this.isLoading = false;
        },
      });
  }

  get passwordsDoNotMatch(): boolean {
    return this.confirmPassword.length > 0 && this.password !== this.confirmPassword;
  }

  private validateSignUpForm(): string | null {
    if (!this.fullName.trim()) {
      return 'Full name is required.';
    }

    if (!this.email.trim()) {
      return 'Email is required.';
    }

    if (!this.isValidEmail(this.email)) {
      return 'Enter a valid email address.';
    }

    if (!this.password) {
      return 'Password is required.';
    }

    if (this.password.length < 8) {
      return 'Password must be at least 8 characters.';
    }

    if (!this.confirmPassword) {
      return 'Please re-enter your password.';
    }

    if (this.password !== this.confirmPassword) {
      return 'Password and confirm password do not match.';
    }

    if (!this.agreeTerms) {
      return 'Please agree to the Terms and Privacy policy.';
    }

    return null;
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  private readSignupError(error: any): string {
    const body = error?.error;
    if (typeof body === 'string' && body.trim()) {
      return body;
    }

    if (body?.message) {
      return body.message;
    }

    return 'Signup failed. Please check your information and try again.';
  }
}
