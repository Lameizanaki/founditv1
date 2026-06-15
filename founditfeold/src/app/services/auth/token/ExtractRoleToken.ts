import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ExtractRoleToken {
  public extractRoleFromJwt(token: string): string | null {
    try {
      const payload = this.decodeJwtPayload(token);
      if (!payload) return null;

      const directRole = payload.role;
      if (typeof directRole === 'string' && directRole.trim().length > 0) {
        return directRole;
      }

      const authorities = payload.authorities;
      if (Array.isArray(authorities)) {
        for (const entry of authorities) {
          if (typeof entry === 'string' && entry.startsWith('ROLE_')) {
            return entry;
          }

          if (
            entry &&
            typeof entry === 'object' &&
            'authority' in entry &&
            typeof (entry as { authority?: unknown }).authority === 'string' &&
            (entry as { authority: string }).authority.startsWith('ROLE_')
          ) {
            return (entry as { authority: string }).authority;
          }
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  public decodeJwtPayload(token: string): { role?: unknown; authorities?: unknown } | null {
    const parts = token.split('.');
    if (parts.length < 2) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

    const json = atob(padded);
    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') return null;

    return parsed as { role?: unknown; authorities?: unknown };
  }
}
