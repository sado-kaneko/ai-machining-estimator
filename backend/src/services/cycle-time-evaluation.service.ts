import { cycleTimeEvaluationRepository } from '../repositories/cycle-time-evaluation.repository';
import { cycleTimeRepository } from '../repositories/cycle-time.repository';
import { latheRepository } from '../repositories/lathe.repository';
import { quoteRepository } from '../repositories/quote.repository';
import { drawingRepository } from '../repositories/drawing.repository';
import { drawingAnalysisRepository } from '../repositories/drawing-analysis.repository';
import { materialRepository } from '../repositories/material.repository';
import {
  CreateCycleTimeEvaluationRequest,
  CycleTimeEvaluationDto,
  CycleTimeEvaluationRow,
  LatheCorrectionFactorDto,
  LatheCorrectionFactorRow,
} from '../types/cycle-time-evaluation';

export class CycleTimeEvaluationService {
  /**
   * DB行をDTOに変換
   */
  private toEvaluationDto(row: CycleTimeEvaluationRow): CycleTimeEvaluationDto {
    return {
      id: row.id,
      quoteId: row.quote_id,
      machineId: row.machine_id,
      machineName: row.machine_name || '未設定',
      calculatedCycleTimeSec: Number(row.calculated_cycle_time_sec),
      excelCycleTimeSec: row.excel_cycle_time_sec !== null ? Number(row.excel_cycle_time_sec) : null,
      actualCycleTimeSec: row.actual_cycle_time_sec !== null ? Number(row.actual_cycle_time_sec) : null,
      excelDifferenceSec: row.excel_difference_sec !== null ? Number(row.excel_difference_sec) : null,
      excelDifferenceRate: row.excel_difference_rate !== null ? Number(row.excel_difference_rate) : null,
      actualDifferenceSec: row.actual_difference_sec !== null ? Number(row.actual_difference_sec) : null,
      actualDifferenceRate: row.actual_difference_rate !== null ? Number(row.actual_difference_rate) : null,
      evaluationStatus: row.evaluation_status,
      differenceCategory: row.difference_category,
      notes: row.notes,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    };
  }

  private toFactorDto(row: LatheCorrectionFactorRow): LatheCorrectionFactorDto {
    return {
      id: row.id,
      machineId: row.machine_id,
      machineName: row.machine_name || '未設定',
      materialName: row.material_name,
      processType: row.process_type,
      factor: Number(row.factor),
      sampleCount: row.sample_count,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : (row.updated_at ? String(row.updated_at) : null),
    };
  }

  /**
   * 評価レコード登録 (POST /api/quotes/:id/cycle-time-evaluations)
   */
  async createEvaluation(
    quoteId: number,
    data: CreateCycleTimeEvaluationRequest
  ): Promise<CycleTimeEvaluationDto> {
    const quote = await quoteRepository.findById(quoteId);
    if (!quote) {
      throw new Error('QUOTE_NOT_FOUND');
    }

    // 1. 使用設備IDの補完
    let machineId = data.machineId ?? null;
    let machineName = '未設定';
    if (!machineId) {
      const selectedMachine = await latheRepository.getQuoteSelectedMachine(quoteId);
      if (selectedMachine) {
        machineId = selectedMachine.id;
        machineName = selectedMachine.machine_name;
      }
    } else {
      const machine = await latheRepository.findMachineById(machineId);
      if (machine) {
        machineName = machine.machine_name;
      }
    }

    // 2. Web計算CTの特定
    let calculatedCycleTimeSec = data.calculatedCycleTimeSec ?? null;
    if (calculatedCycleTimeSec === null || calculatedCycleTimeSec === undefined) {
      // 案件の最新CT計算結果から取得
      const latestCt = await cycleTimeRepository.findByQuoteId(quoteId);
      if (latestCt) {
        calculatedCycleTimeSec = Number(latestCt.total_cycle_time_sec);
      } else {
        throw new Error('CALCULATED_CYCLE_TIME_REQUIRED');
      }
    }

    const calcSec = Math.round(Number(calculatedCycleTimeSec) * 1000) / 1000;
    const excelSec = data.excelCycleTimeSec !== null && data.excelCycleTimeSec !== undefined
      ? Math.round(Number(data.excelCycleTimeSec) * 1000) / 1000
      : null;
    const actualSec = data.actualCycleTimeSec !== null && data.actualCycleTimeSec !== undefined
      ? Math.round(Number(data.actualCycleTimeSec) * 1000) / 1000
      : null;

    // 3. Excel比較計算 (指示書6節: 差異秒 = Web - Excel, 差異率 = (Web - Excel) / Excel * 100)
    let excelDiffSec: number | null = null;
    let excelDiffRate: number | null = null;
    if (excelSec !== null && excelSec > 0) {
      excelDiffSec = Math.round((calcSec - excelSec) * 1000) / 1000;
      excelDiffRate = Math.round(((calcSec - excelSec) / excelSec) * 10000) / 100;
    }

    // 4. 実績比較計算 (指示書6節: 差異秒 = 実績 - Web, 差異率 = (実績 - Web) / Web * 100)
    let actualDiffSec: number | null = null;
    let actualDiffRate: number | null = null;
    if (actualSec !== null && calcSec > 0) {
      actualDiffSec = Math.round((actualSec - calcSec) * 1000) / 1000;
      actualDiffRate = Math.round(((actualSec - calcSec) / calcSec) * 10000) / 100;
    }

    // 5. レコード挿入
    const insertId = await cycleTimeEvaluationRepository.create({
      quoteId,
      machineId,
      calculatedCycleTimeSec: calcSec,
      excelCycleTimeSec: excelSec,
      actualCycleTimeSec: actualSec,
      excelDifferenceSec: excelDiffSec,
      excelDifferenceRate: excelDiffRate,
      actualDifferenceSec: actualDiffSec,
      actualDifferenceRate: actualDiffRate,
      differenceCategory: data.differenceCategory || 'OTHER',
      notes: data.notes ?? null,
    });

    // 6. 補正係数テーブルの更新蓄積 (指示書10節: factor = 実績CT / 計算CT)
    if (machineId && actualSec !== null && actualSec > 0 && calcSec > 0) {
      try {
        const measuredFactor = actualSec / calcSec;
        // 材質名特定
        let materialName = 'S45C';
        const matInfo = await materialRepository.findByQuoteId(quoteId);
        if (matInfo && matInfo.material_name) {
          materialName = matInfo.material_name;
        } else {
          const drawings = await drawingRepository.findByQuoteId(quoteId);
          for (const d of drawings) {
            const an = await drawingAnalysisRepository.findLatestByDrawingId(d.id);
            if (an && an.material) {
              materialName = an.material;
              break;
            }
          }
        }
        await cycleTimeEvaluationRepository.upsertCorrectionFactor(machineId, materialName, 'ALL', measuredFactor);
      } catch (err) {
        console.warn('Failed to update correction factor:', err);
      }
    }

    const created = await cycleTimeEvaluationRepository.findById(insertId);
    if (!created) {
      throw new Error('EVALUATION_FETCH_FAILED');
    }
    return this.toEvaluationDto(created);
  }

  /**
   * 案件別評価一覧取得
   */
  async getEvaluationsByQuoteId(quoteId: number): Promise<CycleTimeEvaluationDto[]> {
    const quote = await quoteRepository.findById(quoteId);
    if (!quote) {
      throw new Error('QUOTE_NOT_FOUND');
    }
    const rows = await cycleTimeEvaluationRepository.findByQuoteId(quoteId);
    return rows.map(r => this.toEvaluationDto(r));
  }

  /**
   * 補正係数一覧取得 (GET /api/lathe-correction-factors)
   */
  async getAllCorrectionFactors(): Promise<LatheCorrectionFactorDto[]> {
    const rows = await cycleTimeEvaluationRepository.findAllCorrectionFactors();
    return rows.map(r => this.toFactorDto(r));
  }
}

export const cycleTimeEvaluationService = new CycleTimeEvaluationService();
