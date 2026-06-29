import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

/**
 * Interceptor funcional de Angular 17+ que adjunta automáticamente
 * el token JWT en el header Authorization para cada petición dirigida
 * al backend que contenga /api/.
 * Si recibe un error 401 (Unauthorized), limpia la sesión y abre el modal de login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth  = inject(AuthService);
  const router = inject(Router);
  const token = auth.getToken();

  // Detecta cualquier URL que contenga /api/ (ya sea absoluta o relativa)
  const isApiCall = req.url.toLowerCase().includes('/api/');

  let authReq = req;
  if (token && isApiCall) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((err: any) => {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        // Excluir el propio endpoint de login para evitar bucles infinitos en credenciales incorrectas
        if (!req.url.includes('/api/auth/login')) {
          auth.logout();
          router.navigate(['/']);
          auth.openLogin();
        }
      }
      return throwError(() => err);
    })
  );
};
