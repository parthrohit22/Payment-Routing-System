import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';
import { API_ROOT } from '../constants/app.constants';
import { ApiResponse } from '../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class HealthService {
  private readonly http = inject(HttpClient);

  checkHealth(): Observable<boolean> {
    return this.http
      .get<ApiResponse<{ status: string }>>(`${API_ROOT}/health`)
      .pipe(
        map((response) => response.data?.status === 'ok'),
        catchError(() => of(false))
      );
  }
}
