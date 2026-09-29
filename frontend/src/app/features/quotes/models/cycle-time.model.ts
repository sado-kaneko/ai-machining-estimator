export interface OperationCycleTimeDetail {
  operationId: number;
  sequenceNo: number;
  operationType: string;
  description: string;
  workDiameter: number;
  cuttingLength: number;
  vc: number;
  feedPerRev: number;
  rpm: number;
  feedRate: number;
  cuttingTimeSec: number;
  nonCuttingTimeSec: number;
  totalTimeSec: number;
  conditionSource: string;
}

export interface CycleTimeResult {
  id: number;
  quoteId: number;
  cuttingTimeSec: number;
  nonCuttingTimeSec: number;
  totalCycleTimeSec: number;
  quantity: number;
  totalLotTimeSec: number;
  calculationVersion: string;
  operations: OperationCycleTimeDetail[];
  createdAt: string;
  updatedAt: string | null;
}
