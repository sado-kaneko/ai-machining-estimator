import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AccuracySummary,
  MachineAccuracy,
  MaterialAccuracy,
  MonthlyTrend,
  CorrectionEffect,
  ImprovementCandidate,
  PredictionAccuracyRecord,
} from '../models/accuracy.model';

@Injectable({
  providedIn: 'root',
})
export class AccuracyService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiBaseUrl}/accuracy`;

  /**
   * 精度評価の一括実行
   */
  executeEvaluation(): Observable<{ evaluatedCount: number; message: string }> {
    return this.http.post<{ evaluatedCount: number; message: string }>(`${this.baseUrl}/execute`, {});
  }

  /**
   * 全体KPIサマリ取得
   */
  getSummary(): Observable<AccuracySummary> {
    return this.http.get<AccuracySummary>(`${this.baseUrl}/summary`);
  }

  /**
   * 設備別精度取得
   */
  getMachineAccuracy(): Observable<{ machines: MachineAccuracy[] }> {
    return this.http.get<{ machines: MachineAccuracy[] }>(`${this.baseUrl}/machines`);
  }

  /**
   * 材料別精度取得
   */
  getMaterialAccuracy(): Observable<{ materials: MaterialAccuracy[] }> {
    return this.http.get<{ materials: MaterialAccuracy[] }>(`${this.baseUrl}/materials`);
  }

  /**
   * 月別精度推移取得
   */
  getMonthlyTrends(): Observable<{ trends: MonthlyTrend[] }> {
    return this.http.get<{ trends: MonthlyTrend[] }>(`${this.baseUrl}/trends`);
  }

  /**
   * 補正効果比較取得
   */
  getCorrectionEffect(): Observable<CorrectionEffect> {
    return this.http.get<CorrectionEffect>(`${this.baseUrl}/correction-effect`);
  }

  /**
   * 補正改善候補一覧取得
   */
  getCandidates(): Observable<{ candidates: ImprovementCandidate[] }> {
    return this.http.get<{ candidates: ImprovementCandidate[] }>(`${this.baseUrl}/candidates`);
  }

  /**
   * 改善候補の承認 & 反映
   */
  applyCandidate(
    factorId: number,
    suggestedFactor: number,
    operatorName = '技術担当者'
  ): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/candidates/${factorId}/apply`, {
      suggestedFactor,
      operatorName,
    });
  }

  /**
   * 精度評価明細レコード一覧取得
   */
  getRecords(limit = 100): Observable<{ records: PredictionAccuracyRecord[] }> {
    return this.http.get<{ records: PredictionAccuracyRecord[] }>(`${this.baseUrl}/records?limit=${limit}`);
  }
}
