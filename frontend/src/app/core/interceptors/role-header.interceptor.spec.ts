import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { SESSION_STORAGE_KEY } from '../constants/app.constants';
import { roleHeaderInterceptor } from './role-header.interceptor';
import { SessionStorageService } from '../services/session-storage.service';

describe('roleHeaderInterceptor', () => {
  beforeEach(() => {
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([roleHeaderInterceptor])),
        provideHttpClientTesting()
      ]
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    sessionStorage.clear();
  });

  it('attaches the role and bearer token headers when a session exists', () => {
    const storage = TestBed.inject(SessionStorageService);
    const http = TestBed.inject(HttpClient);
    const httpController = TestBed.inject(HttpTestingController);

    storage.set(SESSION_STORAGE_KEY, {
      email: 'parth@payments.com',
      role: 'admin',
      token: 'jwt-token'
    });

    http.get('/api/analytics/payment-status').subscribe();

    const request = httpController.expectOne('/api/analytics/payment-status');
    expect(request.request.headers.get('Role')).toBe('admin');
    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt-token');

    request.flush({ data: [] });
  });
});
