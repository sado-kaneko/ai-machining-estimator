/**
 * PHASE18 類似加工検索 共通型定義
 */

export type SimilarityLevel = 'HIGH' | 'MEDIUM' | 'REFERENCE' | 'LOW';

export interface SimilarityScoreBreakdown {
  materialScore: number;     // 材料一致 (最大20点)
  machineScore: number;      // 設備一致 (最大15点)
  diameterScore: number;     // 素材径近似 (最大15点)
  featureScore: number;      // Feature構成一致 (最大35点)
  dimensionScore: number;    // 寸法近似 (最大15点)
  totalScore: number;        // 合計 (最大100点)
}

export interface SimilarQuoteResult {
  targetQuoteId: number;
  quoteNo: string | null;
  partNo: string;
  partName: string;
  customerName: string;
  similarityScore: number;
  similarityLevel: SimilarityLevel;
  material: string | null;
  diameter: number | null;
  machine: string | null;
  featureSummary: string;
  predictedCycleTime: number | null;
  actualCycleTime: number | null;
  errorRate: number | null;
  processedAt: string | null;
  breakdown: SimilarityScoreBreakdown;
}

export interface SimilarQuoteSearchResponse {
  quoteId: number;
  results: SimilarQuoteResult[];
}
