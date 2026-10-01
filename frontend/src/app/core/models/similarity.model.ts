export type SimilarityLevel = 'HIGH' | 'MEDIUM' | 'REFERENCE' | 'LOW';

export interface SimilarityScoreBreakdown {
  materialScore: number;
  machineScore: number;
  diameterScore: number;
  featureScore: number;
  dimensionScore: number;
  totalScore: number;
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
