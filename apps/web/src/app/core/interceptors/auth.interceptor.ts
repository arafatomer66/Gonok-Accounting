import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { StorageService } from '../services/storage.service';
import { AuthApiService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const storage = inject(StorageService);
  const authApi = inject(AuthApiService);
  const router = inject(Router);

  // Skip auth for auth endpoints
  if (req.url.includes('/auth/')) {
    return next(req);
  }

  const token = storage.getAccessToken();
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        const refreshToken = storage.getRefreshToken();
        if (refreshToken) {
          return authApi.refreshToken(refreshToken).pipe(
            switchMap((tokens) => {
              storage.setTokens(tokens.access_token, tokens.refresh_token);
              const retryReq = req.clone({
                setHeaders: { Authorization: `Bearer ${tokens.access_token}` },
              });
              return next(retryReq);
            }),
            catchError(() => {
              storage.clearAll();
              router.navigate(['/login']);
              return throwError(() => error);
            }),
          );
        }
        storage.clearAll();
        router.navigate(['/login']);
      }
      return throwError(() => error);
    }),
  );
};
