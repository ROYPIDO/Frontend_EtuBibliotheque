import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../service/auth.service';

// Endpoints publics : ni token, ni traitement global du 401
// (un 401 sur /api/login signifie "identifiants incorrects", géré par le LoginComponent).
const PUBLIC_URLS = ['/api/login', '/api/register'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const path = req.url.split('?')[0];
  const isProtectedApi = path.startsWith('/api/') && !PUBLIC_URLS.includes(path);

  if (!isProtectedApi) {
    return next(req);
  }

  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  // Une requête est immuable : on la clone pour y ajouter le header.
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        authService.logout();
        router.navigate(['/login']);
      }
      // On relaie l'erreur pour que l'appelant puisse aussi la traiter.
      return throwError(() => error);
    })
  );
};
