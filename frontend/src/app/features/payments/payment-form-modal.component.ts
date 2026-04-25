import { Component, computed, effect, inject, input, output } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CURRENCY_OPTIONS, STATUS_OPTIONS } from '../../core/constants/app.constants';
import { PaymentRecord, PaymentUpsertPayload } from '../../core/models/payment.models';

@Component({
  selector: 'app-payment-form-modal',
  imports: [ReactiveFormsModule, TitleCasePipe],
  templateUrl: './payment-form-modal.component.html',
  styleUrl: './payment-form-modal.component.css',
})
export class PaymentFormModalComponent {
  private readonly formBuilder = inject(FormBuilder);

  readonly open = input(false);
  readonly mode = input<'create' | 'edit'>('create');
  readonly payment = input<PaymentRecord | null>(null);
  readonly submitting = input(false);

  readonly cancelled = output<void>();
  readonly saved = output<PaymentUpsertPayload>();

  protected readonly currencyOptions = CURRENCY_OPTIONS;
  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly title = computed(() =>
    this.mode() === 'create' ? 'Create payment' : 'Edit payment',
  );

  protected readonly paymentForm = this.formBuilder.nonNullable.group({
    merchant: ['', [Validators.required]],
    paymentType: ['', [Validators.required]],
    amountMinor: [0, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]],
    currency: ['GBP', [Validators.required]],
    region: ['', [Validators.required]],
    status: ['succeeded', [Validators.required]],
    customerDetails: this.formBuilder.nonNullable.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      country: ['', [Validators.required]],
    }),
  });

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }

      const payment = this.payment();
      if (this.mode() === 'edit' && payment) {
        this.paymentForm.reset(
          {
            merchant: payment.merchant,
            paymentType: payment.payment_type,
            amountMinor: payment.amount_minor,
            currency: payment.currency,
            region: payment.region,
            status: payment.status,
            customerDetails: {
              name: payment.customer_details?.name ?? '',
              email: payment.customer_details?.email ?? '',
              country: payment.customer_details?.country ?? '',
            },
          },
          { emitEvent: false },
        );
      } else {
        this.paymentForm.reset(
          {
            merchant: '',
            paymentType: '',
            amountMinor: 0,
            currency: 'GBP',
            region: '',
            status: 'succeeded',
            customerDetails: {
              name: '',
              email: '',
              country: '',
            },
          },
          { emitEvent: false },
        );
      }
    });
  }

  protected submit(): void {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    const formValue = this.paymentForm.getRawValue();
    this.saved.emit({
      merchant: formValue.merchant,
      paymentType: formValue.paymentType,
      amountMinor: Number(formValue.amountMinor),
      currency: formValue.currency,
      region: formValue.region,
      status: formValue.status,
      customerDetails: formValue.customerDetails,
      providerAttempts: [...(this.payment()?.provider_attempts ?? [])],
    });
  }
}
