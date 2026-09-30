import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CorrectionPreviewResult,
  CorrectionHistoryItem,
} from '../models/correction.model';

@Injectable({
  providedIn: 'root',
})
export class CorrectionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  /**
   * 補正プレビュー取得
   * GET /api/correction/preview
   */
  getPreview(
    machineId: number,
    materialName: string,
    theoreticalTime: number
  ): Observable<CorrectionPreviewResult> {
    const params = new HttpParams()
      .set('machineId', machineId.toString())
      .set('materialName', materialName)
      .set('theoreticalTime', theoreticalTime.toString());

    return this.http.get<CorrectionPreviewResult>(`${this.baseUrl}/correction/preview`, {
      params,
    });
  }

  /**
   * 案件別補正適用履歴を取得
   * GET /api/quotes/:id/correction-history
   */
  getHistory(quoteId: number): Observable<{ items: CorrectionHistoryItem[] }> {
    return this.http.get<{ items: CorrectionHistoryItem[] }>(
      `${this.baseUrl}/quotes/${quoteId}/correction-history`
    );
  }

  /**
   * 補正係数の承認・承認解除
   * POST /api/lathe-correction-factors/:id/approve
   */
  toggleApproval(
    factorId: number,
    approved: boolean,
    operatorName: string = '管理者'
  ): Observable<{ success: boolean; id: number; approved: boolean }> {
    return this.http.post<{ success: boolean; id: number; approved: boolean }>(
      `${this.baseUrl}/lathe-correction-factors/${factorId}/approve`,
      {
        approved,
        operatorName,
      }
    );
  }
}
