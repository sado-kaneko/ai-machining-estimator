/**
 * PHASE15: 生産実績統計分析・補正係数候補・信頼度評価 フロントエンドモデル
 */

export type AnalysisType = 'OVERALL' | 'MACHINE' | 'MATERIAL' | 'DIAMETER' | 'PROCESS';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface AnalysisSummary {
  sampleCount: number;
  averageFactor: number;
  medianFactor: number;
  stddevFactor: number | null;
  maxFactor: number | null;
  minFactor: number | null;
  confidenceLevel: ConfidenceLevel;
}

export interface MachineAnalysisItem {
  machine: string;
  count: number;
  factor: number;
  medianFactor: number;
  stddev: number | null;
  confidenceLevel: ConfidenceLevel;
}

export interface MaterialAnalysisItem {
  material: string;
  count: number;
  factor: number;
  medianFactor: number;
  stddev: number | null;
  confidenceLevel: ConfidenceLevel;
}

export interface DiameterAnalysisItem {
  range: string;
  count: number;
  factor: number;
  medianFactor: number;
  stddev: number | null;
  confidenceLevel: ConfidenceLevel;
}

export interface ProcessAnalysisItem {
  process: string;
  count: number;
  factor: number;
  medianFactor: number;
  stddev: number | null;
  confidenceLevel: ConfidenceLevel;
}

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

export interface AnalysisExecutionResult {
  summary: AnalysisSummary;
  machines: MachineAnalysisItem[];
  materials: MaterialAnalysisItem[];
  diameters: DiameterAnalysisItem[];
  processes: ProcessAnalysisItem[];
  candidates: CorrectionFactorCandidate[];
  savedRecords: number;
}
