export interface AutomaticLatheOperation {
  id: number;
  quoteId: number;
  featureId: number | null;
  sequenceNo: number;
  processId: number;
  processName: string;
  processCategory: string;
  machiningLength: number;
  diameter: number;
  depth: number;
  repeatCount: number;
  feed: number;
  vc: number;
  rpm: number;
  cuttingTimeSec: number;
  nonCuttingTimeSec: number;
  totalTimeSec: number;
  status: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface LatheCycleTimeSummary {
  quoteId: number;
  machineName: string;
  materialName: string;
  quantity: number;
  cuttingTimeSec: number;
  nonCuttingTimeSec: number;
  totalCycleTimeSec: number;
  totalLotTimeSec: number;
  operations: AutomaticLatheOperation[];
}
