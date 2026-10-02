import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CreateQuoteRequest, Quote, QuoteListResponse } from '../models/quote.model';

@Injectable({
  providedIn: 'root',
})
export class QuoteService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/quotes`;

  /**
   * 見積一覧取得 (GET /api/quotes)
   */
  getQuotes(): Observable<QuoteListResponse> {
    return this.http.get<QuoteListResponse>(this.baseUrl);
  }

  /**
   * 見積詳細取得 (GET /api/quotes/:id)
   */
  getQuote(id: number): Observable<Quote> {
    return this.http.get<Quote>(`${this.baseUrl}/${id}`);
  }

  /**
   * 見積新規作成 (POST /api/quotes)
   */
  createQuote(data: CreateQuoteRequest): Observable<Quote> {
    return this.http.post<Quote>(this.baseUrl, data);
  }

  /**
   * 見積案件削除 (DELETE /api/quotes/:id)
   */
  deleteQuote(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
