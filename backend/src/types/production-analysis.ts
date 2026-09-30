/**
 * PHASE15: 生産実績分析・補正係数候補・信頼度評価基盤 型定義
 */

export type AnalysisType = 'OVERALL' | 'MACHINE' | 'MATERIAL' | 'DIAMETER' | 'PROCESS';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * 統計分析サマリDTO (全体概要)
 */
export interface AnalysisSummaryDto {
  sampleCount: number;
  averageFactor: number;
  medianFactor: number;
  stddevFactor: number | null;
  maxFactor: number | null;
  minFactor: number | null;
  confidenceLevel: ConfidenceLevel;
}

/**
 * 設備別分析アイテム
 */
export interface MachineAnalysisItem {
  machine: string;
  count: number;
  factor: number;
  medianFactor: number;
  stddev: number | null;
  confidenceLevel: ConfidenceLevel;
}

/**
 * 材料別分析アイテム
 */
export interface MaterialAnalysisItem {
  material: string;
  count: number;
  factor: number;
  medianFactor: number;
  stddev: number | null;
  confidenceLevel: ConfidenceLevel;
}

/**
 * 材料径別分析アイテム
 */
export interface DiameterAnalysisItem {
  range: string; // 'φ3～φ10', 'φ10～φ20', 'φ20以上', '未指定'
  count: number;
  factor: number;
  medianFactor: number;
  stddev: number | null;
  confidenceLevel: ConfidenceLevel;
}

/**
 * 工程別分析アイテム
 */
export interface ProcessAnalysisItem {
  process: string;
  count: number;
  factor: number;
  medianFactor: number;
  stddev: number | null;
  confidenceLevel: ConfidenceLevel;
}

/**
 * 補正係数候補 & 信頼度アイテム
 */
export interface CorrectionFactorCandidate {
  id?: number;
  machineId?: number;
  machineName: string;
  materialName: string;
  processType: string;
  factor: number;
  sampleCount: number;
  confidenceLevel: ConfidenceLevel;
  approved: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
}

/**
 * 分析実行結果
 */
export interface AnalysisExecutionResult {
  summary: AnalysisSummaryDto;
  machines: MachineAnalysisItem[];
  materials: MaterialAnalysisItem[];
  diameters: DiameterAnalysisItem[];
  processes: ProcessAnalysisItem[];
  candidates: CorrectionFactorCandidate[];
  savedRecords: number;
}
