import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  MaterialInformation,
  SaveMaterialRequest,
  UpdateMaterialRequest,
} from '../models/material.model';

@Injectable({
  providedIn: 'root',
})
export class MaterialService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  /**
   * 案件IDから素材情報を取得
   * GET /api/quotes/:id/material
   */
  getMaterialByQuoteId(quoteId: number): Observable<MaterialInformation | null> {
    return this.http.get<MaterialInformation | null>(
      `${this.baseUrl}/quotes/${quoteId}/material`
    );
  }

  /**
   * 案件に対する素材情報登録・Upsert
   * POST /api/quotes/:id/material
   */
  saveMaterialForQuote(
    quoteId: number,
    data: SaveMaterialRequest
  ): Observable<MaterialInformation> {
    return this.http.post<MaterialInformation>(
      `${this.baseUrl}/quotes/${quoteId}/material`,
      data
    );
  }

  /**
   * 素材情報更新 (ID指定)
   * PUT /api/materials/:id
   */
  updateMaterial(
    id: number,
    data: UpdateMaterialRequest
  ): Observable<MaterialInformation> {
    return this.http.put<MaterialInformation>(
      `${this.baseUrl}/materials/${id}`,
      data
    );
  }
}
