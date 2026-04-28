import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { SESSION_STORAGE_KEY } from '../constants/app.constants';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpController: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [AuthService, provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(AuthService);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpController.verify();
    sessionStorage.clear();
  });

  it('stores the session after a successful login', () => {
    let storedRole = '';

    service.login('admin@test.com', 'secret').subscribe((session) => {
      storedRole = session.role;
    });

    const request = httpController.expectOne('/api/auth/login');
    expect(request.request.method).toBe('POST');
    expect((request.request.body as FormData).get('email')).toBe('admin@test.com');
    expect((request.request.body as FormData).get('password')).toBe('secret');

    request.flush({
      data: {
        email: 'admin@test.com',
        role: 'admin',
        token: 'jwt-token'
      }
    });

    expect(storedRole).toBe('admin');
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toContain('jwt-token');
  });

  it('always sends merchant as the registration role', () => {
    service.register('new@merchant.com', 'StrongPass1!').subscribe();

    const request = httpController.expectOne('/api/auth/register');
    expect(request.request.method).toBe('POST');
    expect((request.request.body as FormData).get('role')).toBe('merchant');

    request.flush({ message: 'User registered successfully' });
  });

  it('deletes the current account', () => {
    service.deleteAccount().subscribe();

    const request = httpController.expectOne('/api/me');
    expect(request.request.method).toBe('DELETE');

    request.flush({ message: 'Account deleted' });
  });

  it('does not store a session when login fails', () => {
    let capturedError: string | undefined;

    service.login('admin@test.com', 'wrong').subscribe({
      error: (error) => {
        capturedError = error.error?.message;
      }
    });

    const request = httpController.expectOne('/api/auth/login');
    request.flush(
      { message: 'Invalid credentials' },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(capturedError).toBe('Invalid credentials');
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it('clears the session on logout', () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    service.login('admin@test.com', 'secret').subscribe();
    httpController.expectOne('/api/auth/login').flush({
      data: {
        email: 'admin@test.com',
        role: 'admin',
        token: 'jwt-token'
      }
    });

    service.logout();

    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
