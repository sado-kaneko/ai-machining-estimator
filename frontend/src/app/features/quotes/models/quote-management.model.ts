/**
 * PHASE17: 見積業務システム化（案件管理・履歴管理・見積確定保存・根拠管理）フロントエンドモデル
 */

export type QuoteStatus =
  | 'DRAFT'
  | 'ANALYZING'
  | 'CALCULATED'
  | 'REVIEW'
  | 'APPROVED'
  | 'COMPLETED';

export interface QuoteResult {
  id: number;
  quoteId: number;
  cycleTime: number;
  machine: string;
  correctionFactor: number;
  finalTime: number;
  quantity: number;
  totalLotTime: number;
  cuttingTime: number | null;
  nonCuttingTime: number | null;
  correctionSource: string | null;
  confidenceLevel: string | null;
  notes: string | null;
  completedBy: string;
  completedAt: string;
}

export interface CompleteQuoteRequest {
  cycleTime: number;
  machine: string;
  correctionFactor: number;
  finalTime: number;
  quantity: number;
  totalLotTime: number;
  cuttingTime?: number;
  nonCuttingTime?: number;
  correctionSource?: string;
  confidenceLevel?: string;
  notes?: string;
  completedBy?: string;
}

export interface QuoteHistory {
  id: number;
  quoteId: number;
  action: string;
  beforeData: any;
  afterData: any;
  createdBy: string;
  createdAt: string;
}

export interface SimilarQuoteItem {
  id: number;
  quoteNo: string | null;
  customerName: string;
  partNo: string;
  partName: string;
  quantity: number;
  material: string | null;
  status: string;
  machineName: string | null;
  cycleTimeSec: number | null;
  totalLotTimeSec: number | null;
  correctionFactor: number | null;
  similarityReason: string;
  createdAt: string;
}

export interface QuoteBasis {
  quote: {
    id: number;
    quoteNo: string | null;
    customerName: string;
    partNo: string;
    partName: string;
    quantity: number;
    material: string | null;
    status: string;
    createdBy: string | null;
    createdAt: string;
  };
  materialInfo: {
    shapeType: string | null;
    diameter: number | null;
    length: number | null;
  } | null;
  machine: {
    name: string;
    type: string;
    maxRpm: number;
  } | null;
  timeSummary: {
    theoreticalCycleTimeSec: number;
    correctionFactor: number;
    correctedCycleTimeSec: number;
    cuttingTimeSec: number;
    nonCuttingTimeSec: number;
    totalLotTimeSec: number;
  };
  correctionInfo: {
    source: string | null;
    confidence: string | null;
    reason: string | null;
    applied: boolean;
  };
  operations: Array<{
    sequenceNo: number;
    processName: string;
    diameter: number;
    length: number;
    cuttingSpeed: number;
    feedRate: number;
    rpm: number;
    cuttingTimeSec: number;
    nonCuttingTimeSec: number;
    totalTimeSec: number;
  }>;
  completedResult?: QuoteResult | null;
}
