import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { catchError, map, Observable, of } from 'rxjs';
import { AccountReportService } from '../../services/account/account-report.service';
import { LoginService } from '../../services/auth/Login/login.service';

export const suspendedAccountGuard: CanActivateFn = (): boolean | UrlTree | Observable<boolean | UrlTree> => {
  const loginService = inject(LoginService);
  const accountReportService = inject(AccountReportService);
  const router = inject(Router);

  if (!loginService.isLoggedIn()) {
    return router.createUrlTree(['/auth/sign-in']);
  }

  return accountReportService.getAccountStatus().pipe(
    map((account) => {
      if (account.status === 'SUSPENDED') {
        return router.createUrlTree(['/account/suspended']);
      }

      return true;
    }),
    catchError(() => of(true)),
  );
};
