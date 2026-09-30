import { actualCycleTimeRepository } from '../repositories/actual-cycle-time.repository';
import { cycleTimeRepository } from '../repositories/cycle-time.repository';
import { quoteRepository } from '../repositories/quote.repository';
import { latheRepository } from '../repositories/lathe.repository';
import {
  ActualCycleTimeDto,
  CycleTimeComparisonDto,
  toActualCycleTimeDto,
} from '../types/actual-cycle-time';
import { CreateActualCycleTimeDto } from '../schemas/actual-cycle-time.schema';

export class ActualCycleTimeService {
  /**
   * 実績登録 (POST /api/quotes/:id/actual-cycle-times)
   */
  async createActualCycleTime(
    quoteId: number,
    data: CreateActualCycleTimeDto
  ): Promise<ActualCycleTimeDto> {
    const quote = await quoteRepository.findById(quoteId);
    if (!quote) {
      throw new Error('QUOTE_NOT_FOUND');
    }

    // サイクルタイム最新結果取得 (紐付け用)
    const latestCt = await cycleTimeRepository.findByQuoteId(quoteId);

    // 加工機IDが明示されていない場合は案件の選択中加工機を補完
    let machineId = data.machineId ?? null;
    if (!machineId) {
      const selectedMachine = await latheRepository.getQuoteSelectedMachine(quoteId);
      if (selectedMachine) {
        machineId = Number(selectedMachine.id);
      }
    }

    const created = await actualCycleTimeRepository.create({
      quoteId,
      machineId,
      productionDate: data.productionDate ?? null,
      quantity: data.quantity,
      cycleTimeResultId: latestCt ? Number(latestCt.id) : null,
      actualCycleTimeSec: data.actualCycleTimeSec,
      setupTimeSec: data.setupTimeSec ?? 0.0,
      operatorName: data.operatorName ?? null,
      status: 'COMPLETED',
      notes: data.notes ?? null,
    });

    return toActualCycleTimeDto(created);
  }

  /**
   * 実績一覧取得 (GET /api/quotes/:id/actual-cycle-times)
   */
  async getActualCycleTimes(quoteId: number): Promise<ActualCycleTimeDto[]> {
    const quote = await quoteRepository.findById(quoteId);
    if (!quote) {
      throw new Error('QUOTE_NOT_FOUND');
    }

    const rows = await actualCycleTimeRepository.findByQuoteId(quoteId);
    return rows.map(toActualCycleTimeDto);
  }

  /**
   * 差異比較情報取得 (GET /api/quotes/:id/cycle-time-comparison)
   */
  async getCycleTimeComparison(quoteId: number): Promise<CycleTimeComparisonDto> {
    const quote = await quoteRepository.findById(quoteId);
    if (!quote) {
      throw new Error('QUOTE_NOT_FOUND');
    }

    // 見積CT取得
    const latestCt = await cycleTimeRepository.findByQuoteId(quoteId);
    if (!latestCt) {
      throw new Error('ESTIMATE_NOT_FOUND');
    }
    const estimateSec = Number(latestCt.total_cycle_time_sec);

    // 使用加工機取得
    const selectedMachine = await latheRepository.getQuoteSelectedMachine(quoteId);
    const machineName = selectedMachine ? selectedMachine.machine_name : '未設定';

    // 実績集計取得
    const summary = await actualCycleTimeRepository.getSummaryByQuoteId(quoteId);
    if (!summary || summary.recordCount === 0) {
      throw new Error('NO_ACTUAL_DATA');
    }

    // 加重平均実績CT（各ロットの数量を加味した1個あたり平均秒）
    const actualSec = Math.round(summary.weightedAvgSec * 1000) / 1000;

    // 差異秒: 実績CT - 見積CT
    const differenceSec = Math.round((actualSec - estimateSec) * 1000) / 1000;

    // 差異率: ((実績CT - 見積CT) / 見積CT) * 100
    let differenceRate = 0;
    if (estimateSec > 0) {
      differenceRate = Math.round(((actualSec - estimateSec) / estimateSec) * 1000) / 10;
    }

    // 最新加工日文字列整形 (YYYY-MM-DD)
    let latestActualDate: string | null = null;
    if (summary.latestDate) {
      const d = new Date(summary.latestDate);
      if (!isNaN(d.getTime())) {
        latestActualDate = d.toISOString().split('T')[0];
      } else {
        latestActualDate = String(summary.latestDate).split('T')[0];
      }
    }

    return {
      quoteId,
      machineName,
      estimateSec,
      actualSec,
      differenceSec,
      differenceRate,
      actualCount: summary.recordCount,
      latestActualDate,
    };
  }

  /**
   * 実績削除 (DELETE /api/actual-cycle-times/:id)
   */
  async deleteActualCycleTime(id: number): Promise<void> {
    const existing = await actualCycleTimeRepository.findById(id);
    if (!existing) {
      throw new Error('ACTUAL_NOT_FOUND');
    }
    await actualCycleTimeRepository.delete(id);
  }
}

export const actualCycleTimeService = new ActualCycleTimeService();
