import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthSession } from '../../core/models/auth.models';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { LoginPageComponent } from './login-page.component';

class MockAuthService {
  readonly session = signal<AuthSession | null>(null);

  login = vi.fn().mockReturnValue(
    of({
      email: 'parth@payments.com',
      role: 'admin',
      token: 'jwt-token',
    }),
  );

  landingRouteForRole = vi.fn().mockReturnValue('/dashboard');
}

describe('LoginPageComponent', () => {
  let fixture: ComponentFixture<LoginPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useClass: MockAuthService },
        { provide: NotificationService, useValue: { success: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('renders the internal access card', () => {
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Payment Routing System');
    expect(text).toContain('Secure access to the routing workspace');
    expect(text).toContain('Register');
  });

  it('does not render visible demo usernames or passwords', () => {
    const text = fixture.nativeElement.textContent;

    expect(text).not.toContain('admin123');
    expect(text).not.toContain('finance123');
    expect(text).not.toContain('pass123');
    expect(text).not.toContain('parth@payments.com');
    expect(text).not.toContain('montu@payments.com');
    expect(text).not.toContain('arjun@payments.com');
  });

  it('does not render marketing showcase content', () => {
    const text = fixture.nativeElement.textContent;

    expect(fixture.nativeElement.querySelector('.auth-showcase')).toBeNull();
    expect(text).not.toContain('by PARTH ROHIT');
    expect(text).not.toContain('JWT-secured access');
  });
});
