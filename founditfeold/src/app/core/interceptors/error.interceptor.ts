import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { MaintenanceStateService } from '../../services/admin/maintenance-state.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const maintenanceState = inject(MaintenanceStateService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      console.error('[HTTP Error]', {
        status: error.status,
        statusText: error.statusText,
        url: error.url,
        message: error.message,
      });

      if (error.status === 503 && error.error?.status === 'MAINTENANCE') {
        maintenanceState.show(
          error.error.message ||
            'Found It is temporarily unavailable while maintenance is in progress.',
        );
        if (!router.url.startsWith('/maintenance')) {
          void router.navigate(['/maintenance']);
        }
      }

      if (error.status === 423 && error.error?.status === 'SUSPENDED') {
        if (!router.url.startsWith('/account/suspended')) {
          void router.navigate(['/account/suspended']);
        }
      }

      // Re-throw the error so component error handlers can still catch it
      return throwError(() => error);
    }),
  );
};
