export interface PredictionAccuracyRecord {
  id: number;
  quoteId: number;
  quoteNo: string | null;
  partNo: string | null;
  partName: string | null;
  customerName?: string | null;
  cycleTimeResultId: number | null;
  predictionCt: number;
  theoreticalCt: number | null;
  actualCt: number;
  errorSeconds: number;
  errorRate: number;
  absoluteErrorRate: number;
  machineName: string | null;
  materialName: string | null;
  evaluatedAt: string;
}

export interface AccuracySummary {
  totalEvaluations: number;
  avgAbsoluteErrorRate: number;
  medianAbsoluteErrorRate: number;
  avgErrorRate: number;
  within10PercentCount: number;
  within10PercentRate: number;
  within20PercentCount: number;
  within20PercentRate: number;
  over20PercentCount: number;
  over20PercentRate: number;
  underPredictionCount: number;
  overPredictionCount: number;
}

export interface MachineAccuracy {
  machineName: string;
  sampleCount: number;
  avgAbsoluteErrorRate: number;
  medianAbsoluteErrorRate: number;
  underPredictionRate: number;
  overPredictionRate: number;
}

export interface MaterialAccuracy {
  materialName: string;
  sampleCount: number;
  avgAbsoluteErrorRate: number;
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface MonthlyTrend {
  month: string;
  sampleCount: number;
  avgAbsoluteErrorRate: number;
  avgErrorRate: number;
}

export interface CorrectionEffect {
  sampleCount: number;
  beforeCorrectionAvgAbsError: number;
  afterCorrectionAvgAbsError: number;
  improvementRate: number;
}

export interface ImprovementCandidate {
  id: number;
  machineId?: number;
  machineName: string;
  materialName: string;
  processType: string;
  currentFactor: number;
  suggestedFactor: number;
  sampleCount: number;
  confidenceLevel: string;
  avgErrorRate: number;
  status: 'PENDING' | 'APPROVED' | 'INSUFFICIENT_DATA';
  notes: string;
}
