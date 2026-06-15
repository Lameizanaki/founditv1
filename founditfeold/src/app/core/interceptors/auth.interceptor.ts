import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { LoginService } from '../../services/auth/Login/login.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const loginService = inject(LoginService);
  const token = loginService.getToken();

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(req);
};
