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
  calculationEngineType?: string;
  materialName: string;
  quantity: number;
  cuttingTimeSec: number;
  nonCuttingTimeSec: number;
  totalCycleTimeSec: number;
  totalLotTimeSec: number;
  operations: AutomaticLatheOperation[];
}

export interface AutomaticLatheProcessMaster {
  id: number;
  featureType: string;
  processName: string;
  calculationType: string;
  sequenceRule: number;
  machineType: string;
  description: string | null;
  defaultTimeSec: number;
  enabled: number;
}

export interface AutomaticLatheTimeMaster {
  id: number;
  machineType: string;
  materialFeedTimeSec: number;
  toolChangeTimeSec: number;
  pickupTimeSec: number;
  idleTimeSec: number;
  spindleAccDecTimeSec: number;
  description: string | null;
}

export interface LatheMasters {
  processes: AutomaticLatheProcessMaster[];
  timeMaster: AutomaticLatheTimeMaster | null;
  conditionsCount: number;
}

