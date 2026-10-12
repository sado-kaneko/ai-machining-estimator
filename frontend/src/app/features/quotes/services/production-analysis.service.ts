import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AnalysisSummary,
  MachineAnalysisItem,
  MaterialAnalysisItem,
  DiameterAnalysisItem,
  ProcessAnalysisItem,
  CorrectionFactorCandidate,
  AnalysisExecutionResult,
} from '../models/production-analysis.model';

import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ProductionAnalysisService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  /**
   * 全体概要分析の取得
   */
  getSummary(): Observable<AnalysisSummary> {
    return this.http.get<AnalysisSummary>(`${this.baseUrl}/production-analysis/summary`);
  }

  /**
   * 設備別分析の取得
   */
  getMachines(): Observable<MachineAnalysisItem[]> {
    return this.http.get<MachineAnalysisItem[]>(`${this.baseUrl}/production-analysis/machines`);
  }

  /**
   * 材料別分析の取得
   */
  getMaterials(): Observable<MaterialAnalysisItem[]> {
    return this.http.get<MaterialAnalysisItem[]>(`${this.baseUrl}/production-analysis/materials`);
  }

  /**
   * 材料径別分析の取得
   */
  getDiameters(): Observable<DiameterAnalysisItem[]> {
    return this.http.get<DiameterAnalysisItem[]>(`${this.baseUrl}/production-analysis/diameters`);
  }

  /**
   * 工程別分析の取得
   */
  getProcesses(): Observable<ProcessAnalysisItem[]> {
    return this.http.get<ProcessAnalysisItem[]>(`${this.baseUrl}/production-analysis/processes`);
  }

  /**
   * 補正係数候補 & 信頼度一覧の取得
   */
  getCorrectionFactorsConfidence(): Observable<{ items: CorrectionFactorCandidate[] }> {
    return this.http.get<{ items: CorrectionFactorCandidate[] }>(
      `${this.baseUrl}/lathe-correction-factors/confidence`
    );
  }

  /**
   * 分析を実行してDB保存
   */
  executeAnalysis(): Observable<AnalysisExecutionResult> {
    return this.http.post<AnalysisExecutionResult>(
      `${this.baseUrl}/production-analysis/execute`,
      {}
    );
  }
}
