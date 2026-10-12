export interface Machine {
  id: number;
  machineType: string;
  calculationEngineType: string;
  machineName: string;
  maker: string | null;
  model: string | null;
  maxRpm: number;
  maxBarDiameter?: number | null;
  maxMachiningLength?: number | null;
  hasSubSpindle?: boolean | null;
  maxTools?: number | null;
  specialOptions?: string | null;
}

export interface QuoteMachineSelection {
  id: number;
  machineType: string;
  calculationEngineType: string;
  machineName: string;
  maker: string | null;
  model: string | null;
  maxRpm: number;
  maxBarDiameter?: number | null;
  maxMachiningLength?: number | null;
  hasSubSpindle?: boolean | null;
  maxTools?: number | null;
  specialOptions?: string | null;
}

