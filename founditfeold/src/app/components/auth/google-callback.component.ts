import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoginService } from '../../services/auth/Login/login.service';
import { ExtractRoleToken } from '../../services/auth/token/ExtractRoleToken';
import { LocalRoleService } from '../../services/auth/Role/local-role.service';

@Component({
  selector: 'app-google-callback',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'google-callback.component.html',
})
export class GoogleCallbackPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private loginService = inject(LoginService);
  private extractRoleFromJwt = inject(ExtractRoleToken);
  private localRoleService = inject(LocalRoleService);

  errorMessage = '';

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.errorMessage = 'Google sign-in failed. Please try again.';
      return;
    }

    this.loginService.setToken(token);

    // Extract email from JWT and save to localStorage if not already there
    const email = this.extractEmailFromJwt(token);
    if (email && !localStorage.getItem('pending_email')) {
      localStorage.setItem('pending_email', email);
    }

    let role = this.extractRoleFromJwt.extractRoleFromJwt(token);

    // If role is null from JWT, fallback to locally stored role or redirect to choose-role
    if (!role) {
      const localRole = this.localRoleService.getSelectedRole();
      if (localRole) {
        role = localRole;
        this.loginService.setRole(localRole);
      } else {
        // No role found anywhere - redirect to choose-role page for new user
        // pending_email should already be in localStorage from sign-up flow or extracted above
        this.router.navigateByUrl('/index', { replaceUrl: true });
        return;
      }
    } else {
      this.loginService.setRole(role);
    }

    const normalizedRole = role.trim().toUpperCase();
    if (normalizedRole.includes('ADMIN')) {
      this.router.navigateByUrl('/admin', { replaceUrl: true });
      return;
    }

    if (normalizedRole.includes('FREELANCER')) {
      this.router.navigateByUrl('/freelancer', { replaceUrl: true });
      return;
    }

    if (normalizedRole.includes('CLIENT')) {
      this.router.navigateByUrl('/client', { replaceUrl: true });
      return;
    }

    this.router.navigateByUrl('/', { replaceUrl: true });
  }

  private extractEmailFromJwt(token: string): string | null {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;

      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const json = atob(padded);
      const payload = JSON.parse(json);

      return payload.email || payload.sub || null;
    } catch {
      return null;
    }
  }
}
