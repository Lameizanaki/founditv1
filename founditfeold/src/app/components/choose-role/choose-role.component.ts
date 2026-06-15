import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  BriefcaseBusiness,
  Check,
  CodeXml,
  LUCIDE_ICONS,
  LucideAngularModule,
  LucideIconProvider,
  Sparkles,
} from 'lucide-angular';
import { Router } from '@angular/router';
import { RoleEnum } from '../../Enum/RoleEnum/RoleEnum';
import { ChooseRoleService } from '../../services/auth/Role/choose-role.service';
import { LocalRoleService } from '../../services/auth/Role/local-role.service';

@Component({
  selector: 'app-choose-role-component',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  providers: [
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({}),
    },
  ],
  templateUrl: 'choose-role.component.html',
})
export class ChooseRoleComponent {
  private chooseRoleService = inject(ChooseRoleService);
  private localRoleService = inject(LocalRoleService);
  private router = inject(Router);

  readonly RoleEnum = RoleEnum;

  readonly icons = {
    Sparkles,
    BriefcaseBusiness,
    CodeXml,
    Check,
  };

  selectedRole: RoleEnum | null = null;

  selectRole(role: RoleEnum): void {
    this.selectedRole = role;
  }

  continueSetup(): void {
    if (!this.selectedRole) return;

    const email = localStorage.getItem('pending_email'); // saved after register

    if (!email) {
      this.router.navigateByUrl('/auth/sign-in', { replaceUrl: true });
      return;
    }

    // Save selected role to localStorage as a local fallback
    this.localRoleService.saveSelectedRole(this.selectedRole);

    this.chooseRoleService
      .chooseRole({
        email,
        role: this.selectedRole,
      })
      .subscribe({
        next: () => {
          localStorage.removeItem('pending_email');

          this.router.navigate(['/auth/sign-in'], {
            replaceUrl: true,
            queryParams: {
              email,
            },
          });
        },
        error: (err) => {
          console.error('Role update failed:', err);
        },
      });
  }
}
