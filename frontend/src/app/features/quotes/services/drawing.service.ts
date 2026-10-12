import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Drawing, DrawingListResponse } from '../models/drawing.model';

@Injectable({
  providedIn: 'root',
})
export class DrawingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  /**
   * PDF図面アップロード (POST /api/quotes/:quoteId/drawings)
   */
  uploadDrawing(quoteId: number, file: File): Observable<Drawing> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Drawing>(`${this.baseUrl}/quotes/${quoteId}/drawings`, formData);
  }

  /**
   * 見積案件の図面一覧取得 (GET /api/quotes/:quoteId/drawings)
   */
  getDrawings(quoteId: number): Observable<DrawingListResponse> {
    return this.http.get<DrawingListResponse>(`${this.baseUrl}/quotes/${quoteId}/drawings`);
  }

  /**
   * 図面削除 (DELETE /api/drawings/:id)
   */
  deleteDrawing(drawingId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/drawings/${drawingId}`);
  }

  /**
   * 図面AI解析実行 (POST /api/drawings/:id/analyze)
   */
  analyzeDrawing(drawingId: number): Observable<{ id: number; drawingId: number; status: string; createdAt: string }> {
    return this.http.post<{ id: number; drawingId: number; status: string; createdAt: string }>(
      `${this.baseUrl}/drawings/${drawingId}/analyze`,
      {}
    );
  }

  /**
   * 図面の最新解析結果取得 (GET /api/drawings/:id/analysis)
   */
  getLatestAnalysis(drawingId: number): Observable<import('../models/feature.model').DrawingAnalysis | null> {
    return this.http.get<import('../models/feature.model').DrawingAnalysis | null>(
      `${this.baseUrl}/drawings/${drawingId}/analysis`
    );
  }

  /**
   * 図面AI解析の中断・安全停止 (POST /api/drawings/:id/cancel-analysis)
   */
  cancelAnalysis(drawingId: number): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.baseUrl}/drawings/${drawingId}/cancel-analysis`,
      {}
    );
  }
}
