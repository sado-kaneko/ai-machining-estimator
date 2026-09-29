import { AutomaticLatheOperationDto } from '../types/lathe';

// 共通計算入力インターフェース
export interface CalculationEngineInput {
  quoteId: number;
  materialName: string;
  quantity: number;
  machineId: number;
  machineName: string;
  machineType: string;
  maxRpm: number;
}

// 共通計算結果返却インターフェース
export interface CalculationEngineOutput {
  calculationEngineType?: string;
  cuttingTimeSec: number;
  nonCuttingTimeSec: number;
  totalTimeSec: number;
  totalLotTimeSec: number;
  operationDetails: AutomaticLatheOperationDto[];
}

// 計算Engine共通インターフェース
export interface ICalculationEngine {
  readonly engineType: string;
  calculate(input: CalculationEngineInput): Promise<CalculationEngineOutput>;
}
