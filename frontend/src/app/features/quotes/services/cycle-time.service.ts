import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CycleTimeResult } from '../models/cycle-time.model';

@Injectable({
  providedIn: 'root',
})
export class CycleTimeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  /**
   * サイクルタイム計算を実行
   * POST /api/quotes/:id/cycle-time/calculate
   */
  calculateCycleTime(quoteId: number): Observable<CycleTimeResult> {
    return this.http.post<CycleTimeResult>(
      `${this.baseUrl}/quotes/${quoteId}/cycle-time/calculate`,
      {}
    );
  }

  /**
   * サイクルタイム計算結果を取得
   * GET /api/quotes/:id/cycle-time
   */
  getCycleTime(quoteId: number): Observable<CycleTimeResult> {
    return this.http.get<CycleTimeResult>(
      `${this.baseUrl}/quotes/${quoteId}/cycle-time`
    );
  }
}
