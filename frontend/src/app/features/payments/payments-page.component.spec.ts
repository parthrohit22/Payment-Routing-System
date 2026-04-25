import { convertToParamMap, ActivatedRoute, Router } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { AuthService } from '../../core/services/auth.service';
import { AnalyticsService } from '../../core/services/analytics.service';
import { NotificationService } from '../../core/services/notification.service';
import { PaymentsService } from '../../core/services/payments.service';
import { PaymentsPageComponent } from './payments-page.component';

const mockPayments = Array.from({ length: 7 }, (_, index) => ({
  _id: `${index + 1}`,
  merchant: index === 1 ? 'Spotify' : `Merchant ${index + 1}`,
  payment_type: index % 2 === 0 ? 'card_payment' : 'subscription',
  amount_minor: 1000 + index * 100,
  currency: index % 2 === 0 ? 'GBP' : 'EUR',
  region: index % 2 === 0 ? 'UK' : 'EU',
  initiated_at: `2026-01-0${(index % 7) + 1}T10:00:00`,
  status: index % 3 === 0 ? 'succeeded' : index % 3 === 1 ? 'pending' : 'failed',
  customer_details: {
    name: `Customer ${index + 1}`,
    email: `customer${index + 1}@test.com`,
    country: 'UK',
  },
  provider_attempts: [],
}));

describe('PaymentsPageComponent', () => {
  let fixture: ComponentFixture<PaymentsPageComponent>;
  let component: PaymentsPageComponent;
  let queryParams$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let authService: { role: ReturnType<typeof signal> };
  let paymentsService: {
    fetchAllPayments: ReturnType<typeof vi.fn>;
    fetchPaymentsByStatus: ReturnType<typeof vi.fn>;
    createPayment: ReturnType<typeof vi.fn>;
    updatePayment: ReturnType<typeof vi.fn>;
    deletePayment: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    queryParams$ = new BehaviorSubject(
      convertToParamMap({
        page: 1,
        pageSize: 6,
        status: 'all',
        currency: 'all',
        region: 'all',
        paymentType: 'all',
        sort: 'date-desc',
      }),
    );

    router = {
      navigate: vi.fn().mockResolvedValue(true),
    };

    authService = {
      role: signal<'admin' | 'merchant' | 'finance'>('admin'),
    };

    paymentsService = {
      fetchAllPayments: vi.fn().mockReturnValue(of(mockPayments)),
      fetchPaymentsByStatus: vi
        .fn()
        .mockImplementation((status: string) =>
          of(mockPayments.filter((payment) => payment.status === status)),
        ),
      createPayment: vi.fn().mockReturnValue(of({ message: 'created' })),
      updatePayment: vi.fn().mockReturnValue(of({ message: 'updated' })),
      deletePayment: vi.fn().mockReturnValue(of({ message: 'deleted' })),
    };

    await TestBed.configureTestingModule({
      imports: [PaymentsPageComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { queryParamMap: queryParams$.asObservable() } },
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: authService },
        { provide: AnalyticsService, useValue: { refreshAfterMutation: vi.fn() } },
        { provide: PaymentsService, useValue: paymentsService },
        { provide: NotificationService, useValue: { success: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('filters the workspace when the query params change', async () => {
    queryParams$.next(
      convertToParamMap({
        page: 1,
        pageSize: 6,
        status: 'all',
        currency: 'all',
        region: 'all',
        paymentType: 'all',
        sort: 'date-desc',
        q: 'spotify',
      }),
    );

    fixture.detectChanges();
    await fixture.whenStable();

    expect((component as any).filteredPayments().length).toBe(1);
    expect((component as any).filteredPayments()[0].merchant).toBe('Spotify');
  });

  it('shows add payment controls only for editable roles', () => {
    expect(fixture.nativeElement.textContent).toContain('Add payment');
    expect(fixture.nativeElement.textContent).toContain('Delete payment');

    authService.role.set('finance');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Add payment');
    expect(fixture.nativeElement.textContent).not.toContain('Delete payment');
  });

  it('updates query params when pagination changes', () => {
    (component as any).goToPage(2);

    expect(router.navigate).toHaveBeenCalled();
  });
});
