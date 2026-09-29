import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  GenerateOperationsResponse,
  Operation,
  OperationListResponse,
  UpdateOperationRequest,
} from '../models/operation.model';

@Injectable({
  providedIn: 'root',
})
export class OperationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  /**
   * 加工工程候補を生成
   * POST /api/quotes/:id/operations/generate
   */
  generateOperations(quoteId: number, force = false): Observable<GenerateOperationsResponse> {
    return this.http.post<GenerateOperationsResponse>(
      `${this.baseUrl}/quotes/${quoteId}/operations/generate`,
      { force }
    );
  }

  /**
   * 見積案件の工程一覧を取得
   * GET /api/quotes/:id/operations
   */
  getOperations(quoteId: number): Observable<OperationListResponse> {
    return this.http.get<OperationListResponse>(
      `${this.baseUrl}/quotes/${quoteId}/operations`
    );
  }

  /**
   * 工程の更新
   * PUT /api/operations/:id
   */
  updateOperation(id: number, data: UpdateOperationRequest): Observable<Operation> {
    return this.http.put<Operation>(`${this.baseUrl}/operations/${id}`, data);
  }

  /**
   * 工程の削除
   * DELETE /api/operations/:id
   */
  deleteOperation(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/operations/${id}`);
  }
}
