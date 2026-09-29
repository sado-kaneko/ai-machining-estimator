import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Feature, FeatureListResponse, UpdateFeatureRequest } from '../models/feature.model';

@Injectable({
  providedIn: 'root',
})
export class FeatureService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  /**
   * AI解析結果から加工Featureを生成
   * POST /api/drawing-analyses/:id/features
   */
  generateFeatures(analysisId: number): Observable<{ analysisId: number; featureCount: number }> {
    return this.http.post<{ analysisId: number; featureCount: number }>(
      `${this.baseUrl}/drawing-analyses/${analysisId}/features`,
      {}
    );
  }

  /**
   * 指定した解析IDの加工Feature一覧を取得
   * GET /api/drawing-analyses/:id/features
   */
  getFeatures(analysisId: number): Observable<FeatureListResponse> {
    return this.http.get<FeatureListResponse>(
      `${this.baseUrl}/drawing-analyses/${analysisId}/features`
    );
  }

  /**
   * 加工Featureの更新
   * PUT /api/features/:id
   */
  updateFeature(id: number, data: UpdateFeatureRequest): Observable<Feature> {
    return this.http.put<Feature>(`${this.baseUrl}/features/${id}`, data);
  }
}
