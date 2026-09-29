import { quoteRepository } from '../repositories/quote.repository';
import { operationRepository } from '../repositories/operation.repository';
import { drawingRepository } from '../repositories/drawing.repository';
import { drawingAnalysisRepository } from '../repositories/drawing-analysis.repository';
import { cycleTimeRepository } from '../repositories/cycle-time.repository';
import {
  CycleTimeResultDto,
  OperationCycleTimeDetailDto,
  toCycleTimeResultDto,
} from '../types/cycle-time';
import { OperationRow } from '../types/operation';

export class CycleTimeService {
  // 1工程あたりの標準非切削時間（工具交換、早送り、アプローチ・リトラクト、主軸加減速等: 秒）
  private readonly DEFAULT_OPERATION_NON_CUTTING_SEC = 5.0;

  /**
   * 案件IDに対するサイクルタイムを算出・保存
   */
  async calculateCycleTime(quoteId: number): Promise<CycleTimeResultDto> {
    // 1. 案件確認
    const quote = await quoteRepository.findById(quoteId);
    if (!quote) {
      throw new Error('QUOTE_NOT_FOUND');
    }

    // 2. 工程確認
    const operations = await operationRepository.findByQuoteId(quoteId);
    if (operations.length === 0) {
      throw new Error('NO_OPERATION_DATA');
    }

    // 3. 材質確認（図面解析レコード優先、無ければデフォルト）
    let materialName = 'DEFAULT';
    const drawings = await drawingRepository.findByQuoteId(quoteId);
    for (const d of drawings) {
      const analysis = await drawingAnalysisRepository.findLatestByDrawingId(d.id);
      if (analysis && analysis.material) {
        materialName = analysis.material;
        break;
      }
    }

    // 4. 各工程の切削時間計算
    let totalCuttingSec = 0;
    let totalNonCuttingSec = 0;
    const operationDetails: OperationCycleTimeDetailDto[] = [];

    for (const op of operations) {
      const calcResult = await this.calculateOperationTime(op, materialName);

      // operations テーブルの計算フィールドを更新
      await cycleTimeRepository.updateOperationCalculation(op.id, {
        standardConditionId: calcResult.standardConditionId,
        vc: calcResult.vc,
        feedPerRev: calcResult.feedPerRev,
        ap: calcResult.ap,
        rpm: calcResult.rpm,
        feedRate: calcResult.feedRate,
        cuttingTimeSec: calcResult.cuttingTimeSec,
        nonCuttingTimeSec: calcResult.nonCuttingTimeSec,
        totalTimeSec: calcResult.totalTimeSec,
      });

      totalCuttingSec += calcResult.cuttingTimeSec;
      totalNonCuttingSec += calcResult.nonCuttingTimeSec;

      operationDetails.push({
        operationId: op.id,
        sequenceNo: op.sequence_no,
        operationType: op.operation_type,
        description: op.mode || op.operation_type,
        workDiameter: Number(op.work_diameter),
        cuttingLength: Number(op.cutting_length),
        vc: calcResult.vc,
        feedPerRev: calcResult.feedPerRev,
        rpm: calcResult.rpm,
        feedRate: calcResult.feedRate,
        cuttingTimeSec: calcResult.cuttingTimeSec,
        nonCuttingTimeSec: calcResult.nonCuttingTimeSec,
        totalTimeSec: calcResult.totalTimeSec,
        conditionSource: calcResult.conditionSource,
      });
    }

    // 小数第3位四捨五入
    const cuttingTimeSec = Math.round(totalCuttingSec * 1000) / 1000;
    const nonCuttingTimeSec = Math.round(totalNonCuttingSec * 1000) / 1000;
    const totalCycleTimeSec = Math.round((cuttingTimeSec + nonCuttingTimeSec) * 1000) / 1000;
    const quantity = quote.quantity > 0 ? quote.quantity : 1;
    const totalLotTimeSec = Math.round(totalCycleTimeSec * quantity * 1000) / 1000;

    // 5. 既存計算結果を削除して新規登録（再計算対応）
    await cycleTimeRepository.deleteByQuoteId(quoteId);

    const resultId = await cycleTimeRepository.create({
      quoteId,
      cuttingTimeSec,
      nonCuttingTimeSec,
      totalCycleTimeSec,
      quantity,
      totalLotTimeSec,
      calculationVersion: '1.0.0',
    });

    const savedRow = await cycleTimeRepository.findByQuoteId(quoteId);
    if (!savedRow) {
      throw new Error('CALCULATION_FAILED');
    }

    return toCycleTimeResultDto(savedRow, operationDetails);
  }

  /**
   * 案件IDに対する計算結果を取得
   */
  async getCycleTime(quoteId: number): Promise<CycleTimeResultDto | null> {
    const quote = await quoteRepository.findById(quoteId);
    if (!quote) {
      throw new Error('QUOTE_NOT_FOUND');
    }

    const savedRow = await cycleTimeRepository.findByQuoteId(quoteId);
    if (!savedRow) {
      return null;
    }

    // 各工程の最新状態を取得して明細を構築
    const operations = await operationRepository.findByQuoteId(quoteId);
    const operationDetails: OperationCycleTimeDetailDto[] = operations.map((op) => ({
      operationId: op.id,
      sequenceNo: op.sequence_no,
      operationType: op.operation_type,
      description: op.mode || op.operation_type,
      workDiameter: Number(op.work_diameter),
      cuttingLength: Number(op.cutting_length),
      vc: Number(op.vc),
      feedPerRev: Number(op.feed_per_rev || 0),
      rpm: Number(op.rpm),
      feedRate: Number(op.feed_rate),
      cuttingTimeSec: Number(op.cutting_time_sec),
      nonCuttingTimeSec: Number(op.non_cutting_time_sec),
      totalTimeSec: Number(op.total_time_sec),
      conditionSource: op.condition_source,
    }));

    return toCycleTimeResultDto(savedRow, operationDetails);
  }

  /**
   * 単一工程の加工時間計算ロジック
   */
  private async calculateOperationTime(
    op: OperationRow,
    materialName: string
  ): Promise<{
    standardConditionId: number | null;
    vc: number;
    feedPerRev: number;
    ap: number | null;
    rpm: number;
    feedRate: number;
    cuttingTimeSec: number;
    nonCuttingTimeSec: number;
    totalTimeSec: number;
    conditionSource: string;
  }> {
    const opType = op.operation_type.toUpperCase();
    const cond = await cycleTimeRepository.findCuttingCondition(materialName, opType);

    if (!cond) {
      throw new Error('CONDITION_NOT_FOUND');
    }

    const vc = Number(cond.vc);
    const feedPerRev = Number(cond.feed_per_rev || 0.15);
    const ap = cond.ap !== null ? Number(cond.ap) : null;
    const diameter = Number(op.work_diameter) > 0 ? Number(op.work_diameter) : 20.0;
    const length = Number(op.cutting_length) > 0 ? Number(op.cutting_length) : 10.0;

    // 回転数計算: RPM = (Vc * 1000) / (π * D)
    let rpm = (vc * 1000) / (Math.PI * diameter);
    // 機械上限クリップ (例: 5000rpm)
    if (rpm > 5000) rpm = 5000;
    if (rpm < 50) rpm = 50;
    rpm = Math.round(rpm * 100) / 100;

    // 送り速度: F = RPM * f (mm/min)
    let feedRate = rpm * feedPerRev;
    if (feedRate <= 0) feedRate = 50.0;
    feedRate = Math.round(feedRate * 100) / 100;

    let cuttingTimeSec = 0;
    const nonCuttingTimeSec = this.DEFAULT_OPERATION_NON_CUTTING_SEC;

    // 各加工種類に応じた計算
    switch (opType) {
      case 'OD':
      case 'ID': {
        // 加工時間 = (加工長 / 送り速度) * 60秒
        // 荒加工パス数を考慮 (デフォルト1パス)
        const passes = op.passes > 0 ? op.passes : 1;
        cuttingTimeSec = (length / feedRate) * 60 * passes;
        break;
      }

      case 'DRILL': {
        // 穴加工: 穴深さ / 送り速度 * 60秒
        cuttingTimeSec = (length / feedRate) * 60;
        break;
      }

      case 'FACE': {
        // 端面加工: 半径方向切削距離 = D / 2
        const faceDistance = diameter / 2;
        cuttingTimeSec = (faceDistance / feedRate) * 60;
        break;
      }

      case 'THREAD': {
        // ねじ加工: (ねじ長 / (RPM * ピッチ)) * 60 * パス数(標準約6パス) + アプローチ余裕
        const pitch = feedPerRev > 0 ? feedPerRev : 1.5;
        const threadFeed = rpm * pitch;
        const passes = 6;
        cuttingTimeSec = (length / threadFeed) * 60 * passes + 2.0;
        break;
      }

      case 'GROOVE': {
        // 溝加工: 突っ切り・溝入れ 標準時間方式
        // 溝深さ / 送り速度 * 60
        const grooveDepth = length > 0 ? length : 5.0;
        cuttingTimeSec = (grooveDepth / feedRate) * 60 + 3.0;
        break;
      }

      case 'CHAMFER': {
        // 面取り: 固定時間方式（標準3秒）
        cuttingTimeSec = 3.0;
        break;
      }

      default: {
        // その他の加工
        cuttingTimeSec = (length / feedRate) * 60;
        break;
      }
    }

    cuttingTimeSec = Math.round(cuttingTimeSec * 1000) / 1000;
    const totalTimeSec = Math.round((cuttingTimeSec + nonCuttingTimeSec) * 1000) / 1000;

    return {
      standardConditionId: cond.id,
      vc,
      feedPerRev,
      ap,
      rpm,
      feedRate,
      cuttingTimeSec,
      nonCuttingTimeSec,
      totalTimeSec,
      conditionSource: 'STANDARD',
    };
  }
}

export const cycleTimeService = new CycleTimeService();
