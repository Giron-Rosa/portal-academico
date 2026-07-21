import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isLoggedIn()) {
      auth.openLogin();
      return router.createUrlTree(['/']);
    }

    const userRole = auth.getRol();
    if (allowedRoles.includes(userRole || '')) {
      return true;
    }

    // Redirect to their respective portal if they have a different role
    return router.createUrlTree([auth.getPortalRoute()]);
  };
};
