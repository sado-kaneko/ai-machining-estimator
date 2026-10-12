import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ProductionActualRecord,
  ProductionSyncResult,
} from '../models/production-actual.model';

import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ProductionActualService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  /**
   * sadoa生産実績同期を実行
   */
  syncProduction(forceFullSync: boolean = false): Observable<ProductionSyncResult> {
    return this.http.post<ProductionSyncResult>(`${this.baseUrl}/production-sync`, {
      forceFullSync,
    });
  }

  /**
   * 実績一覧取得
   */
  getRecords(filter?: {
    buban?: string;
    machineName?: string;
    limit?: number;
    offset?: number;
  }): Observable<{ items: ProductionActualRecord[] }> {
    let params = new HttpParams();
    if (filter?.buban) params = params.set('buban', filter.buban);
    if (filter?.machineName) params = params.set('machineName', filter.machineName);
    if (filter?.limit) params = params.set('limit', filter.limit.toString());
    if (filter?.offset) params = params.set('offset', filter.offset.toString());

    return this.http.get<{ items: ProductionActualRecord[] }>(
      `${this.baseUrl}/production-actual-records`,
      { params }
    );
  }

  /**
   * 図番別実績取得
   */
  getByBuban(buban: string): Observable<{ buban: string; items: ProductionActualRecord[] }> {
    const encoded = encodeURIComponent(buban);
    return this.http.get<{ buban: string; items: ProductionActualRecord[] }>(
      `${this.baseUrl}/production-actual-records/${encoded}`
    );
  }

  /**
   * 案件に紐づく過去実績取得
   */
  getForQuote(quoteId: number): Observable<{ quoteId: number; items: ProductionActualRecord[] }> {
    return this.http.get<{ quoteId: number; items: ProductionActualRecord[] }>(
      `${this.baseUrl}/quotes/${quoteId}/production-actual-records`
    );
  }

  /**
   * 案件と図番の手動マッピング
   */
  mapDrawing(quoteId: number, buban: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.baseUrl}/quotes/${quoteId}/drawing-mapping`,
      { buban }
    );
  }
}
