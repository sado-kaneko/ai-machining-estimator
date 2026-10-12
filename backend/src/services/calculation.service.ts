import { quoteRepository } from '../repositories/quote.repository';
import { drawingRepository } from '../repositories/drawing.repository';
import { drawingAnalysisRepository } from '../repositories/drawing-analysis.repository';
import { cycleTimeRepository } from '../repositories/cycle-time.repository';
import { latheRepository } from '../repositories/lathe.repository';
import { materialRepository } from '../repositories/material.repository';
import { CalculationEngineFactory } from '../calculation-engine/engine.factory';
import {
  CycleTimeResultDto,
  OperationCycleTimeDetailDto,
  toCycleTimeResultDto,
} from '../types/cycle-time';
import { LatheCycleTimeSummaryDto, MachineDto } from '../types/lathe';

export class CalculationService {
  /**
   * 使用可能設備一覧取得 (GET /api/machines)
   */
  async getAllMachines(): Promise<MachineDto[]> {
    const rows = await latheRepository.findAllMachines();
    return rows.map((r) => ({
      id: Number(r.id),
      machineType: r.machine_type,
      calculationEngineType: r.calculation_engine_type || 'AUTOMATIC_LATHE',
      machineName: r.machine_name,
      maker: r.maker,
      model: r.model,
      maxRpm: Number(r.max_rpm),
      maxBarDiameter: r.max_bar_diameter !== null && r.max_bar_diameter !== undefined ? Number(r.max_bar_diameter) : null,
      maxMachiningLength: r.max_machining_length !== null && r.max_machining_length !== undefined ? Number(r.max_machining_length) : null,
      hasSubSpindle: r.has_sub_spindle !== null && r.has_sub_spindle !== undefined ? Boolean(r.has_sub_spindle) : null,
      maxTools: r.max_tools !== null && r.max_tools !== undefined ? Number(r.max_tools) : null,
      specialOptions: r.special_options || null,
    }));
  }

  /**
   * 案件への加工機設定 (POST /api/quotes/:id/machine)
   */
  async setQuoteMachine(quoteId: number, machineId: number): Promise<MachineDto> {
    const quote = await quoteRepository.findById(quoteId);
    if (!quote) {
      throw new Error('QUOTE_NOT_FOUND');
    }

    const machine = await latheRepository.findMachineById(machineId);
    if (!machine) {
      throw new Error('MACHINE_NOT_FOUND');
    }

    await latheRepository.setQuoteMachine(quoteId, machineId);

    return {
      id: Number(machine.id),
      machineType: machine.machine_type,
      calculationEngineType: machine.calculation_engine_type || 'AUTOMATIC_LATHE',
      machineName: machine.machine_name,
      maker: machine.maker,
      model: machine.model,
      maxRpm: Number(machine.max_rpm),
      maxBarDiameter: machine.max_bar_diameter !== null && machine.max_bar_diameter !== undefined ? Number(machine.max_bar_diameter) : null,
      maxMachiningLength: machine.max_machining_length !== null && machine.max_machining_length !== undefined ? Number(machine.max_machining_length) : null,
      hasSubSpindle: machine.has_sub_spindle !== null && machine.has_sub_spindle !== undefined ? Boolean(machine.has_sub_spindle) : null,
      maxTools: machine.max_tools !== null && machine.max_tools !== undefined ? Number(machine.max_tools) : null,
      specialOptions: machine.special_options || null,
    };
  }

  /**
   * 案件に現在設定されている加工機取得
   */
  async getQuoteMachine(quoteId: number): Promise<MachineDto | null> {
    const quote = await quoteRepository.findById(quoteId);
    if (!quote) {
      throw new Error('QUOTE_NOT_FOUND');
    }

    const machine = await latheRepository.getQuoteSelectedMachine(quoteId);
    if (!machine) return null;

    return {
      id: Number(machine.id),
      machineType: machine.machine_type,
      calculationEngineType: machine.calculation_engine_type || 'AUTOMATIC_LATHE',
      machineName: machine.machine_name,
      maker: machine.maker,
      model: machine.model,
      maxRpm: Number(machine.max_rpm),
      maxBarDiameter: machine.max_bar_diameter !== null && machine.max_bar_diameter !== undefined ? Number(machine.max_bar_diameter) : null,
      maxMachiningLength: machine.max_machining_length !== null && machine.max_machining_length !== undefined ? Number(machine.max_machining_length) : null,
      hasSubSpindle: machine.has_sub_spindle !== null && machine.has_sub_spindle !== undefined ? Boolean(machine.has_sub_spindle) : null,
      maxTools: machine.max_tools !== null && machine.max_tools !== undefined ? Number(machine.max_tools) : null,
      specialOptions: machine.special_options || null,
    };
  }

  /**
   * 案件のサイクルタイム計算 (POST /api/quotes/:id/cycle-time/calculate)
   * 設備とEngine判定に基づき各専用Engineを実行
   */
  async calculateCycleTime(
    quoteId: number,
    options?: { maxRpm?: number; machiningMode?: 'SIMULTANEOUS' | 'SEQUENTIAL' }
  ): Promise<LatheCycleTimeSummaryDto | CycleTimeResultDto> {
    // 1. 案件取得
    const quote = await quoteRepository.findById(quoteId);
    if (!quote) {
      throw new Error('QUOTE_NOT_FOUND');
    }

    // 2. 材質取得
    let materialName = 'DEFAULT';
    const drawings = await drawingRepository.findByQuoteId(quoteId);
    for (const d of drawings) {
      const a = await drawingAnalysisRepository.findLatestByDrawingId(d.id);
      if (a && a.material) {
        materialName = a.material;
        break;
      }
    }

    if (materialName === 'DEFAULT') {
      const matInfo = await materialRepository.findByQuoteId(quoteId);
      if (matInfo && matInfo.material_name) {
        materialName = matInfo.material_name;
      }
    }

    // 3. 設備取得
    const machine = await latheRepository.getQuoteSelectedMachine(quoteId);
    const engineType = machine?.calculation_engine_type || 'AUTOMATIC_LATHE';

    // 4. 計算Engine取得
    const engine = CalculationEngineFactory.getEngine(engineType);

    // 主軸上限RPMの決定（ユーザー指定があれば優先、無ければ設備マスタ値）
    const effectiveMaxRpm =
      options?.maxRpm && options.maxRpm > 0
        ? options.maxRpm
        : machine
        ? Number(machine.max_rpm)
        : 10000;

    // 5. Engine実行
    const result = await engine.calculate({
      quoteId,
      materialName,
      quantity: quote.quantity > 0 ? quote.quantity : 1,
      machineId: machine ? Number(machine.id) : 1,
      machineName: machine ? machine.machine_name : 'Cincom L20',
      machineType: machine ? machine.machine_type : 'NC_AUTOMATIC_LATHE',
      maxRpm: effectiveMaxRpm,
      machiningMode: options?.machiningMode,
    });

    // 6. cycle_time_results テーブルへ保存 (既存結果は上書き)
    await cycleTimeRepository.deleteByQuoteId(quoteId);
    await cycleTimeRepository.create({
      quoteId,
      cuttingTimeSec: result.cuttingTimeSec,
      nonCuttingTimeSec: result.nonCuttingTimeSec,
      totalCycleTimeSec: result.totalTimeSec,
      theoreticalCycleTime: result.theoreticalCycleTime ?? result.totalTimeSec,
      correctionFactor: result.correctionFactor ?? 1.0,
      correctedCycleTime: result.correctedCycleTime ?? result.totalTimeSec,
      correctionSource: result.correctionSource ?? null,
      correctionApplied: result.correctionApplied ?? false,
      quantity: quote.quantity > 0 ? quote.quantity : 1,
      totalLotTimeSec: result.totalLotTimeSec,
      calculationVersion: '3.0.0-PHASE16',
    });

    return {
      quoteId,
      machineName: machine?.machine_name || 'Cincom L20',
      calculationEngineType: engineType,
      materialName,
      quantity: quote.quantity > 0 ? quote.quantity : 1,
      cuttingTimeSec: result.cuttingTimeSec,
      nonCuttingTimeSec: result.nonCuttingTimeSec,
      totalCycleTimeSec: result.totalTimeSec,
      totalLotTimeSec: result.totalLotTimeSec,
      theoreticalCycleTime: result.theoreticalCycleTime,
      correctionFactor: result.correctionFactor,
      correctedCycleTime: result.correctedCycleTime,
      correctionSource: result.correctionSource,
      correctionApplied: result.correctionApplied,
      confidenceLevel: result.confidenceLevel,
      correctionReason: result.correctionReason,
      machiningMode: result.machiningMode,
      frontCuttingTimeSec: result.frontCuttingTimeSec,
      backCuttingTimeSec: result.backCuttingTimeSec,
      cutoffCuttingTimeSec: result.cutoffCuttingTimeSec,
      frontTotalTimeSec: result.frontTotalTimeSec,
      backTotalTimeSec: result.backTotalTimeSec,
      cutoffTotalTimeSec: result.cutoffTotalTimeSec,
      dominantSide: result.dominantSide,
      savedTimeSec: result.savedTimeSec,
      operations: result.operationDetails,
    };
  }
}

export const calculationService = new CalculationService();
