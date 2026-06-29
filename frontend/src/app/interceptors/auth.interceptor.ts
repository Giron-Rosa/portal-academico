import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Interceptor funcional de Angular 17+ que adjunta automáticamente
 * el token JWT en el header Authorization para cada petición dirigida
 * al backend (:8080/api/**).  No modifica peticiones a otros orígenes.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth  = inject(AuthService);
  const token = auth.getToken();

  // Solo inyectar en rutas del backend; dejar pasar el resto sin tocar
  const isApiCall = req.url.includes('/api/') || req.url.includes(':8080');

  if (token && isApiCall) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(authReq);
  }

  return next(req);
};
