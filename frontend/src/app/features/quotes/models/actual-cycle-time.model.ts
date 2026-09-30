export interface ActualCycleTime {
  id: number;
  quoteId: number;
  machineId: number | null;
  machineName: string | null;
  productionDate: string | null;
  quantity: number;
  cycleTimeResultId: number | null;
  actualCycleTimeSec: number;
  setupTimeSec: number;
  operatorName: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateActualCycleTimeRequest {
  machineId?: number | null;
  productionDate?: string | null;
  quantity: number;
  actualCycleTimeSec: number;
  setupTimeSec?: number;
  operatorName?: string | null;
  notes?: string | null;
}

export interface CycleTimeComparison {
  quoteId: number;
  machineName: string;
  estimateSec: number;
  actualSec: number;
  differenceSec: number;
  differenceRate: number;
  actualCount: number;
  latestActualDate: string | null;
}
