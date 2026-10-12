export interface Operation {
  id: number;
  quoteId: number;
  featureId: number | null;
  sequenceNo: number;
  operationType: string;
  machiningSide: 'FRONT' | 'CUTOFF' | 'BACK';
  description: string;
  machineType: string;
  status: string;
  workDiameter: number;
  cuttingLength: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface OperationListResponse {
  items: Operation[];
}

export interface GenerateOperationsResponse {
  quoteId: number;
  operationCount: number;
}

export interface UpdateOperationRequest {
  sequenceNo?: number;
  machiningSide?: 'FRONT' | 'CUTOFF' | 'BACK';
  description?: string;
  machineType?: string;
  status?: string;
}
