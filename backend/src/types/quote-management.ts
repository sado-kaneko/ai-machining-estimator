/**
 * PHASE17: 見積業務システム化（案件管理・履歴管理・見積確定保存・根拠管理）型定義
 */

export type QuoteStatus =
  | 'DRAFT'
  | 'ANALYZING'
  | 'CALCULATED'
  | 'REVIEW'
  | 'APPROVED'
  | 'COMPLETED';

/**
 * 見積確定結果 エンティティ・DTO
 */
export interface QuoteResultDto {
  id: number;
  quoteId: number;
  cycleTime: number; // 理論CT (秒)
  machine: string; // 使用設備
  correctionFactor: number; // 適用補正倍率
  finalTime: number; // 最終予測CT (秒)
  quantity: number; // 数量
  totalLotTime: number; // ロット総加工時間 (秒)
  cuttingTime: number | null; // 純切削時間 (秒)
  nonCuttingTime: number | null; // 非切削時間 (秒)
  correctionSource: string | null; // 補正条件
  confidenceLevel: string | null; // 信頼度
  notes: string | null; // 特記事項
  completedBy: string; // 確定者
  completedAt: string; // 確定日時
}

export interface CompleteQuoteInput {
  quoteId: number;
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

/**
 * 見積操作・変更履歴
 */
export interface QuoteHistoryDto {
  id: number;
  quoteId: number;
  action: string;
  beforeData: any;
  afterData: any;
  createdBy: string;
  createdAt: string;
}

/**
 * 類似案件検索パラメータ
 */
export interface SimilarQuoteQuery {
  partNo?: string;
  material?: string;
  machine?: string;
  diameter?: number;
  limit?: number;
}

/**
 * 類似案件検索結果項目
 */
export interface SimilarQuoteItemDto {
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

/**
 * 見積根拠データ (社内帳票・PDF出力用)
 */
export interface QuoteBasisDto {
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
  completedResult?: QuoteResultDto | null;
}
