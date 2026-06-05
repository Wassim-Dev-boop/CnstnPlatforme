import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

const TOKEN_STORAGE_KEYS = ['backend_access_token', 'backend_refresh_token', 'auth_token', 'access_token'];
const AUTH_HEADER_TOKEN_KEYS = ['backend_access_token', 'auth_token', 'access_token'];
const USER_STORAGE_KEY = 'enterprise-auth-user';

interface JwtPayload {
  exp?: number;
}

function decodeJwtPayload(token: string): JwtPayload | null {
  const tokenParts = token.split('.');
  if (tokenParts.length < 2) {
    return null;
  }

  let payload = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/');
  const remainder = payload.length % 4;
  if (remainder === 2) {
    payload += '==';
  } else if (remainder === 3) {
    payload += '=';
  } else if (remainder === 1) {
    return null;
  }

  try {
    return JSON.parse(atob(payload)) as JwtPayload;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) {
    return false;
  }

  return Date.now() >= payload.exp * 1000;
}

function clearFrontendSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(USER_STORAGE_KEY);
  for (const key of AUTH_HEADER_TOKEN_KEYS) {
    window.localStorage.removeItem(key);
  }
}

function readBackendToken(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  for (const key of TOKEN_STORAGE_KEYS) {
    const token = window.localStorage.getItem(key)?.trim();
    if (token) {
      if (isTokenExpired(token)) {
        clearFrontendSession();
        return '';
      }

      return token;
    }
  }

  return '';
}

export const backendAuthInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.headers.has('Authorization')) {
    return next(request).pipe(
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          clearFrontendSession();
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            window.location.assign('/login');
          }
        }

        return throwError(() => error);
      }),
    );
  }

  const token = readBackendToken();
  const authenticatedRequest = token
    ? request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    })
    : request;

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse
        && error.status === 401
        && !request.url.includes('/api/v1/auth/login')
      ) {
        clearFrontendSession();
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.assign('/login');
        }
      }

      return throwError(() => error);
    }),
  );
};
