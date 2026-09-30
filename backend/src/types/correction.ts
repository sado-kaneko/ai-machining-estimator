/**
 * PHASE16: 補正Engine組込み・実績フィードバック型サイクルタイム予測 型定義
 */

export type CorrectionConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

/**
 * 補正判定結果
 */
export interface CorrectionDecision {
  applied: boolean;
  factor: number;
  source: string;
  confidence: CorrectionConfidenceLevel;
  sampleCount: number;
  reason: string;
}

/**
 * 補正プレビュー返却DTO
 */
export interface CorrectionPreviewResult {
  beforeTimeSec: number;
  factor: number;
  afterTimeSec: number;
  source: string;
  confidence: CorrectionConfidenceLevel;
  sampleCount: number;
  applied: boolean;
  reason: string;
}

/**
 * 補正履歴エンティティ
 */
export interface CorrectionHistoryItem {
  id: number;
  quoteId: number;
  beforeTime: number;
  factor: number;
  afterTime: number;
  source: string;
  createdAt: string;
}
