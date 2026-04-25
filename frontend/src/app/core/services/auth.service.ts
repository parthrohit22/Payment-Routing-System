import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { map, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { API_ROOT, SESSION_STORAGE_KEY } from '../constants/app.constants';
import { ApiResponse } from '../models/api.models';
import { AuthSession, UserRole } from '../models/auth.models';
import { SessionStorageService } from './session-storage.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly sessionStorage = inject(SessionStorageService);

  private readonly sessionState = signal<AuthSession | null>(
    this.sessionStorage.get<AuthSession>(SESSION_STORAGE_KEY)
  );

  readonly session = this.sessionState.asReadonly();
  readonly isAuthenticated = computed(() => this.sessionState() !== null);
  readonly role = computed(() => this.sessionState()?.role ?? null);
  readonly email = computed(() => this.sessionState()?.email ?? null);
  readonly token = computed(() => this.sessionState()?.token ?? null);

  login(email: string, password: string): Observable<AuthSession> {
    const formData = new FormData();
    formData.append('email', email.trim());
    formData.append('password', password);

    return this.http
      .post<ApiResponse<AuthSession>>(`${API_ROOT}/auth/login`, formData)
      .pipe(
        map((response) => response.data as AuthSession),
        tap((session) => {
          this.sessionState.set(session);
          this.sessionStorage.set(SESSION_STORAGE_KEY, session);
        })
      );
  }

  register(
    email: string,
    password: string,
    role: UserRole = 'merchant'
  ): Observable<ApiResponse<unknown>> {
    const formData = new FormData();
    formData.append('email', email.trim());
    formData.append('password', password);
    formData.append('role', role);

    return this.http.post<ApiResponse<unknown>>(`${API_ROOT}/auth/register`, formData);
  }

  logout(): void {
    this.sessionState.set(null);
    this.sessionStorage.remove(SESSION_STORAGE_KEY);
    void this.router.navigate(['/login']);
  }

  hasAnyRole(roles: UserRole[]): boolean {
    const currentSession = this.sessionState();
    return !!currentSession && roles.includes(currentSession.role);
  }

  landingRouteForRole(role: UserRole): string {
    return role === 'merchant' ? '/payments' : '/dashboard';
  }
}
