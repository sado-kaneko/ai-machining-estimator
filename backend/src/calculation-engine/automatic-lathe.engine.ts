import { latheRepository } from '../repositories/lathe.repository';
import { materialRepository } from '../repositories/material.repository';
import { toAutomaticLatheOperationDto } from '../types/lathe';
import {
  CalculationEngineInput,
  CalculationEngineOutput,
  ICalculationEngine,
} from './engine.interface';
import { correctionService } from '../services/correction.service';

export class AutomaticLatheEngine implements ICalculationEngine {
  readonly engineType = 'AUTOMATIC_LATHE';

  /**
   * 材質名正規化 (S45C, SS400, SUS304, A6061, DEFAULT)
   */
  private normalizeMaterial(rawMaterial: string | null | undefined): string {
    if (!rawMaterial) return 'S45C';
    const mat = rawMaterial.trim().toUpperCase();
    if (mat.includes('SUS') || mat.includes('STAINLESS') || mat.includes('ステンレス')) {
      return 'SUS304';
    }
    if (mat.includes('A6061') || mat.includes('A5052') || mat.includes('A2017') || mat.includes('AL') || mat.includes('アルミ')) {
      return 'A6061';
    }
    if (mat.includes('C3604') || mat.includes('BRASS') || mat.includes('黄銅') || mat.includes('真鍮')) {
      return 'A6061';
    }
    if (mat.includes('SS400') || mat.includes('SS41')) {
      return 'SS400';
    }
    if (mat.includes('S45C') || mat.includes('S50C') || mat.includes('STEEL') || mat.includes('鉄') || mat.includes('鋼')) {
      return 'S45C';
    }
    return 'DEFAULT';
  }

  async calculate(input: CalculationEngineInput): Promise<CalculationEngineOutput> {
    const { quoteId, materialName, quantity, maxRpm, machiningMode: inputMode } = input;

    const operations = await latheRepository.findOperationsByQuoteId(quoteId);
    if (operations.length === 0) {
      throw new Error('NO_OPERATION_DATA');
    }

    if (inputMode) {
      await latheRepository.saveMachiningMode(quoteId, inputMode);
    }
    const effectiveMachiningMode = inputMode || (await latheRepository.getMachiningMode(quoteId));
    const normalizedMaterial = this.normalizeMaterial(materialName);

    // 素材情報取得 (PHASE11/12)
    const materialInfo = await materialRepository.findByQuoteId(quoteId);
    const stockDiameter = materialInfo?.diameter ? Number(materialInfo.diameter) : null;

    // 非切削時間マスタ取得 (PHASE12 automatic_lathe_time_master 優先、無ければ既存テーブル)
    const timeMaster = await latheRepository.findAutomaticLatheTimeMaster('NC_AUTOMATIC_LATHE');
    let toolChangeTime = 1.5;
    let idlingTime = 2.0;
    let materialFeedTime = 2.5;
    let partPickupTime = 2.0;
    let spindleAccDecTime = 1.0;

    if (timeMaster) {
      toolChangeTime = Number(timeMaster.tool_change_time_sec);
      idlingTime = Number(timeMaster.idle_time_sec);
      materialFeedTime = Number(timeMaster.material_feed_time_sec);
      partPickupTime = Number(timeMaster.pickup_time_sec);
      spindleAccDecTime = Number(timeMaster.spindle_acc_dec_time_sec);
    } else {
      const machineTimes = await latheRepository.findMachineTimes('NC_AUTOMATIC_LATHE');
      const timeMap = new Map<string, number>();
      machineTimes.forEach(t => timeMap.set(t.parameter_name, Number(t.time_sec)));
      toolChangeTime = timeMap.get('TOOL_CHANGE') ?? 1.5;
      idlingTime = timeMap.get('IDLING') ?? 2.0;
      materialFeedTime = timeMap.get('MATERIAL_FEED') ?? 2.5;
      partPickupTime = timeMap.get('PART_PICKUP') ?? 2.0;
    }

    let frontCuttingSec = 0;
    let frontNonCuttingSec = 0;
    let cutoffCuttingSec = 0;
    let cutoffNonCuttingSec = 0;
    let backCuttingSec = 0;
    let backNonCuttingSec = 0;

    // 各工程の切削時間・非切削時間計算
    for (const op of operations) {
      const cond = await latheRepository.findCondition(normalizedMaterial, op.process_id);
      if (!cond) {
        throw new Error('CONDITION_NOT_FOUND');
      }

      const vc = Number(cond.vc);
      const feed = Number(cond.feed);
      const diameter = Number(op.diameter) > 0 ? Number(op.diameter) : 20.0;
      const length = Number(op.machining_length) > 0 ? Number(op.machining_length) : 10.0;
      const repeats = op.repeat_count > 0 ? op.repeat_count : 1;

      // 回転数 N = Vc * 1000 / (π * D)
      let rpm = (vc * 1000) / (Math.PI * diameter);
      if (maxRpm && rpm > maxRpm) rpm = maxRpm;
      if (rpm < 100) rpm = 100;
      rpm = Math.round(rpm);

      // 送り速度 F = N * f (粗加工送り)
      let feedRate = rpm * feed;
      if (feedRate <= 0) feedRate = 50.0;

      // 仕上げ送り
      const finishFeed = feed * 0.6;
      let finishFeedRate = rpm * finishFeed;
      if (finishFeedRate <= 0) finishFeedRate = 30.0;

      const ap = cond.ap && Number(cond.ap) > 0 ? Number(cond.ap) : 1.5;

      let cuttingTimeSec = 0;
      const opNonCuttingSec = toolChangeTime + 1.0;

      switch (op.calculation_type) {
        case 'FEED_TURNING': {
          let totalStockRadius = 0;
          if (stockDiameter && stockDiameter > diameter) {
            totalStockRadius = (stockDiameter - diameter) / 2;
          } else {
            totalStockRadius = Math.max(ap * 1.2, 1.0);
          }

          const finishAllowance = 0.2;
          const roughStockRadius = Math.max(0, totalStockRadius - finishAllowance);
          const roughPasses = Math.max(1, Math.ceil(roughStockRadius / ap));
          const finishPasses = 1;

          const roughTime = (length / feedRate) * 60 * roughPasses;
          const finishTime = (length / finishFeedRate) * 60 * finishPasses;
          const retractTime = (roughPasses - 1) * 0.6;

          cuttingTimeSec = (roughTime + finishTime + retractTime) * repeats;
          break;
        }

        case 'FEED_FACE': {
          const faceDiam = (stockDiameter && stockDiameter > 0) ? stockDiameter : diameter;
          const faceRadius = faceDiam / 2;
          const roughFaceTime = (faceRadius / feedRate) * 60;
          const finishFaceTime = (faceRadius / finishFeedRate) * 60;
          cuttingTimeSec = roughFaceTime + finishFaceTime;
          break;
        }

        case 'FEED_DRILL':
        case 'FEED_REAMER': {
          const drillDepth = Number(op.depth) > 0 ? Number(op.depth) : length;
          cuttingTimeSec = (drillDepth / feedRate) * 60;
          break;
        }

        case 'FEED_TAP': {
          const tapPitch = feed > 0 ? feed : 1.25;
          const tapDepth = Number(op.depth) > 0 ? Number(op.depth) : length;
          cuttingTimeSec = ((tapDepth / (rpm * tapPitch)) * 60) * 2 + 1.0;
          break;
        }

        case 'THREAD': {
          const pitch = feed > 0 ? feed : 1.5;
          cuttingTimeSec = ((length / (rpm * pitch)) * 60) * 6 + 2.0;
          break;
        }

        case 'GROOVE': {
          const grooveDepth = Number(op.depth) > 0 ? Number(op.depth) : 3.0;
          cuttingTimeSec = (grooveDepth / feedRate) * 60 + 2.0;
          break;
        }

        case 'CUTOFF': {
          const cutoffDiam = (stockDiameter && stockDiameter > 0) ? stockDiameter : diameter;
          cuttingTimeSec = ((cutoffDiam / 2) / feedRate) * 60 + 1.0;
          break;
        }

        case 'BACK_MACHINING': {
          cuttingTimeSec = 4.0;
          break;
        }

        case 'CHAMFER': {
          cuttingTimeSec = 1.5;
          break;
        }

        default: {
          cuttingTimeSec = (length / feedRate) * 60;
          break;
        }
      }

      cuttingTimeSec = Math.round(cuttingTimeSec * 1000) / 1000;
      const opTotalTimeSec = Math.round((cuttingTimeSec + opNonCuttingSec) * 1000) / 1000;

      await latheRepository.updateOperationCalculation(op.id, {
        feed,
        vc,
        cuttingTimeSec,
        nonCuttingTimeSec: opNonCuttingSec,
        totalTimeSec: opTotalTimeSec,
      });

      const side = (op.machining_side as 'FRONT' | 'CUTOFF' | 'BACK') || 'FRONT';
      if (side === 'CUTOFF' || op.process_name === '突切り') {
        cutoffCuttingSec += cuttingTimeSec;
        cutoffNonCuttingSec += opNonCuttingSec;
      } else if (side === 'BACK' || op.process_name.includes('背面')) {
        backCuttingSec += cuttingTimeSec;
        backNonCuttingSec += opNonCuttingSec;
      } else {
        frontCuttingSec += cuttingTimeSec;
        frontNonCuttingSec += opNonCuttingSec;
      }
    }

    const globalFixedNonCutting = materialFeedTime + partPickupTime + idlingTime;

    const frontTotalSec = Math.round((frontCuttingSec + frontNonCuttingSec) * 1000) / 1000;
    const cutoffTotalSec = Math.round((cutoffCuttingSec + cutoffNonCuttingSec) * 1000) / 1000;
    const backTotalSec = Math.round((backCuttingSec + backNonCuttingSec) * 1000) / 1000;

    let dominantSide: 'FRONT' | 'BACK' | undefined = undefined;
    let savedTimeSec = 0;
    let totalCuttingSec = 0;
    let totalNonCuttingSec = 0;

    if (effectiveMachiningMode === 'SIMULTANEOUS') {
      dominantSide = frontTotalSec >= backTotalSec ? 'FRONT' : 'BACK';
      savedTimeSec = Math.round(Math.min(frontTotalSec, backTotalSec) * 1000) / 1000;
      totalCuttingSec = Math.max(frontCuttingSec, backCuttingSec) + cutoffCuttingSec;
      totalNonCuttingSec = Math.max(frontNonCuttingSec, backNonCuttingSec) + cutoffNonCuttingSec + globalFixedNonCutting;
    } else {
      dominantSide = undefined;
      savedTimeSec = 0;
      totalCuttingSec = frontCuttingSec + cutoffCuttingSec + backCuttingSec;
      totalNonCuttingSec = frontNonCuttingSec + cutoffNonCuttingSec + backNonCuttingSec + globalFixedNonCutting;
    }

    const cuttingTimeSec = Math.round(totalCuttingSec * 1000) / 1000;
    const nonCuttingTimeSec = Math.round(totalNonCuttingSec * 1000) / 1000;
    const theoreticalCycleTime = Math.round((cuttingTimeSec + nonCuttingTimeSec) * 1000) / 1000;

    // PHASE16: 実績フィードバック補正係数取得・判定
    const correctionDecision = await correctionService.resolveCorrection(
      input.machineId,
      input.materialName,
      theoreticalCycleTime,
      quoteId
    );

    const correctedCycleTime = correctionDecision.applied
      ? Math.round(theoreticalCycleTime * correctionDecision.factor * 1000) / 1000
      : theoreticalCycleTime;

    const finalTotalTimeSec = correctedCycleTime;
    const finalTotalLotTimeSec = Math.round(finalTotalTimeSec * (quantity > 0 ? quantity : 1) * 1000) / 1000;

    // 最新状態を再取得
    const updatedRows = await latheRepository.findOperationsByQuoteId(quoteId);
    const operationDetails = updatedRows.map((r) => {
      let rpm = 0;
      if (Number(r.vc) > 0 && Number(r.diameter) > 0) {
        rpm = Math.round((Number(r.vc) * 1000) / (Math.PI * Number(r.diameter)));
      }
      return toAutomaticLatheOperationDto(r, r.process_name, r.process_category, rpm);
    });

    return {
      calculationEngineType: this.engineType,
      cuttingTimeSec,
      nonCuttingTimeSec,
      totalTimeSec: finalTotalTimeSec,
      totalLotTimeSec: finalTotalLotTimeSec,
      theoreticalCycleTime,
      correctionFactor: correctionDecision.factor,
      correctedCycleTime,
      correctionSource: correctionDecision.source,
      correctionApplied: correctionDecision.applied,
      confidenceLevel: correctionDecision.confidence,
      correctionReason: correctionDecision.reason,
      machiningMode: effectiveMachiningMode,
      frontCuttingTimeSec: Math.round(frontCuttingSec * 1000) / 1000,
      backCuttingTimeSec: Math.round(backCuttingSec * 1000) / 1000,
      cutoffCuttingTimeSec: Math.round(cutoffCuttingSec * 1000) / 1000,
      frontTotalTimeSec: frontTotalSec,
      backTotalTimeSec: backTotalSec,
      cutoffTotalTimeSec: cutoffTotalSec,
      dominantSide,
      savedTimeSec,
      operationDetails,
    };
  }
}

export const automaticLatheEngine = new AutomaticLatheEngine();
