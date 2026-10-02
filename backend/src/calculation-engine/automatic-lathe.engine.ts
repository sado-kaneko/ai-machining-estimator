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

  async calculate(input: CalculationEngineInput): Promise<CalculationEngineOutput> {
    const { quoteId, materialName, quantity, maxRpm } = input;

    const operations = await latheRepository.findOperationsByQuoteId(quoteId);
    if (operations.length === 0) {
      throw new Error('NO_OPERATION_DATA');
    }

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

    let totalCuttingSec = 0;
    let totalNonCuttingSec = 0;

    // 各工程の切削時間・非切削時間計算 (PHASE08計算式と100%同一)
    for (const op of operations) {
      const cond = await latheRepository.findCondition(materialName, op.process_id);
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
      if (rpm > maxRpm) rpm = maxRpm;
      if (rpm < 100) rpm = 100;
      rpm = Math.round(rpm);

      // 送り速度 F = N * f
      let feedRate = rpm * feed;
      if (feedRate <= 0) feedRate = 50.0;

      let cuttingTimeSec = 0;
      // 工程非切削時間（工具交換＋アプローチ）
      const opNonCuttingSec = toolChangeTime + 1.0;

      // 仕上げ送りの設定 (粗加工送りの約60%で面粗さ・精度を確保)
      const finishFeed = feed * 0.6;
      let finishFeedRate = rpm * finishFeed;
      if (finishFeedRate <= 0) finishFeedRate = 30.0;

      // 切込み深さ ap (マスタ設定値、無ければデフォルト1.5mm)
      const ap = cond.ap && Number(cond.ap) > 0 ? Number(cond.ap) : 1.5;

      switch (op.calculation_type) {
        case 'FEED_TURNING': {
          // 外径・内径加工: 粗加工（荒挽き）＋仕上げ加工（仕上げ挽き）
          // 1. 取り代の算出 (素材径と加工径の差から半径方向削り深さを求める)
          let totalStockRadius = 0;
          if (stockDiameter && stockDiameter > diameter) {
            totalStockRadius = (stockDiameter - diameter) / 2;
          } else {
            // 素材径未指定または同一の場合は標準最小取り代
            totalStockRadius = Math.max(ap * 1.2, 1.0);
          }

          // 仕上げ代 (半径 0.2mm)
          const finishAllowance = 0.2;
          const roughStockRadius = Math.max(0, totalStockRadius - finishAllowance);

          // 粗加工パス数 (切り込み量 ap に応じて算出、最低1パス)
          const roughPasses = Math.max(1, Math.ceil(roughStockRadius / ap));
          // 仕上げ加工パス数 (1パス)
          const finishPasses = 1;

          // 粗加工時間 (粗送り F = rpm * feed)
          const roughTime = (length / feedRate) * 60 * roughPasses;
          // 仕上げ加工時間 (仕上げ送り F_finish = rpm * finishFeed)
          const finishTime = (length / finishFeedRate) * 60 * finishPasses;
          // 粗加工パス間の戻り早送り時間 (各荒パス 0.6秒)
          const retractTime = (roughPasses - 1) * 0.6;

          cuttingTimeSec = (roughTime + finishTime + retractTime) * repeats;
          break;
        }

        case 'FEED_FACE': {
          // 端面加工: 端面粗削り（1パス）＋端面仕上げ削り（1パス）
          const faceDiam = (stockDiameter && stockDiameter > 0) ? stockDiameter : diameter;
          const faceRadius = faceDiam / 2;
          const roughFaceTime = (faceRadius / feedRate) * 60;
          const finishFaceTime = (faceRadius / finishFeedRate) * 60;
          cuttingTimeSec = roughFaceTime + finishFaceTime;
          break;
        }

        case 'FEED_DRILL':
        case 'FEED_REAMER':
          // 穴・リーマ: 深さ / F * 60
          const drillDepth = Number(op.depth) > 0 ? Number(op.depth) : length;
          cuttingTimeSec = (drillDepth / feedRate) * 60;
          break;

        case 'FEED_TAP':
          // タップ: (深さ / (N * ピッチ)) * 60 * 2 (正転・逆転) + 1.0
          const tapPitch = feed > 0 ? feed : 1.25;
          const tapDepth = Number(op.depth) > 0 ? Number(op.depth) : length;
          cuttingTimeSec = ((tapDepth / (rpm * tapPitch)) * 60) * 2 + 1.0;
          break;

        case 'THREAD':
          // ねじ: (L / (N * ピッチ)) * 60 * パス数(6) + 2.0
          const pitch = feed > 0 ? feed : 1.5;
          cuttingTimeSec = ((length / (rpm * pitch)) * 60) * 6 + 2.0;
          break;

        case 'GROOVE':
          // 溝: 深さ / F * 60 + ドウェル2秒
          const grooveDepth = Number(op.depth) > 0 ? Number(op.depth) : 3.0;
          cuttingTimeSec = (grooveDepth / feedRate) * 60 + 2.0;
          break;

        case 'CUTOFF':
          // 突切り: (D / 2) / F * 60 + 1秒 (素材径優先)
          const cutoffDiam = (stockDiameter && stockDiameter > 0) ? stockDiameter : diameter;
          cuttingTimeSec = ((cutoffDiam / 2) / feedRate) * 60 + 1.0;
          break;

        case 'BACK_MACHINING':
          // 背面加工: 固定5秒
          cuttingTimeSec = 5.0;
          break;

        case 'CHAMFER':
          // 面取り: 固定2秒
          cuttingTimeSec = 2.0;
          break;

        default:
          cuttingTimeSec = (length / feedRate) * 60;
          break;
      }

      cuttingTimeSec = Math.round(cuttingTimeSec * 1000) / 1000;
      const opTotalTimeSec = Math.round((cuttingTimeSec + opNonCuttingSec) * 1000) / 1000;

      // DBへ計算結果を保存
      await latheRepository.updateOperationCalculation(op.id, {
        feed,
        vc,
        cuttingTimeSec,
        nonCuttingTimeSec: opNonCuttingSec,
        totalTimeSec: opTotalTimeSec,
      });

      totalCuttingSec += cuttingTimeSec;
      totalNonCuttingSec += opNonCuttingSec;
    }

    // 機械全体の固定非切削時間（材料送り＋回収＋アイドル）を加算
    const globalFixedNonCutting = materialFeedTime + partPickupTime + idlingTime;
    totalNonCuttingSec += globalFixedNonCutting;

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
      operationDetails,
    };
  }
}

export const automaticLatheEngine = new AutomaticLatheEngine();
