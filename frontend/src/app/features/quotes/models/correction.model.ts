/**
 * PHASE16: 補正Engine組込み・実績フィードバック型サイクルタイム予測 モデル定義
 */

export type CorrectionConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

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

export interface CorrectionHistoryItem {
  id: number;
  quoteId: number;
  beforeTime: number;
  factor: number;
  afterTime: number;
  source: string;
  createdAt: string;
}
