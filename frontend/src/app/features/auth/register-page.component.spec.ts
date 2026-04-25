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
      password: 'pass123',
      role: 'merchant',
    });

    component.submit();

    expect(authService.register).toHaveBeenCalledWith('new@merchant.com', 'pass123', 'merchant');
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/login']);
  });
});
