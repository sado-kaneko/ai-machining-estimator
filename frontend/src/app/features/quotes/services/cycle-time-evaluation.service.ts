import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CreateCycleTimeEvaluationRequest,
  CycleTimeEvaluation,
  LatheCorrectionFactor,
} from '../models/cycle-time-evaluation.model';

@Injectable({
  providedIn: 'root',
})
export class CycleTimeEvaluationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  /**
   * 案件別評価一覧取得
   * GET /api/quotes/:id/cycle-time-evaluations
   */
  getEvaluationsByQuoteId(quoteId: number): Observable<{ items: CycleTimeEvaluation[] }> {
    return this.http.get<{ items: CycleTimeEvaluation[] }>(
      `${this.baseUrl}/quotes/${quoteId}/cycle-time-evaluations`
    );
  }

  /**
   * 評価登録
   * POST /api/quotes/:id/cycle-time-evaluations
   */
  createEvaluation(
    quoteId: number,
    data: CreateCycleTimeEvaluationRequest
  ): Observable<CycleTimeEvaluation> {
    return this.http.post<CycleTimeEvaluation>(
      `${this.baseUrl}/quotes/${quoteId}/cycle-time-evaluations`,
      data
    );
  }

  /**
   * 補正係数一覧取得
   * GET /api/lathe-correction-factors
   */
  getCorrectionFactors(): Observable<{ items: LatheCorrectionFactor[] }> {
    return this.http.get<{ items: LatheCorrectionFactor[] }>(
      `${this.baseUrl}/lathe-correction-factors`
    );
  }
}
