import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SESSION_STORAGE_KEY } from '../constants/app.constants';
import { AuthSession } from '../models/auth.models';
import { SessionStorageService } from '../services/session-storage.service';

export const roleHeaderInterceptor: HttpInterceptorFn = (request, next) => {
  const sessionStorage = inject(SessionStorageService);
  const session = sessionStorage.get<AuthSession>(SESSION_STORAGE_KEY);

  if (!session?.role) {
    return next(request);
  }

  const headers: Record<string, string> = {
    Role: session.role
  };

  if (session.token) {
    headers['Authorization'] = `Bearer ${session.token}`;
  }

  return next(
    request.clone({
      setHeaders: headers
    })
  );
};
