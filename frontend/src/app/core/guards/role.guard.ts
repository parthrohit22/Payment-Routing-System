import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const allowedRoles = (route.data?.['roles'] || []) as string[];
  const userRole = auth.role();

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  if (!userRole) {
    return router.createUrlTree(['/unauthorized']);
  }

  const isAllowed = allowedRoles
    .map(r => r.toLowerCase())
    .includes(userRole.toLowerCase());

  if (!isAllowed) {
    return router.createUrlTree(['/unauthorized']);
  }

  return true;
};