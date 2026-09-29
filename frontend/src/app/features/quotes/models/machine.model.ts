export interface Machine {
  id: number;
  machineType: string;
  calculationEngineType: string;
  machineName: string;
  maker: string | null;
  model: string | null;
  maxRpm: number;
}

export interface QuoteMachineSelection {
  id: number;
  machineType: string;
  calculationEngineType: string;
  machineName: string;
  maker: string | null;
  model: string | null;
  maxRpm: number;
}
