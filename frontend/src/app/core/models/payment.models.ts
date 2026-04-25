export interface CustomerDetails {
  name?: string;
  email?: string;
  country?: string;
}

export interface ProviderAttempt {
  provider: 'Stripe' | 'PayPal' | 'Adyen' | string;
  result: 'success' | 'failure' | string;
  latency_ms: number;
}

export interface PaymentRecord {
  _id?: string;
  merchant: string;
  payment_type: string;
  amount_minor: number;
  currency: string;
  region: string;
  initiated_at: string;
  status: string;
  customer_details: CustomerDetails;
  provider_attempts: ProviderAttempt[];
}

export interface PaginatedPaymentsResponse {
  payments: PaymentRecord[];
  page: number;
  limit: number;
  total: number;
}

export interface PaymentUpsertPayload {
  merchant: string;
  paymentType: string;
  amountMinor: number;
  currency: string;
  region: string;
  status: string;
  customerDetails: CustomerDetails;
  providerAttempts?: ProviderAttempt[];
}

export interface PaymentsQueryState {
  page: number;
  pageSize: number;
  status: string;
  q: string;
  currency: string;
  region: string;
  paymentType: string;
  sort: string;
}
