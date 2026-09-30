import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ActualCycleTime,
  CreateActualCycleTimeRequest,
  CycleTimeComparison,
} from '../models/actual-cycle-time.model';

@Injectable({
  providedIn: 'root',
})
export class ActualCycleTimeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  /**
   * 加工実績一覧取得
   * GET /api/quotes/:id/actual-cycle-times
   */
  getActualCycleTimes(quoteId: number): Observable<{ items: ActualCycleTime[] }> {
    return this.http.get<{ items: ActualCycleTime[] }>(
      `${this.baseUrl}/quotes/${quoteId}/actual-cycle-times`
    );
  }

  /**
   * 加工実績登録
   * POST /api/quotes/:id/actual-cycle-times
   */
  createActualCycleTime(
    quoteId: number,
    data: CreateActualCycleTimeRequest
  ): Observable<ActualCycleTime> {
    return this.http.post<ActualCycleTime>(
      `${this.baseUrl}/quotes/${quoteId}/actual-cycle-times`,
      data
    );
  }

  /**
   * 差異比較情報取得
   * GET /api/quotes/:id/cycle-time-comparison
   */
  getComparison(quoteId: number): Observable<CycleTimeComparison> {
    return this.http.get<CycleTimeComparison>(
      `${this.baseUrl}/quotes/${quoteId}/cycle-time-comparison`
    );
  }

  /**
   * 加工実績削除
   * DELETE /api/actual-cycle-times/:id
   */
  deleteActualCycleTime(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/actual-cycle-times/${id}`);
  }
}
