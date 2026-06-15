import { Injectable } from '@angular/core';
import { RoleEnum } from '../../../Enum/RoleEnum/RoleEnum';

/**
 * LocalRoleService manages locally stored role selection.
 * This serves as a fallback when JWT role extraction fails.
 */
@Injectable({
  providedIn: 'root',
})
export class LocalRoleService {
  private readonly SELECTED_ROLE_KEY = 'selected_role';

  /**
   * Save the user's selected role to localStorage
   */
  saveSelectedRole(role: RoleEnum): void {
    localStorage.setItem(this.SELECTED_ROLE_KEY, role);
  }

  /**
   * Get the locally stored selected role
   */
  getSelectedRole(): RoleEnum | null {
    const role = localStorage.getItem(this.SELECTED_ROLE_KEY);
    if (role && Object.values(RoleEnum).includes(role as RoleEnum)) {
      return role as RoleEnum;
    }
    return null;
  }

  /**
   * Clear the locally stored selected role
   */
  clearSelectedRole(): void {
    localStorage.removeItem(this.SELECTED_ROLE_KEY);
  }

  /**
   * Check if a valid role is stored locally
   */
  hasValidRole(): boolean {
    return this.getSelectedRole() !== null;
  }
}
