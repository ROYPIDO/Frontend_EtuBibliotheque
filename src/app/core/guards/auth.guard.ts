import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../service/auth.service';

// Guard fonctionnel : Angular l'appelle avant d'activer une route.
// - true  : la navigation continue
// - UrlTree : Angular annule la navigation et redirige vers cette URL
// Attention : ce guard protège la navigation, pas les données (c'est le back-end qui vérifie le JWT).
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isLoggedIn() ? true : router.createUrlTree(['/login']);
};
