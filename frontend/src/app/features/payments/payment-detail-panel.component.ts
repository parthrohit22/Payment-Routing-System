import { Component, inject, input, output } from '@angular/core';
import { CurrencyPipe, DatePipe, NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { PaymentRecord, ProviderAttempt } from '../../core/models/payment.models';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-payment-detail-panel',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    NgIf,
    ReactiveFormsModule,
    EmptyStateComponent
  ],
  templateUrl: './payment-detail-panel.component.html',
  styleUrl: './payment-detail-panel.component.css',
})
export class PaymentDetailPanelComponent {
  private fb = inject(FormBuilder);

  payment = input<PaymentRecord | null>(null);
  canEdit = input(false);
  canDelete = input(false);
  canAddAttempt = input(false);
  canChangeStatus = input(false);

  closed = output<void>();
  edited = output<void>();
  deleted = output<void>();
  providerAttemptAdded = output<ProviderAttempt>();
  statusChanged = output<string>();

  providerOptions = ['Stripe', 'PayPal', 'Adyen'];
  resultOptions = ['success', 'failure'];

  isAttemptModalOpen = false;

  attemptForm = this.fb.nonNullable.group({
    provider: ['Stripe', Validators.required],
    result: ['success', Validators.required],
    latency_ms: [0, [Validators.required, Validators.min(0)]],
  });

  formatStatus(status: string): string {
    return {
      success: 'Succeeded',
      pending: 'Pending',
      failed: 'Failed',
    }[status] ?? status;
  }

  statusClass(status: string): string {
    if (status === 'success') return 'status-pill status-pill--success';
    if (status === 'failed') return 'status-pill status-pill--danger';
    return 'status-pill status-pill--warning';
  }

  // 🔥 FIXED: latency helpers (missing before)
  getLatencyClass(latency: number): string {
    if (latency > 300) return 'latency-critical';
    if (latency > 200) return 'latency-warning';
    return 'latency-good';
  }

  getLatencyLabel(latency: number): string {
    if (latency > 300) return 'Critical';
    if (latency > 200) return 'Slow';
    return 'OK';
  }

  canApproveOrReject(): boolean {
    return this.canChangeStatus();
  }

  openAttemptModal(): void {
    this.attemptForm.reset({
      provider: 'Stripe',
      result: 'success',
      latency_ms: 0,
    });

    this.isAttemptModalOpen = true;
  }

  closeAttemptModal(): void {
    this.isAttemptModalOpen = false;
  }

  submitAttempt(): void {
    if (this.attemptForm.invalid) {
      this.attemptForm.markAllAsTouched();
      return;
    }

    const v = this.attemptForm.getRawValue();

    this.providerAttemptAdded.emit({
      provider: v.provider,
      result: v.result,
      latency_ms: Number(v.latency_ms),
    });

    this.closeAttemptModal();
  }

  approve(): void {
    this.statusChanged.emit('success');
  }

  reject(): void {
    this.statusChanged.emit('failed');
  }
}
