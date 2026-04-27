import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PaymentsService } from './payments.service';
import { AuthService } from './auth.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let httpController: HttpTestingController;
  let authService: {
    role: ReturnType<typeof vi.fn>;
    email: ReturnType<typeof vi.fn>;
    token: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    authService = {
      role: vi.fn().mockReturnValue('admin'),
      email: vi.fn().mockReturnValue('admin@test.com'),
      token: vi.fn().mockReturnValue('admin-token'),
    };

    TestBed.configureTestingModule({
      providers: [
        PaymentsService,
        { provide: AuthService, useValue: authService },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(PaymentsService);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpController.verify();
  });

  it('aggregates paginated payment responses into a single list', () => {
    let resultLength = 0;

    service.fetchAllPayments(true, 2).subscribe((payments) => {
      resultLength = payments.length;
    });

    const firstPage = httpController.expectOne(
      (request) =>
        request.url === '/api/payments' &&
        request.params.get('page') === '1' &&
        request.params.get('limit') === '2'
    );

    firstPage.flush({
      data: {
        payments: [
          {
            _id: '1',
            merchant: 'Amazon',
            payment_type: 'card_payment',
            amount_minor: 1000,
            currency: 'GBP',
            region: 'UK',
            initiated_at: '2026-01-01T10:00:00',
            status: 'success',
            customer_details: {},
            provider_attempts: [],
          },
          {
            _id: '2',
            merchant: 'Spotify',
            payment_type: 'subscription',
            amount_minor: 999,
            currency: 'EUR',
            region: 'EU',
            initiated_at: '2026-01-02T10:00:00',
            status: 'pending',
            customer_details: {},
            provider_attempts: [],
          },
        ],
        page: 1,
        limit: 2,
        total: 3,
      },
    });

    const secondPage = httpController.expectOne(
      (request) =>
        request.url === '/api/payments' &&
        request.params.get('page') === '2' &&
        request.params.get('limit') === '2'
    );

    secondPage.flush({
      data: {
        payments: [
          {
            _id: '3',
            merchant: 'Airbnb',
            payment_type: 'booking',
            amount_minor: 12000,
            currency: 'USD',
            region: 'US',
            initiated_at: '2026-01-03T10:00:00',
            status: 'failed',
            customer_details: {},
            provider_attempts: [],
          },
        ],
        page: 2,
        limit: 2,
        total: 3,
      },
    });

    expect(resultLength).toBe(3);
  });

  it('serializes create payment payloads as urlencoded nested JSON', () => {
    service
      .createPayment({
        merchant: 'Amazon',
        paymentType: 'card_payment',
        amountMinor: 1000,
        currency: 'GBP',
        region: 'UK',
        status: 'success',
        customerDetails: {
          name: 'John Smith',
          email: 'john@test.com',
          country: 'UK',
        },
        providerAttempts: [
          {
            provider: 'Stripe',
            result: 'success',
            latency_ms: 120,
          },
        ],
      })
      .subscribe();

    const request = httpController.expectOne('/api/payments');
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Content-Type')).toBe('application/x-www-form-urlencoded');

    const body = new URLSearchParams(request.request.body as string);
    expect(body.get('payment_type')).toBe('card_payment');
    expect(JSON.parse(body.get('customer_details') ?? '{}')).toEqual({
      name: 'John Smith',
      email: 'john@test.com',
      country: 'UK',
    });
    expect(JSON.parse(body.get('provider_attempts') ?? '[]')).toEqual([
      {
        provider: 'Stripe',
        result: 'success',
        latency_ms: 120,
      },
    ]);

    request.flush({ message: 'Payment added' });
  });

  it('filters cached payments by status', () => {
    let statuses: string[] = [];

    service.fetchPaymentsByStatus('success').subscribe((payments) => {
      statuses = payments.map((payment) => payment.status);
    });

    const request = httpController.expectOne(
      (req) =>
        req.url === '/api/payments' &&
        req.params.get('page') === '1' &&
        req.params.get('limit') === '50'
    );

    request.flush({
      data: {
        payments: [
          {
            _id: '1',
            merchant: 'Amazon',
            payment_type: 'card_payment',
            amount_minor: 1000,
            currency: 'GBP',
            region: 'UK',
            initiated_at: '2026-01-01T10:00:00',
            status: 'success',
            customer_details: {},
            provider_attempts: [],
          },
          {
            _id: '2',
            merchant: 'Spotify',
            payment_type: 'subscription',
            amount_minor: 999,
            currency: 'EUR',
            region: 'EU',
            initiated_at: '2026-01-02T10:00:00',
            status: 'pending',
            customer_details: {},
            provider_attempts: [],
          },
        ],
        page: 1,
        limit: 50,
        total: 2,
      },
    });

    expect(statuses).toEqual(['success']);
  });

  it('does not reuse cached payments across authenticated users', () => {
    let adminPayments = 0;
    let merchantPayments = 0;

    service.fetchAllPayments().subscribe((payments) => {
      adminPayments = payments.length;
    });

    httpController.expectOne('/api/payments?page=1&limit=50').flush({
      data: {
        payments: [
          {
            _id: '1',
            merchant: 'Amazon',
            payment_type: 'card_payment',
            amount_minor: 1000,
            currency: 'GBP',
            region: 'UK',
            initiated_at: '2026-01-01T10:00:00',
            status: 'success',
            customer_details: {},
            provider_attempts: [],
          },
        ],
        page: 1,
        limit: 50,
        total: 1,
      },
    });

    authService.role.mockReturnValue('merchant');
    authService.email.mockReturnValue('merchant@test.com');
    authService.token.mockReturnValue('merchant-token');

    service.fetchAllPayments().subscribe((payments) => {
      merchantPayments = payments.length;
    });

    httpController.expectOne('/api/payments?page=1&limit=50').flush({
      data: {
        payments: [],
        page: 1,
        limit: 50,
        total: 0,
      },
    });

    expect(adminPayments).toBe(1);
    expect(merchantPayments).toBe(0);
  });
});
