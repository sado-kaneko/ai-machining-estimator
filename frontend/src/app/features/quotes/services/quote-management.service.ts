import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CompleteQuoteRequest,
  QuoteBasis,
  QuoteHistory,
  QuoteResult,
  QuoteStatus,
  SimilarQuoteItem,
} from '../models/quote-management.model';
import { SimilarQuoteSearchResponse } from '../../../core/models/similarity.model';

@Injectable({
  providedIn: 'root',
})
export class QuoteManagementService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  /**
   * 見積確定保存
   * POST /api/quotes/:id/complete
   */
  completeQuote(quoteId: number, data: Partial<CompleteQuoteRequest>): Observable<{ message: string; result: QuoteResult }> {
    return this.http.post<{ message: string; result: QuoteResult }>(
      `${this.baseUrl}/quotes/${quoteId}/complete`,
      data
    );
  }

  /**
   * 見積根拠データ取得
   * GET /api/quotes/:id/basis
   */
  getQuoteBasis(quoteId: number): Observable<QuoteBasis> {
    return this.http.get<QuoteBasis>(`${this.baseUrl}/quotes/${quoteId}/basis`);
  }

  /**
   * 見積変更履歴取得
   * GET /api/quotes/:id/history
   */
  getQuoteHistory(quoteId: number): Observable<{ items: QuoteHistory[] }> {
    return this.http.get<{ items: QuoteHistory[] }>(`${this.baseUrl}/quotes/${quoteId}/history`);
  }

  /**
   * ステータス更新
   * PATCH /api/quotes/:id/status
   */
  updateStatus(quoteId: number, status: QuoteStatus, operatorName?: string): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.baseUrl}/quotes/${quoteId}/status`, {
      status,
      operatorName,
    });
  }

  /**
   * 類似案件検索
   * GET /api/quotes/search/similar
   */
  searchSimilarQuotes(query: {
    partNo?: string;
    material?: string;
    machine?: string;
    diameter?: number;
    limit?: number;
  }): Observable<{ items: SimilarQuoteItem[] }> {
    let params = new HttpParams();
    if (query.partNo) params = params.set('partNo', query.partNo);
    if (query.material) params = params.set('material', query.material);
    if (query.machine) params = params.set('machine', query.machine);
    if (query.diameter) params = params.set('diameter', query.diameter.toString());
    if (query.limit) params = params.set('limit', query.limit.toString());

    return this.http.get<{ items: SimilarQuoteItem[] }>(`${this.baseUrl}/quotes/search/similar`, {
      params,
    });
  }

  /**
   * PHASE18: 高度類似加工案件検索
   * GET /api/quotes/:id/similar
   */
  getAdvancedSimilarQuotes(quoteId: number, limit = 10): Observable<SimilarQuoteSearchResponse> {
    return this.http.get<SimilarQuoteSearchResponse>(`${this.baseUrl}/quotes/${quoteId}/similar?limit=${limit}`);
  }

  /**
   * 見積根拠資料 (HTML / PDF印刷) のURL取得
   */
  getPdfExportUrl(quoteId: number): string {
    return `${this.baseUrl}/quotes/${quoteId}/export-pdf`;
  }
}
