import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { AuthSession, UserRole } from '../models/auth.models';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';
import { roleGuard } from './role.guard';

class MockAuthService {
  readonly session = signal<AuthSession | null>(null);
  readonly isAuthenticated = computed(() => this.session() !== null);
  readonly role = computed(() => this.session()?.role ?? null);

  hasAnyRole(roles: UserRole[]): boolean {
    const activeSession = this.session();
    return !!activeSession && roles.includes(activeSession.role);
  }
}

describe('route guards', () => {
  let authService: MockAuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useClass: MockAuthService }]
    });

    authService = TestBed.inject(AuthService) as unknown as MockAuthService;
  });

  it('authGuard redirects signed-out users to login', () => {
    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
    expect((result as UrlTree).toString()).toBe('/login');
  });

  it('roleGuard allows valid roles through', () => {
    authService.session.set({
      email: 'parth@payments.com',
      role: 'admin',
      token: 'jwt-token'
    });

    const result = TestBed.runInInjectionContext(() =>
      roleGuard({ data: { roles: ['admin'] } } as never, {} as never)
    );

    expect(result).toBe(true);
  });

  it('roleGuard redirects invalid roles to unauthorized', () => {
    authService.session.set({
      email: 'arjun@payments.com',
      role: 'merchant',
      token: 'jwt-token'
    });

    const result = TestBed.runInInjectionContext(() =>
      roleGuard({ data: { roles: ['admin', 'finance'] } } as never, {} as never)
    );

    expect((result as UrlTree).toString()).toBe('/unauthorized');
  });
});
