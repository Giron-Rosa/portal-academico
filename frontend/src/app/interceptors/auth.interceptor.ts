import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

/**
 * Interceptor funcional de Angular 17+.
 * - Adjunta "Authorization: Bearer <token>" en cada petición que contenga "/api/".
 * - Solo destruye la sesión y redirige al login si el servidor responde con 401
 *   Y el header WWW-Authenticate indica que es un fallo de token (no un 401 de
 *   negocio).  Errores 500 de servidor NO deben causar cierre de sesión.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  const token  = auth.getToken();

  // Aplica a cualquier URL que contenga /api/ (absoluta o relativa, mayúsculas o minúsculas)
  const isApiCall = req.url.toLowerCase().includes('/api/');

  // Clonar la petición agregando el header, solo si hay token y es una llamada a la API
  const authReq = (token && isApiCall)
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        // Solo cerrar sesión en 401 auténticos (token inválido/expirado),
        // nunca en 403 (permisos), 404 (no encontrado) ni 500 (error del servidor).
        const is401 = err.status === 401;
        // Excluir el endpoint de login para evitar bucle al meter credenciales incorrectas
        const isLoginCall = req.url.includes('/api/auth/login');

        if (is401 && !isLoginCall && auth.isLoggedIn()) {
          console.warn('[AuthInterceptor] 401 recibido con sesión activa → cerrando sesión');
          auth.logout();
          router.navigate(['/']);
          auth.openLogin();
        }
      }
      return throwError(() => err);
    })
  );
};
