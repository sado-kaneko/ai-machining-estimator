import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AutomaticLatheOperation, LatheCycleTimeSummary } from '../models/lathe.model';

@Injectable({
  providedIn: 'root',
})
export class LatheService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  /**
   * NC自動旋盤工程をFeatureから生成
   * POST /api/quotes/:id/lathe-operations/generate
   */
  generateLatheOperations(quoteId: number, force = false): Observable<{ quoteId: number; operationCount: number }> {
    return this.http.post<{ quoteId: number; operationCount: number }>(
      `${this.baseUrl}/quotes/${quoteId}/lathe-operations/generate`,
      { force }
    );
  }

  /**
   * NC自動旋盤工程一覧取得
   * GET /api/quotes/:id/lathe-operations
   */
  getLatheOperations(quoteId: number): Observable<{ items: AutomaticLatheOperation[] }> {
    return this.http.get<{ items: AutomaticLatheOperation[] }>(
      `${this.baseUrl}/quotes/${quoteId}/lathe-operations`
    );
  }

  /**
   * NC自動旋盤サイクルタイム計算実行
   * POST /api/quotes/:id/lathe-cycle-time/calculate
   */
  calculateLatheCycleTime(quoteId: number): Observable<LatheCycleTimeSummary> {
    return this.http.post<LatheCycleTimeSummary>(
      `${this.baseUrl}/quotes/${quoteId}/lathe-cycle-time/calculate`,
      {}
    );
  }

  /**
   * NC自動旋盤サイクルタイム計算結果取得
   * GET /api/quotes/:id/lathe-cycle-time
   */
  getLatheCycleTime(quoteId: number): Observable<LatheCycleTimeSummary> {
    return this.http.get<LatheCycleTimeSummary>(
      `${this.baseUrl}/quotes/${quoteId}/lathe-cycle-time`
    );
  }

  /**
   * 最新マスタ基準でNC自動旋盤工程を再生成 (PHASE12)
   * POST /api/quotes/:id/lathe-operations/regenerate
   */
  regenerateLatheOperations(quoteId: number): Observable<{ quoteId: number; operationCount: number }> {
    return this.http.post<{ quoteId: number; operationCount: number }>(
      `${this.baseUrl}/quotes/${quoteId}/lathe-operations/regenerate`,
      {}
    );
  }

  /**
   * NC自動旋盤マスタ一覧取得 (PHASE12)
   * GET /api/lathe-masters
   */
  getLatheMasters(): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}/lathe-masters`
    );
  }
}
