import { UserRole } from '../models/auth.models';
import { PaymentsQueryState } from '../models/payment.models';

export const API_ROOT = '/api';
export const SESSION_STORAGE_KEY = 'payment-routing-session';
export const THEME_STORAGE_KEY = 'payment-routing-theme';
export const INITIAL_PAGE_FETCH_SIZE = 5;
export const DEFAULT_PAGE_SIZE = 5;

export const CURRENCY_OPTIONS = ['GBP', 'USD', 'EUR'] as const;
export const STATUS_OPTIONS = ['succeeded', 'pending', 'failed'] as const;

export const SORT_OPTIONS = [
  { value: 'date-desc', label: 'Newest first' },
  { value: 'date-asc', label: 'Oldest first' },
  { value: 'amount-desc', label: 'Highest amount' },
  { value: 'amount-asc', label: 'Lowest amount' }
] as const;

export const DEFAULT_QUERY_STATE: PaymentsQueryState = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  status: 'all',
  q: '',
  currency: 'all',
  region: 'all',
  paymentType: 'all',
  sort: 'date-desc'
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  finance: 'Finance Analyst',
  merchant: 'Merchant Operator'
};
