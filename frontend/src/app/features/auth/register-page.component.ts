import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register-page.component.html',
  styleUrl: './register-page.component.css',
})
export class RegisterPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal('');
  private readonly passwordValue = signal('');

  protected readonly registerForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, strongPasswordValidator()]],
    role: ['merchant' as const, [Validators.required]],
  });

  protected readonly passwordChecks = computed(() => {
    const password = this.passwordValue();

    return [
      {
        label: 'minimum 8 characters',
        valid: password.length >= 8,
      },
      {
        label: 'uppercase',
        valid: /[A-Z]/.test(password),
      },
      {
        label: 'lowercase',
        valid: /[a-z]/.test(password),
      },
      {
        label: 'number',
        valid: /\d/.test(password),
      },
      {
        label: 'special character',
        valid: /[^A-Za-z0-9]/.test(password),
      },
    ];
  });

  constructor() {
    this.registerForm.controls.password.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((password) => this.passwordValue.set(password));
  }

  protected generateStrongPassword(): void {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercase = 'abcdefghijkmnopqrstuvwxyz';
    const numbers = '23456789';
    const symbols = '!@#$%^&*?';
    const allCharacters = uppercase + lowercase + numbers + symbols;
    const length = 12 + Math.floor(Math.random() * 5);
    const requiredCharacters = [
      randomCharacter(uppercase),
      randomCharacter(lowercase),
      randomCharacter(numbers),
      randomCharacter(symbols),
    ];

    while (requiredCharacters.length < length) {
      requiredCharacters.push(randomCharacter(allCharacters));
    }

    const password = shuffleCharacters(requiredCharacters).join('');
    this.registerForm.controls.password.setValue(password);
    this.registerForm.controls.password.markAsTouched();
    this.registerForm.controls.password.updateValueAndValidity();
  }

  protected submit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const { email, password, role } = this.registerForm.getRawValue();

    this.errorMessage.set('');
    this.isSubmitting.set(true);

    this.authService
      .register(email, password, role)
      .pipe(
        finalize(() => this.isSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Account created. Sign in to continue.');
          void this.router.navigate(['/login'], {
            state: {
              email,
              password,
            },
          });
        },
        error: (error) => {
          const message = error.error?.message ?? 'Unable to create account.';
          this.errorMessage.set(message);
          this.notificationService.error(message);
        },
      });
  }
}

function strongPasswordValidator(): ValidatorFn {
  return (control: AbstractControl<string>): ValidationErrors | null => {
    const password = control.value ?? '';
    const errors: ValidationErrors = {};

    if (password.length < 8) {
      errors['minLength'] = true;
    }

    if (!/[A-Z]/.test(password)) {
      errors['uppercase'] = true;
    }

    if (!/[a-z]/.test(password)) {
      errors['lowercase'] = true;
    }

    if (!/\d/.test(password)) {
      errors['number'] = true;
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      errors['special'] = true;
    }

    return Object.keys(errors).length ? { strongPassword: errors } : null;
  };
}

function randomCharacter(characters: string): string {
  return characters[Math.floor(Math.random() * characters.length)];
}

function shuffleCharacters(characters: string[]): string[] {
  return [...characters].sort(() => Math.random() - 0.5);
}
