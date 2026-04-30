import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { AuthSession } from '../../../core/models/auth.models';
import { AuthService } from '../../../core/services/auth.service';
import { HealthService } from '../../../core/services/health.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AppShellComponent } from './app-shell.component';

describe('AppShellComponent', () => {
  let fixture: ComponentFixture<AppShellComponent>;
  let authService: {
    session: ReturnType<typeof signal<AuthSession | null>>;
    role: ReturnType<typeof signal<'admin' | 'merchant' | 'finance'>>;
    deleteAccount: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    authService = {
      session: signal<AuthSession | null>({
        email: 'merchant@test.com',
        role: 'merchant',
        token: 'jwt-token',
      }),
      role: signal<'admin' | 'merchant' | 'finance'>('merchant'),
      deleteAccount: vi.fn().mockReturnValue(of({ message: 'Account deleted' })),
      logout: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        { provide: HealthService, useValue: { checkHealth: vi.fn().mockReturnValue(of(true)) } },
        { provide: NotificationService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('confirms account deletion before logging out', () => {
    const deleteButton = buttonWithText('Delete Account');
    expect(deleteButton).toBeTruthy();

    deleteButton?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Delete account');

    const confirmButton = buttonWithText('Delete account');
    confirmButton?.click();
    fixture.detectChanges();

    expect(authService.deleteAccount).toHaveBeenCalled();
    expect(authService.logout).toHaveBeenCalled();
  });

  it('hides account deletion for admin users', () => {
    authService.role.set('admin');
    fixture.detectChanges();

    expect(buttonWithText('Delete Account')).toBeUndefined();
  });

  it('hides account deletion for finance users', () => {
    authService.role.set('finance');
    fixture.detectChanges();

    expect(buttonWithText('Delete Account')).toBeUndefined();
  });

  function buttonWithText(text: string): HTMLButtonElement | undefined {
    return Array.from(fixture.nativeElement.querySelectorAll('button')).find((button: any) =>
      button.textContent.includes(text)
    ) as HTMLButtonElement | undefined;
  }
});
