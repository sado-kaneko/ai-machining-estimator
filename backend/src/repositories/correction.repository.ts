import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { pool } from '../config/database';
import { CorrectionHistoryItem } from '../types/correction';

export class CorrectionRepository {
  /**
   * 条件に合致する承認済み補正係数を取得
   * 優先順位:
   * ① 設備ID × 材料名 × 工程名 (process_type != 'ALL')
   * ② 設備ID × 材料名 (process_type = 'ALL')
   * ③ 設備ID (material_name = 'ALL')
   * ④ 全体補正 (machine_id IS NULL or ALL)
   */
  async findApprovedFactor(
    machineId: number,
    materialName: string,
    processType: string = 'ALL'
  ): Promise<{
    factor: number;
    sampleCount: number;
    confidenceLevel: string;
    source: string;
    processType: string;
  } | null> {
    // ① 設備 × 材料 × 工程
    if (processType && processType !== 'ALL') {
      const [rows1] = await pool.query<RowDataPacket[]>(
        `SELECT lcf.factor, lcf.sample_count, lcf.confidence_level, m.machine_name, lcf.material_name, lcf.process_type
         FROM lathe_correction_factors lcf
         JOIN machine_master m ON lcf.machine_id = m.id
         WHERE lcf.approved = 1
           AND lcf.machine_id = ?
           AND (lcf.material_name = ? OR ? LIKE CONCAT('%', lcf.material_name, '%'))
           AND lcf.process_type = ?
         LIMIT 1`,
        [machineId, materialName, materialName, processType]
      );
      if (rows1.length > 0) {
        const r = rows1[0];
        return {
          factor: Number(r.factor),
          sampleCount: Number(r.sample_count),
          confidenceLevel: String(r.confidence_level || 'MEDIUM'),
          source: `${r.machine_name} × ${r.material_name} × ${r.process_type}`,
          processType: String(r.process_type),
        };
      }
    }

    // ② 設備 × 材料 (process_type = 'ALL')
    const [rows2] = await pool.query<RowDataPacket[]>(
      `SELECT lcf.factor, lcf.sample_count, lcf.confidence_level, m.machine_name, lcf.material_name, lcf.process_type
       FROM lathe_correction_factors lcf
       JOIN machine_master m ON lcf.machine_id = m.id
       WHERE lcf.approved = 1
         AND lcf.machine_id = ?
         AND (lcf.material_name = ? OR ? LIKE CONCAT('%', lcf.material_name, '%'))
         AND lcf.process_type = 'ALL'
       LIMIT 1`,
      [machineId, materialName, materialName]
    );
    if (rows2.length > 0) {
      const r = rows2[0];
      return {
        factor: Number(r.factor),
        sampleCount: Number(r.sample_count),
        confidenceLevel: String(r.confidence_level || 'MEDIUM'),
        source: `${r.machine_name} × ${r.material_name}`,
        processType: 'ALL',
      };
    }

    // ③ 設備のみ (material_name = 'ALL')
    const [rows3] = await pool.query<RowDataPacket[]>(
      `SELECT lcf.factor, lcf.sample_count, lcf.confidence_level, m.machine_name, lcf.material_name, lcf.process_type
       FROM lathe_correction_factors lcf
       JOIN machine_master m ON lcf.machine_id = m.id
       WHERE lcf.approved = 1
         AND lcf.machine_id = ?
         AND lcf.material_name = 'ALL'
       LIMIT 1`,
      [machineId]
    );
    if (rows3.length > 0) {
      const r = rows3[0];
      return {
        factor: Number(r.factor),
        sampleCount: Number(r.sample_count),
        confidenceLevel: String(r.confidence_level || 'MEDIUM'),
        source: `${r.machine_name} (設備全体)`,
        processType: 'ALL',
      };
    }

    return null;
  }

  /**
   * 補正適用履歴の保存
   */
  async saveHistory(quoteId: number, beforeTime: number, factor: number, afterTime: number, source: string): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO correction_history (quote_id, before_time, factor, after_time, source, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [quoteId, beforeTime, factor, afterTime, source]
    );
    return result.insertId;
  }

  /**
   * 補正適用履歴の取得
   */
  async findHistoryByQuoteId(quoteId: number): Promise<CorrectionHistoryItem[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, quote_id, before_time, factor, after_time, source, created_at
       FROM correction_history
       WHERE quote_id = ?
       ORDER BY id DESC`,
      [quoteId]
    );
    return rows.map((r) => ({
      id: Number(r.id),
      quoteId: Number(r.quote_id),
      beforeTime: Number(r.before_time),
      factor: Number(r.factor),
      afterTime: Number(r.after_time),
      source: String(r.source),
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    }));
  }

  /**
   * 補正係数の承認・承認解除
   */
  async setApprovalStatus(id: number, approved: boolean, operatorName: string = '管理者'): Promise<void> {
    await pool.query(
      `UPDATE lathe_correction_factors
       SET approved = ?,
           approved_by = ?,
           approved_at = ?
       WHERE id = ?`,
      [approved ? 1 : 0, approved ? operatorName : null, approved ? new Date() : null, id]
    );
  }
}

export const correctionRepository = new CorrectionRepository();
