export interface MachineMasterItem {
  id: number;
  machineType: string;
  machineName: string;
  maker: string | null;
  model: string | null;
  maxRpm: number;
  maxBarDiameter: number;
  guideBushType: string;
  barFeederEnabled: boolean;
  maxMachiningLength: number;
  hasSubSpindle: boolean;
  maxTools: number;
  specialOptions: string | null;
  calculationEngineType: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface SaveMachineMasterRequest {
  machineType: string;
  machineName: string;
  maker?: string | null;
  model?: string | null;
  maxRpm: number;
  maxBarDiameter: number;
  guideBushType: string;
  barFeederEnabled: boolean;
  maxMachiningLength: number;
  hasSubSpindle: boolean;
  maxTools: number;
  specialOptions?: string | null;
  calculationEngineType?: string;
  isActive?: boolean;
}

export interface ToolMasterItem {
  id: number;
  toolCode: string;
  toolName: string;
  toolCategory: string;
  materialCompatibility: string | null;
  bladeWidth: number | null;
  noseRadius: number | null;
  maxDepth: number | null;
  defaultFeed: number | null;
  defaultVc: number | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface SaveToolMasterRequest {
  toolCode: string;
  toolName: string;
  toolCategory: string;
  materialCompatibility?: string | null;
  bladeWidth?: number | null;
  noseRadius?: number | null;
  maxDepth?: number | null;
  defaultFeed?: number | null;
  defaultVc?: number | null;
  notes?: string | null;
  isActive?: boolean;
}
