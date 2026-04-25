import { Component, computed, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { CURRENCY_OPTIONS } from '../../core/constants/app.constants';
import { PaymentRecord, PaymentUpsertPayload } from '../../core/models/payment.models';

@Component({
  selector: 'app-payment-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './payment-form-modal.component.html',
  styleUrl: './payment-form-modal.component.css',
})
export class PaymentFormModalComponent {
  private readonly fb = inject(FormBuilder);

  readonly open = input(false);
  readonly mode = input<'create' | 'edit'>('create');
  readonly payment = input<PaymentRecord | null>(null);
  readonly submitting = input(false);

  readonly cancelled = output<void>();
  readonly saved = output<PaymentUpsertPayload>();

  protected readonly currencyOptions = CURRENCY_OPTIONS;

  protected readonly title = computed(() =>
    this.mode() === 'create' ? 'Create payment' : 'Edit payment'
  );

  protected readonly paymentForm = this.fb.nonNullable.group({
    merchant: ['', Validators.required],
    paymentType: ['', Validators.required],
    amountMinor: [0, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]],
    currency: ['GBP', Validators.required],
    region: ['', Validators.required],
    customerDetails: this.fb.nonNullable.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      country: ['', Validators.required],
    }),
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;

      const payment = this.payment();

      if (this.mode() === 'edit' && payment) {
        this.paymentForm.reset(
          {
            merchant: payment.merchant,
            paymentType: payment.payment_type,
            amountMinor: payment.amount_minor,
            currency: payment.currency,
            region: payment.region,
            customerDetails: {
              name: payment.customer_details.name,
              email: payment.customer_details.email,
              country: payment.customer_details.country,
            },
          },
          { emitEvent: false }
        );

        return;
      }

      this.paymentForm.reset(
        {
          merchant: '',
          paymentType: '',
          amountMinor: 0,
          currency: 'GBP',
          region: '',
          customerDetails: {
            name: '',
            email: '',
            country: '',
          },
        },
        { emitEvent: false }
      );
    });
  }

  protected submit(): void {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    const value = this.paymentForm.getRawValue();
    const existingPayment = this.payment();

    this.saved.emit({
      merchant: value.merchant.trim(),
      paymentType: value.paymentType.trim(),
      amountMinor: Number(value.amountMinor),
      currency: value.currency,
      region: value.region.trim(),
      status: this.mode() === 'edit' ? existingPayment?.status ?? 'pending' : 'pending',
      customerDetails: {
        name: value.customerDetails.name.trim(),
        email: value.customerDetails.email.trim(),
        country: value.customerDetails.country.trim(),
      },
      providerAttempts:
        this.mode() === 'edit'
          ? [...(existingPayment?.provider_attempts ?? [])]
          : [],
    });
  }
}