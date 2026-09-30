import { ResultSetHeader } from 'mysql2';
import { pool } from '../config/database';
import {
  CycleTimeEvaluationRow,
  DifferenceCategory,
  LatheCorrectionFactorRow,
} from '../types/cycle-time-evaluation';

export interface InsertEvaluationInput {
  quoteId: number;
  machineId: number | null;
  calculatedCycleTimeSec: number;
  excelCycleTimeSec: number | null;
  actualCycleTimeSec: number | null;
  excelDifferenceSec: number | null;
  excelDifferenceRate: number | null;
  actualDifferenceSec: number | null;
  actualDifferenceRate: number | null;
  differenceCategory: DifferenceCategory;
  notes: string | null;
}

export class CycleTimeEvaluationRepository {
  /**
   * 評価レコード登録
   */
  async create(input: InsertEvaluationInput): Promise<number> {
    const query = `
      INSERT INTO cycle_time_evaluations (
        quote_id,
        machine_id,
        calculated_cycle_time_sec,
        excel_cycle_time_sec,
        actual_cycle_time_sec,
        excel_difference_sec,
        excel_difference_rate,
        actual_difference_sec,
        actual_difference_rate,
        evaluation_status,
        difference_category,
        notes,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'EVALUATED', ?, ?, NOW())
    `;

    const values = [
      input.quoteId,
      input.machineId ?? null,
      input.calculatedCycleTimeSec,
      input.excelCycleTimeSec ?? null,
      input.actualCycleTimeSec ?? null,
      input.excelDifferenceSec ?? null,
      input.excelDifferenceRate ?? null,
      input.actualDifferenceSec ?? null,
      input.actualDifferenceRate ?? null,
      input.differenceCategory ?? 'OTHER',
      input.notes ?? null,
    ];

    const [result] = await pool.query<ResultSetHeader>(query, values);
    return result.insertId;
  }

  /**
   * IDから評価レコード取得 (JOIN machine_master)
   */
  async findById(id: number): Promise<CycleTimeEvaluationRow | null> {
    const query = `
      SELECT 
        e.*,
        m.machine_name
      FROM cycle_time_evaluations e
      LEFT JOIN machine_master m ON e.machine_id = m.id
      WHERE e.id = ?
      LIMIT 1
    `;
    const [rows] = await pool.query<CycleTimeEvaluationRow[]>(query, [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * 案件IDから評価一覧取得 (新しい順)
   */
  async findByQuoteId(quoteId: number): Promise<CycleTimeEvaluationRow[]> {
    const query = `
      SELECT 
        e.*,
        m.machine_name
      FROM cycle_time_evaluations e
      LEFT JOIN machine_master m ON e.machine_id = m.id
      WHERE e.quote_id = ?
      ORDER BY e.id DESC
    `;
    const [rows] = await pool.query<CycleTimeEvaluationRow[]>(query, [quoteId]);
    return rows;
  }

  /**
   * 補正係数のUpsert (実績差異がある場合に学習蓄積)
   */
  async upsertCorrectionFactor(
    machineId: number,
    materialName: string,
    processType: string,
    measuredFactor: number
  ): Promise<void> {
    const checkQuery = `
      SELECT *
      FROM lathe_correction_factors
      WHERE machine_id = ? AND material_name = ? AND process_type = ?
      LIMIT 1
    `;
    const [existing] = await pool.query<LatheCorrectionFactorRow[]>(checkQuery, [
      machineId,
      materialName,
      processType,
    ]);

    if (existing.length > 0) {
      const row = existing[0];
      const newCount = row.sample_count + 1;
      const currentFactor = Number(row.factor);
      // 移動平均・加重平均で補正係数を更新
      const updatedFactor = Math.round(((currentFactor * row.sample_count + measuredFactor) / newCount) * 10000) / 10000;

      const updateQuery = `
        UPDATE lathe_correction_factors
        SET factor = ?,
            sample_count = ?,
            updated_at = NOW()
        WHERE id = ?
      `;
      await pool.query<ResultSetHeader>(updateQuery, [updatedFactor, newCount, row.id]);
    } else {
      const insertQuery = `
        INSERT INTO lathe_correction_factors (
          machine_id,
          material_name,
          process_type,
          factor,
          sample_count,
          created_at
        ) VALUES (?, ?, ?, ?, 1, NOW())
      `;
      await pool.query<ResultSetHeader>(insertQuery, [
        machineId,
        materialName,
        processType,
        Math.round(measuredFactor * 10000) / 10000,
      ]);
    }
  }

  /**
   * 補正係数一覧取得
   */
  async findAllCorrectionFactors(): Promise<LatheCorrectionFactorRow[]> {
    const query = `
      SELECT 
        cf.*,
        m.machine_name
      FROM lathe_correction_factors cf
      JOIN machine_master m ON cf.machine_id = m.id
      ORDER BY m.id ASC, cf.material_name ASC
    `;
    const [rows] = await pool.query<LatheCorrectionFactorRow[]>(query);
    return rows;
  }

  /**
   * 全件カウント（クリーンアップ確認用）
   */
  async count(): Promise<number> {
    const [rows] = await pool.query<any[]>('SELECT COUNT(*) as c FROM cycle_time_evaluations');
    return Number(rows[0].c);
  }

  async countFactors(): Promise<number> {
    const [rows] = await pool.query<any[]>('SELECT COUNT(*) as c FROM lathe_correction_factors');
    return Number(rows[0].c);
  }
}

export const cycleTimeEvaluationRepository = new CycleTimeEvaluationRepository();
