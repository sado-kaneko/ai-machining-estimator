export type DifferenceCategory =
  | 'CUTTING_CONDITION'
  | 'PROCESS_RULE'
  | 'NON_CUTTING_TIME'
  | 'SETUP_TIME'
  | 'OTHER';

export type EvaluationStatus = 'EVALUATED' | 'REVIEWED';

export interface CycleTimeEvaluation {
  id: number;
  quoteId: number;
  machineId: number | null;
  machineName: string;
  calculatedCycleTimeSec: number;
  excelCycleTimeSec: number | null;
  actualCycleTimeSec: number | null;
  excelDifferenceSec: number | null;
  excelDifferenceRate: number | null;
  actualDifferenceSec: number | null;
  actualDifferenceRate: number | null;
  evaluationStatus: EvaluationStatus;
  differenceCategory: DifferenceCategory;
  notes: string | null;
  createdAt: string;
}

export interface CreateCycleTimeEvaluationRequest {
  machineId?: number | null;
  calculatedCycleTimeSec?: number | null;
  excelCycleTimeSec?: number | null;
  actualCycleTimeSec?: number | null;
  differenceCategory?: DifferenceCategory;
  notes?: string | null;
}

export interface LatheCorrectionFactor {
  id: number;
  machineId: number;
  machineName: string;
  materialName: string;
  processType: string;
  factor: number;
  sampleCount: number;
  createdAt: string;
  updatedAt: string | null;
}
