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
        const is401 = err.status === 401;
        const isLoginCall = req.url.includes('/api/auth/login');

        if (is401 && !isLoginCall && auth.isLoggedIn()) {
          const userRol = auth.getRol(); // 'maestro', 'padre', 'alumno', 'admin'
          const urlLower = req.url.toLowerCase();

          // Solo cerrar sesión si la petición 401 coincide con la del portal del rol activo del usuario.
          // Si el usuario actual es "maestro" pero falló una llamada de "padre", no lo deslogueamos.
          let matchesUserRole = false;
          if (userRol === 'maestro' && urlLower.includes('/docente/')) matchesUserRole = true;
          if (userRol === 'padre' && urlLower.includes('/padre/')) matchesUserRole = true;
          if (userRol === 'alumno' && urlLower.includes('/alumno/')) matchesUserRole = true;
          if (userRol === 'admin' && urlLower.includes('/admin/')) matchesUserRole = true;

          if (matchesUserRole) {
            console.warn(`[AuthInterceptor] 401 recibido en ruta del rol '${userRol}' → cerrando sesión`);
            auth.logout();
            router.navigate(['/']);
            auth.openLogin();
          } else {
            console.info(`[AuthInterceptor] 401 en ruta externa a su rol (${userRol}) → omitiendo logout.`);
          }
        }
      }
      return throwError(() => err);
    })
  );
};
