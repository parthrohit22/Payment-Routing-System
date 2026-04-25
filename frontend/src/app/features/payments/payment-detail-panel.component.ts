import { Component, inject, input, output } from '@angular/core';
import { CurrencyPipe, DatePipe, NgIf, TitleCasePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PaymentRecord, ProviderAttempt } from '../../core/models/payment.models';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-payment-detail-panel',
  imports: [CurrencyPipe, DatePipe, NgIf, ReactiveFormsModule, TitleCasePipe, EmptyStateComponent],
  templateUrl: './payment-detail-panel.component.html',
  styleUrl: './payment-detail-panel.component.css',
})
export class PaymentDetailPanelComponent {
  private readonly formBuilder = inject(FormBuilder);

  readonly payment = input<PaymentRecord | null>(null);
  readonly canEdit = input(false);
  readonly canDelete = input(false);
  readonly canAddAttempt = input(false);

  readonly closed = output<void>();
  readonly edited = output<void>();
  readonly deleted = output<void>();
  readonly providerAttemptAdded = output<ProviderAttempt>();

  protected readonly providerOptions = ['Stripe', 'PayPal', 'Adyen'];
  protected readonly resultOptions = ['success', 'failure'];
  protected isAttemptModalOpen = false;
  protected readonly attemptForm = this.formBuilder.nonNullable.group({
    provider: ['Stripe', [Validators.required]],
    result: ['success', [Validators.required]],
    latency_ms: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
  });

  protected openAttemptModal(): void {
    this.attemptForm.reset({
      provider: 'Stripe',
      result: 'success',
      latency_ms: 0,
    });
    this.isAttemptModalOpen = true;
  }

  protected closeAttemptModal(): void {
    this.isAttemptModalOpen = false;
  }

  protected submitAttempt(): void {
    if (this.attemptForm.invalid) {
      this.attemptForm.markAllAsTouched();
      return;
    }

    const formValue = this.attemptForm.getRawValue();
    this.providerAttemptAdded.emit({
      provider: formValue.provider,
      result: formValue.result,
      latency_ms: Number(formValue.latency_ms),
    });
    this.closeAttemptModal();
  }
}
