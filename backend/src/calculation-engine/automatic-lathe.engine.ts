import { latheRepository } from '../repositories/lathe.repository';
import { toAutomaticLatheOperationDto } from '../types/lathe';
import {
  CalculationEngineInput,
  CalculationEngineOutput,
  ICalculationEngine,
} from './engine.interface';

export class AutomaticLatheEngine implements ICalculationEngine {
  readonly engineType = 'AUTOMATIC_LATHE';

  async calculate(input: CalculationEngineInput): Promise<CalculationEngineOutput> {
    const { quoteId, materialName, quantity, maxRpm } = input;

    const operations = await latheRepository.findOperationsByQuoteId(quoteId);
    if (operations.length === 0) {
      throw new Error('NO_OPERATION_DATA');
    }

    // 非切削時間マスタ取得
    const machineTimes = await latheRepository.findMachineTimes('NC_AUTOMATIC_LATHE');
    const timeMap = new Map<string, number>();
    machineTimes.forEach(t => timeMap.set(t.parameter_name, Number(t.time_sec)));

    const toolChangeTime = timeMap.get('TOOL_CHANGE') ?? 1.5;
    const idlingTime = timeMap.get('IDLING') ?? 2.0;
    const materialFeedTime = timeMap.get('MATERIAL_FEED') ?? 2.5;
    const partPickupTime = timeMap.get('PART_PICKUP') ?? 2.0;

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

      switch (op.calculation_type) {
        case 'FEED_TURNING':
          // 外径・内径: L / F * 60 * 繰返し
          cuttingTimeSec = (length / feedRate) * 60 * repeats;
          break;

        case 'FEED_FACE':
          // 端面: (D / 2) / F * 60
          cuttingTimeSec = ((diameter / 2) / feedRate) * 60;
          break;

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
          // 突切り: (D / 2) / F * 60 + 1秒
          cuttingTimeSec = ((diameter / 2) / feedRate) * 60 + 1.0;
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
    const totalTimeSec = Math.round((cuttingTimeSec + nonCuttingTimeSec) * 1000) / 1000;
    const totalLotTimeSec = Math.round(totalTimeSec * (quantity > 0 ? quantity : 1) * 1000) / 1000;

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
      totalTimeSec,
      totalLotTimeSec,
      operationDetails,
    };
  }
}

export const automaticLatheEngine = new AutomaticLatheEngine();
