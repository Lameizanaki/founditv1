import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { LoginService } from '../../services/auth/Login/login.service';

export const adminGuard: CanActivateFn = (): boolean | UrlTree => {
  const loginService = inject(LoginService);
  const router = inject(Router);

  const token = loginService.getToken();
  if (!token) {
    return router.createUrlTree(['/admin/login']);
  }

  const role = loginService.getRoleFromToken(token) || loginService.getRole();
  if (role?.toUpperCase().includes('ADMIN')) {
    return true;
  }

  return router.createUrlTree(['/admin/login'], {
    queryParams: { denied: 'true' },
  });
};
