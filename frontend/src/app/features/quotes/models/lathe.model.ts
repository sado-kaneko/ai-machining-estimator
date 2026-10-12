export interface AutomaticLatheOperation {
  id: number;
  quoteId: number;
  featureId: number | null;
  sequenceNo: number;
  processId: number;
  machiningSide: 'FRONT' | 'CUTOFF' | 'BACK';
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
  theoreticalCycleTime?: number;
  correctionFactor?: number;
  correctedCycleTime?: number;
  correctionSource?: string;
  correctionApplied?: boolean;
  confidenceLevel?: string;
  correctionReason?: string;
  // PHASE19: 正面・背面・同時加工情報
  machiningMode?: 'SIMULTANEOUS' | 'SEQUENTIAL';
  frontCuttingTimeSec?: number;
  backCuttingTimeSec?: number;
  cutoffCuttingTimeSec?: number;
  frontTotalTimeSec?: number;
  backTotalTimeSec?: number;
  cutoffTotalTimeSec?: number;
  dominantSide?: 'FRONT' | 'BACK';
  savedTimeSec?: number;
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

