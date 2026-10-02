import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Machine, QuoteMachineSelection } from '../models/machine.model';
import { LatheCycleTimeSummary } from '../models/lathe.model';

@Injectable({
  providedIn: 'root',
})
export class CalculationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  /**
   * 使用可能設備一覧取得
   * GET /api/machines
   */
  getMachines(): Observable<{ items: Machine[] }> {
    return this.http.get<{ items: Machine[] }>(`${this.baseUrl}/machines`);
  }

  /**
   * 案件の使用設備取得
   * GET /api/quotes/:id/machine
   */
  getQuoteMachine(quoteId: number): Observable<QuoteMachineSelection> {
    return this.http.get<QuoteMachineSelection>(`${this.baseUrl}/quotes/${quoteId}/machine`);
  }

  /**
   * 案件へ使用設備を設定
   * POST /api/quotes/:id/machine
   */
  setQuoteMachine(quoteId: number, machineId: number): Observable<QuoteMachineSelection> {
    return this.http.post<QuoteMachineSelection>(`${this.baseUrl}/quotes/${quoteId}/machine`, {
      machineId,
    });
  }

  /**
   * 共通計算エンジン経由でサイクルタイム計算を実行
   * POST /api/quotes/:id/cycle-time/calculate
   */
  calculateCycleTime(
    quoteId: number,
    options?: { maxRpm?: number }
  ): Observable<LatheCycleTimeSummary> {
    return this.http.post<LatheCycleTimeSummary>(
      `${this.baseUrl}/quotes/${quoteId}/cycle-time/calculate`,
      options || {}
    );
  }

  /**
   * 最新サイクルタイム計算結果を取得
   * GET /api/quotes/:id/cycle-time
   */
  getCycleTime(quoteId: number): Observable<LatheCycleTimeSummary> {
    return this.http.get<LatheCycleTimeSummary>(
      `${this.baseUrl}/quotes/${quoteId}/cycle-time`
    );
  }
}
