import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/database';
import {
  ActualCycleTimeRow,
  CreateActualCycleTimeInput,
} from '../types/actual-cycle-time';

export class ActualCycleTimeRepository {
  /**
   * 実績レコード登録
   */
  async create(input: CreateActualCycleTimeInput): Promise<ActualCycleTimeRow> {
    const query = `
      INSERT INTO actual_cycle_times (
        quote_id,
        machine_id,
        production_date,
        quantity,
        cycle_time_result_id,
        actual_cycle_time_sec,
        setup_time_sec,
        operator_name,
        status,
        source,
        notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      input.quoteId,
      input.machineId ?? null,
      input.productionDate ?? null,
      input.quantity,
      input.cycleTimeResultId ?? null,
      input.actualCycleTimeSec,
      input.setupTimeSec ?? 0.0,
      input.operatorName ?? null,
      input.status ?? 'COMPLETED',
      'MANUAL',
      input.notes ?? null,
    ];

    const [result] = await pool.query<ResultSetHeader>(query, values);
    const created = await this.findById(result.insertId);
    if (!created) {
      throw new Error('FAILED_TO_FETCH_CREATED_ACTUAL_CYCLE_TIME');
    }
    return created;
  }

  /**
   * IDによる実績1件取得 (JOIN machine_master)
   */
  async findById(id: number): Promise<ActualCycleTimeRow | null> {
    const query = `
      SELECT 
        act.*,
        m.machine_name
      FROM actual_cycle_times act
      LEFT JOIN machine_master m ON act.machine_id = m.id
      WHERE act.id = ?
    `;

    const [rows] = await pool.query<RowDataPacket[]>(query, [id]);
    if (rows.length === 0) return null;
    return rows[0] as ActualCycleTimeRow;
  }

  /**
   * 見積案件IDによる実績一覧取得 (作成日時降順)
   */
  async findByQuoteId(quoteId: number): Promise<ActualCycleTimeRow[]> {
    const query = `
      SELECT 
        act.*,
        m.machine_name
      FROM actual_cycle_times act
      LEFT JOIN machine_master m ON act.machine_id = m.id
      WHERE act.quote_id = ?
      ORDER BY act.production_date DESC, act.id DESC
    `;

    const [rows] = await pool.query<RowDataPacket[]>(query, [quoteId]);
    return rows as ActualCycleTimeRow[];
  }

  /**
   * 見積案件IDによる実績統計情報取得 (加重平均または算術平均)
   */
  async getSummaryByQuoteId(quoteId: number): Promise<{
    weightedAvgSec: number;
    simpleAvgSec: number;
    totalQuantity: number;
    recordCount: number;
    latestDate: string | null;
  } | null> {
    const query = `
      SELECT 
        COUNT(*) as record_count,
        SUM(quantity) as total_quantity,
        SUM(actual_cycle_time_sec * quantity) / NULLIF(SUM(quantity), 0) as weighted_avg_sec,
        AVG(actual_cycle_time_sec) as simple_avg_sec,
        MAX(production_date) as latest_date
      FROM actual_cycle_times
      WHERE quote_id = ?
    `;

    const [rows] = await pool.query<RowDataPacket[]>(query, [quoteId]);
    if (rows.length === 0 || rows[0].record_count === 0) {
      return null;
    }

    const row = rows[0];
    return {
      weightedAvgSec: Number(row.weighted_avg_sec) || 0,
      simpleAvgSec: Number(row.simple_avg_sec) || 0,
      totalQuantity: Number(row.total_quantity) || 0,
      recordCount: Number(row.record_count) || 0,
      latestDate: row.latest_date ? String(row.latest_date) : null,
    };
  }

  /**
   * 実績削除
   */
  async delete(id: number): Promise<boolean> {
    const query = 'DELETE FROM actual_cycle_times WHERE id = ?';
    const [result] = await pool.query<ResultSetHeader>(query, [id]);
    return result.affectedRows > 0;
  }

  /**
   * 見積案件IDごとの全実績削除
   */
  async deleteByQuoteId(quoteId: number): Promise<void> {
    await pool.query('DELETE FROM actual_cycle_times WHERE quote_id = ?', [quoteId]);
  }
}

export const actualCycleTimeRepository = new ActualCycleTimeRepository();
