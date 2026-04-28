import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { AuthSession } from '../../core/models/auth.models';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { RegisterPageComponent } from './register-page.component';

class MockAuthService {
  readonly session = signal<AuthSession | null>(null);

  register = vi.fn().mockReturnValue(of({ message: 'registered' }));
}

@Component({
  standalone: true,
  template: '',
})
class DummyComponent {}

describe('RegisterPageComponent', () => {
  let fixture: ComponentFixture<RegisterPageComponent>;
  let authService: MockAuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterPageComponent],
      providers: [
        provideRouter([{ path: 'login', component: DummyComponent }]),
        { provide: AuthService, useClass: MockAuthService },
        { provide: NotificationService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterPageComponent);
    authService = TestBed.inject(AuthService) as unknown as MockAuthService;
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('renders a merchant-only role selector', () => {
    const select: HTMLSelectElement | null = fixture.nativeElement.querySelector('#register-role');

    expect(select).not.toBeNull();
    expect(select?.value).toBe('merchant');
    expect(select?.options.length).toBe(1);
  });

  it('submits merchant registration', () => {
    const component = fixture.componentInstance as any;
    component.registerForm.setValue({
      email: 'new@merchant.com',
      password: 'StrongPass1!',
      role: 'merchant',
    });

    component.submit();

    expect(authService.register).toHaveBeenCalledWith('new@merchant.com', 'StrongPass1!', 'merchant');
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/login'], {
      state: {
        email: 'new@merchant.com',
        password: 'StrongPass1!',
      },
    });
  });

  it('shows password checklist state', () => {
    const component = fixture.componentInstance as any;

    component.registerForm.controls.password.setValue('weak');
    fixture.detectChanges();

    expect(component.passwordChecks().some((check: any) => check.label === 'uppercase' && !check.valid)).toBe(true);

    component.registerForm.controls.password.setValue('StrongPass1!');
    fixture.detectChanges();

    expect(component.passwordChecks().every((check: any) => check.valid)).toBe(true);
  });

  it('keeps submit disabled for an invalid password', () => {
    const component = fixture.componentInstance as any;
    component.registerForm.setValue({
      email: 'new@merchant.com',
      password: 'weak',
      role: 'merchant',
    });
    fixture.detectChanges();

    const submitButton: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      'button[type="submit"]'
    );

    expect(submitButton?.disabled).toBe(true);
  });

  it('generates a valid strong password', () => {
    const component = fixture.componentInstance as any;

    component.generateStrongPassword();
    fixture.detectChanges();

    const password = component.registerForm.controls.password.value;

    expect(password.length).toBeGreaterThanOrEqual(12);
    expect(password.length).toBeLessThanOrEqual(16);
    expect(component.registerForm.controls.password.valid).toBe(true);
  });
});
