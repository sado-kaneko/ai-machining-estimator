import { pool } from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import {
  PredictionAccuracyRecord,
  AccuracySummary,
  MachineAccuracy,
  MaterialAccuracy,
  MonthlyTrend,
  CorrectionEffect,
} from '../types/accuracy';

export class AccuracyRepository {
  /**
   * 精度評価レコードを登録・更新
   */
  async upsertAccuracyRecord(data: {
    quoteId: number;
    cycleTimeResultId?: number | null;
    predictionCt: number;
    theoreticalCt?: number | null;
    actualCt: number;
    errorSeconds: number;
    errorRate: number;
    absoluteErrorRate: number;
    machineName?: string | null;
    materialName?: string | null;
  }): Promise<void> {
    await pool.query(
      `INSERT INTO prediction_accuracy (
        quote_id, cycle_time_result_id, prediction_ct, theoretical_ct, actual_ct,
        error_seconds, error_rate, absolute_error_rate, machine_name, material_name, evaluated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        cycle_time_result_id = VALUES(cycle_time_result_id),
        prediction_ct = VALUES(prediction_ct),
        theoretical_ct = VALUES(theoretical_ct),
        actual_ct = VALUES(actual_ct),
        error_seconds = VALUES(error_seconds),
        error_rate = VALUES(error_rate),
        absolute_error_rate = VALUES(absolute_error_rate),
        machine_name = VALUES(machine_name),
        material_name = VALUES(material_name),
        evaluated_at = NOW()`,
      [
        data.quoteId,
        data.cycleTimeResultId || null,
        data.predictionCt,
        data.theoreticalCt || null,
        data.actualCt,
        data.errorSeconds,
        data.errorRate,
        data.absoluteErrorRate,
        data.machineName || null,
        data.materialName || null,
      ]
    );
  }

  /**
   * 全精度評価レコードの取得
   */
  async getAllAccuracyRecords(limit = 100): Promise<PredictionAccuracyRecord[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT pa.*, q.quote_no, q.part_no, q.part_name, q.customer_name
       FROM prediction_accuracy pa
       JOIN quotes q ON q.id = pa.quote_id
       ORDER BY pa.evaluated_at DESC, pa.id DESC
       LIMIT ?`,
      [limit]
    );

    return rows.map((r) => ({
      id: Number(r.id),
      quoteId: Number(r.quote_id),
      quoteNo: r.quote_no ? String(r.quote_no) : null,
      partNo: r.part_no ? String(r.part_no) : null,
      partName: r.part_name ? String(r.part_name) : null,
      customerName: r.customer_name ? String(r.customer_name) : null,
      cycleTimeResultId: r.cycle_time_result_id !== null ? Number(r.cycle_time_result_id) : null,
      predictionCt: Number(r.prediction_ct),
      theoreticalCt: r.theoretical_ct !== null ? Number(r.theoretical_ct) : null,
      actualCt: Number(r.actual_ct),
      errorSeconds: Number(r.error_seconds),
      errorRate: Number(r.error_rate),
      absoluteErrorRate: Number(r.absolute_error_rate),
      machineName: r.machine_name ? String(r.machine_name) : null,
      materialName: r.material_name ? String(r.material_name) : null,
      evaluatedAt: r.evaluated_at instanceof Date ? r.evaluated_at.toISOString() : String(r.evaluated_at),
    }));
  }

  /**
   * 未評価または再評価可能な実績付き案件を抽出
   */
  async findCandidatesForEvaluation(): Promise<Array<{
    quoteId: number;
    cycleTimeResultId: number | null;
    predictionCt: number;
    theoreticalCt: number | null;
    actualCt: number;
    machineName: string | null;
    materialName: string | null;
  }>> {
    // 案件の予測CT（quote_resultsまたはcycle_time_results）と実績CT（actual_cycle_timesまたはproduction_actual_records）を結合
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT q.id AS quote_id,
              COALESCE(ctr.id, NULL) AS cycle_time_result_id,
              COALESCE(qr.final_time, ctr.corrected_cycle_time, ctr.total_cycle_time_sec) AS prediction_ct,
              COALESCE(qr.cycle_time, ctr.theoretical_cycle_time, ctr.total_cycle_time_sec) AS theoretical_ct,
              COALESCE(act.actual_cycle_time_sec, par.cycle_time_sec) AS actual_ct,
              COALESCE(qr.machine, par.machine_name, mm.machine_name) AS machine_name,
              COALESCE(q.material, m.material_name, da.material, par.material_name) AS material_name
       FROM quotes q
       LEFT JOIN quote_results qr ON qr.quote_id = q.id
       LEFT JOIN cycle_time_results ctr ON ctr.quote_id = q.id
       LEFT JOIN quote_machine_selection qms ON qms.quote_id = q.id AND qms.selected = 1
       LEFT JOIN machine_master mm ON mm.id = qms.machine_id
       LEFT JOIN material_information m ON m.quote_id = q.id
       LEFT JOIN drawings d ON d.quote_id = q.id
       LEFT JOIN drawing_analyses da ON da.drawing_id = d.id
       LEFT JOIN actual_cycle_times act ON act.quote_id = q.id
       LEFT JOIN drawing_number_mapping dnm ON dnm.quote_id = q.id
       LEFT JOIN production_actual_records par ON (par.buban = q.part_no OR par.buban = dnm.buban) AND par.cycle_time_sec > 0
       WHERE (COALESCE(qr.final_time, ctr.corrected_cycle_time, ctr.total_cycle_time_sec) > 0)
         AND (COALESCE(act.actual_cycle_time_sec, par.cycle_time_sec) > 0)
       GROUP BY q.id`
    );

    return rows.map((r) => ({
      quoteId: Number(r.quote_id),
      cycleTimeResultId: r.cycle_time_result_id !== null ? Number(r.cycle_time_result_id) : null,
      predictionCt: Number(r.prediction_ct),
      theoreticalCt: r.theoretical_ct !== null ? Number(r.theoretical_ct) : null,
      actualCt: Number(r.actual_ct),
      machineName: r.machine_name ? String(r.machine_name) : null,
      materialName: r.material_name ? String(r.material_name) : null,
    }));
  }

  /**
   * 全体KPIサマリ取得
   */
  async getSummary(): Promise<AccuracySummary> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
        COUNT(*) AS total_count,
        COALESCE(AVG(absolute_error_rate), 0) AS avg_abs_error,
        COALESCE(AVG(error_rate), 0) AS avg_error,
        SUM(CASE WHEN absolute_error_rate <= 0.10 THEN 1 ELSE 0 END) AS within_10_count,
        SUM(CASE WHEN absolute_error_rate <= 0.20 THEN 1 ELSE 0 END) AS within_20_count,
        SUM(CASE WHEN absolute_error_rate > 0.20 THEN 1 ELSE 0 END) AS over_20_count,
        SUM(CASE WHEN error_rate > 0 THEN 1 ELSE 0 END) AS under_pred_count,
        SUM(CASE WHEN error_rate < 0 THEN 1 ELSE 0 END) AS over_pred_count
       FROM prediction_accuracy`
    );

    const r = rows[0] || {};
    const total = Number(r.total_count || 0);

    // 中央値の計算
    let medianAbsError = 0;
    if (total > 0) {
      const [sortedRows] = await pool.query<RowDataPacket[]>(
        `SELECT absolute_error_rate FROM prediction_accuracy ORDER BY absolute_error_rate ASC`
      );
      const mid = Math.floor(sortedRows.length / 2);
      if (sortedRows.length % 2 !== 0) {
        medianAbsError = Number(sortedRows[mid].absolute_error_rate);
      } else {
        medianAbsError = (Number(sortedRows[mid - 1].absolute_error_rate) + Number(sortedRows[mid].absolute_error_rate)) / 2;
      }
    }

    const w10 = Number(r.within_10_count || 0);
    const w20 = Number(r.within_20_count || 0);
    const o20 = Number(r.over_20_count || 0);

    return {
      totalEvaluations: total,
      avgAbsoluteErrorRate: Number((Number(r.avg_abs_error || 0) * 100).toFixed(2)),
      medianAbsoluteErrorRate: Number((medianAbsError * 100).toFixed(2)),
      avgErrorRate: Number((Number(r.avg_error || 0) * 100).toFixed(2)),
      within10PercentCount: w10,
      within10PercentRate: total > 0 ? Number(((w10 / total) * 100).toFixed(1)) : 0,
      within20PercentCount: w20,
      within20PercentRate: total > 0 ? Number(((w20 / total) * 100).toFixed(1)) : 0,
      over20PercentCount: o20,
      over20PercentRate: total > 0 ? Number(((o20 / total) * 100).toFixed(1)) : 0,
      underPredictionCount: Number(r.under_pred_count || 0),
      overPredictionCount: Number(r.over_pred_count || 0),
    };
  }

  /**
   * 設備別精度集計
   */
  async getMachineAccuracy(): Promise<MachineAccuracy[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
        COALESCE(machine_name, '未設定') AS machine_name,
        COUNT(*) AS sample_count,
        AVG(absolute_error_rate) AS avg_abs_error,
        SUM(CASE WHEN error_rate > 0 THEN 1 ELSE 0 END) / COUNT(*) AS under_pred_rate,
        SUM(CASE WHEN error_rate < 0 THEN 1 ELSE 0 END) / COUNT(*) AS over_pred_rate
       FROM prediction_accuracy
       GROUP BY machine_name
       ORDER BY sample_count DESC`
    );

    const result: MachineAccuracy[] = [];
    for (const r of rows) {
      const machine = String(r.machine_name);
      // 中央値取得
      const [mRows] = await pool.query<RowDataPacket[]>(
        `SELECT absolute_error_rate FROM prediction_accuracy WHERE COALESCE(machine_name, '未設定') = ? ORDER BY absolute_error_rate ASC`,
        [machine]
      );
      let median = 0;
      if (mRows.length > 0) {
        const mid = Math.floor(mRows.length / 2);
        median = mRows.length % 2 !== 0 ? Number(mRows[mid].absolute_error_rate) : (Number(mRows[mid - 1].absolute_error_rate) + Number(mRows[mid].absolute_error_rate)) / 2;
      }

      result.push({
        machineName: machine,
        sampleCount: Number(r.sample_count),
        avgAbsoluteErrorRate: Number((Number(r.avg_abs_error || 0) * 100).toFixed(2)),
        medianAbsoluteErrorRate: Number((median * 100).toFixed(2)),
        underPredictionRate: Number((Number(r.under_pred_rate || 0) * 100).toFixed(1)),
        overPredictionRate: Number((Number(r.over_pred_rate || 0) * 100).toFixed(1)),
      });
    }

    return result;
  }

  /**
   * 材料別精度集計
   */
  async getMaterialAccuracy(): Promise<MaterialAccuracy[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
        COALESCE(material_name, '未設定') AS material_name,
        COUNT(*) AS sample_count,
        AVG(absolute_error_rate) AS avg_abs_error
       FROM prediction_accuracy
       GROUP BY material_name
       ORDER BY sample_count DESC`
    );

    return rows.map((r) => {
      const count = Number(r.sample_count);
      let confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
      if (count >= 20) confidenceLevel = 'HIGH';
      else if (count >= 5) confidenceLevel = 'MEDIUM';

      return {
        materialName: String(r.material_name),
        sampleCount: count,
        avgAbsoluteErrorRate: Number((Number(r.avg_abs_error || 0) * 100).toFixed(2)),
        confidenceLevel,
      };
    });
  }

  /**
   * 月別推移集計
   */
  async getMonthlyTrends(): Promise<MonthlyTrend[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
        DATE_FORMAT(evaluated_at, '%Y-%m') AS ym,
        COUNT(*) AS sample_count,
        AVG(absolute_error_rate) AS avg_abs_error,
        AVG(error_rate) AS avg_error
       FROM prediction_accuracy
       GROUP BY ym
       ORDER BY ym ASC`
    );

    return rows.map((r) => ({
      month: String(r.ym),
      sampleCount: Number(r.sample_count),
      avgAbsoluteErrorRate: Number((Number(r.avg_abs_error || 0) * 100).toFixed(2)),
      avgErrorRate: Number((Number(r.avg_error || 0) * 100).toFixed(2)),
    }));
  }

  /**
   * 補正効果比較 (理論CT vs 補正後CT)
   */
  async getCorrectionEffect(): Promise<CorrectionEffect> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
        COUNT(*) AS sample_count,
        AVG(ABS(actual_ct - theoretical_ct) / actual_ct) AS before_avg_abs_error,
        AVG(absolute_error_rate) AS after_avg_abs_error
       FROM prediction_accuracy
       WHERE theoretical_ct IS NOT NULL AND theoretical_ct > 0 AND actual_ct > 0`
    );

    const r = rows[0] || {};
    const count = Number(r.sample_count || 0);
    const before = Number((Number(r.before_avg_abs_error || 0) * 100).toFixed(2));
    const after = Number((Number(r.after_avg_abs_error || 0) * 100).toFixed(2));

    let improvementRate = 0;
    if (before > 0) {
      improvementRate = Number((((before - after) / before) * 100).toFixed(1));
    }

    return {
      sampleCount: count,
      beforeCorrectionAvgAbsError: before,
      afterCorrectionAvgAbsError: after,
      improvementRate,
    };
  }
}

export const accuracyRepository = new AccuracyRepository();
