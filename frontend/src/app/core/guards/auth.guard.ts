import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AppRole } from '../models';

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { redirectTo: state.url }
  });
};

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    const redirectTo = route.routeConfig?.path ? `/${route.routeConfig.path}` : '/dashboard';
    return router.createUrlTree(['/login'], {
      queryParams: { redirectTo }
    });
  }

  const requiredRoles = (route.data?.['roles'] as AppRole[] | undefined) ?? [];
  if (requiredRoles.length === 0) {
    const requiredPermissions = (route.data?.['permissions'] as string[] | undefined) ?? [];
    return authService.hasAllPermissions(requiredPermissions);
  }

  if (authService.canAccess(requiredRoles)) {
    const requiredPermissions = (route.data?.['permissions'] as string[] | undefined) ?? [];
    if (authService.hasAllPermissions(requiredPermissions)) {
      return true;
    }
  }

  // DENY access - show 403 instead of redirect to home
  // User should not be able to access this route
  console.error('Access denied - user does not have required roles', {
    required: requiredRoles,
    requiredPermissions: (route.data?.['permissions'] as string[] | undefined) ?? [],
    userRoles: authService.availableRoles
  });
  
  return false; // Deny access completely
};
