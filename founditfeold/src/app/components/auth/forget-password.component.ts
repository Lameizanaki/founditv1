import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  Check,
  Clock3,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Shield,
  LucideAngularModule,
} from 'lucide-angular';
import { ForgetPasswordService } from '../../services/auth/ForgetPassword/forget-password.service';

type ResetStep = 'email' | 'verify' | 'password' | 'done';

@Component({
  selector: 'app-forget-password-component',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './forget-password.component.html',
})
export class ForgetPasswordComponent {
  private forgetPasswordService = inject(ForgetPasswordService);
  private router = inject(Router);

  readonly icons = {
    Mail,
    Clock3,
    Shield,
    Check,
    Lock,
    Eye,
    EyeOff,
  };

  step: ResetStep = 'email';

  email = 'you@example.com';
  emailTouched = false;
  verificationCode = ['', '', '', '', '', ''];
  password = '';
  confirmPassword = '';

  showPassword = false;
  showConfirmPassword = false;

  isLoading = false;
  errorMessage = '';

  get isEmailValid(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim());
  }

  get shouldShowEmailError(): boolean {
    return this.emailTouched && !this.isEmailValid;
  }

  get isVerificationComplete(): boolean {
    return this.verificationCode.every((digit) => digit.trim() !== '');
  }

  get isPasswordValid(): boolean {
    return this.password.trim().length >= 8;
  }

  get doPasswordsMatch(): boolean {
    return this.password === this.confirmPassword && this.confirmPassword.length > 0;
  }

  get canSubmit(): boolean {
    if (this.step === 'email') return this.isEmailValid;
    if (this.step === 'verify') return this.isVerificationComplete;
    if (this.step === 'password') return this.isPasswordValid && this.doPasswordsMatch;
    return false;
  }

  submit(): void {
    if (this.isLoading) return;

    if (this.step === 'email') {
      this.emailTouched = true;
      if (!this.isEmailValid) return;

      this.verificationCode = ['', '', '', '', '', ''];
      this.step = 'verify';
      this.isLoading = true;
      this.errorMessage = '';
      this.forgetPasswordService.sendCode({ email: this.email.trim() }).subscribe({
        next: () => {
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Send code failed:', error);
          this.errorMessage = 'Failed to send verification code';
          this.step = 'email';
          this.isLoading = false;
        },
      });
      return;
    }

    if (this.step === 'verify') {
      if (!this.isVerificationComplete) return;
      this.step = 'password';
      return;
    }

    if (this.step === 'password') {
      if (!this.canSubmit) return;
      this.isLoading = true;
      this.errorMessage = '';
      this.forgetPasswordService
        .resetPassword({
          email: this.email.trim(),
          verifyCode: this.verificationCode.join(''),
          newPassword: this.password,
        })
        .subscribe({
          next: () => {
            this.isLoading = false;
            this.backToSignIn();
          },
          error: (error) => {
            console.error('Reset password failed:', error);
            this.errorMessage = 'Failed to reset password';
            this.isLoading = false;
          },
        });
    }
  }

  backToSignIn(): void {
    this.router.navigateByUrl('/auth/sign-in', { replaceUrl: true });
  }

  trackByIndex(index: number): number {
    return index;
  }

  onCodeInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '').slice(0, 1);
    input.value = value;
    this.verificationCode[index] = value;

    if (value && index < 5) {
      const next = document.getElementById(`code-${index + 1}`) as HTMLInputElement | null;
      next?.focus();
    }
  }

  onCodeKeydown(event: KeyboardEvent, index: number): void {
    const input = event.target as HTMLInputElement;

    if (event.key === 'Backspace' && !input.value && index > 0) {
      const prev = document.getElementById(`code-${index - 1}`) as HTMLInputElement | null;
      prev?.focus();
    }
  }

  resendCode(): void {
    if (this.isLoading) return;
    if (!this.isEmailValid) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.forgetPasswordService.resendCode({ email: this.email.trim() }).subscribe({
      next: () => {
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Resend code failed:', error);
        this.errorMessage = 'Failed to resend verification code';
        this.isLoading = false;
      },
    });
  }

  resetFlow(): void {
    this.step = 'email';
    this.emailTouched = false;
    this.verificationCode = ['', '', '', '', '', ''];
    this.password = '';
    this.confirmPassword = '';
    this.isLoading = false;
    this.errorMessage = '';
  }
}
