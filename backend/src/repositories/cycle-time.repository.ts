import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/database';
import {
  CreateCycleTimeResultInput,
  CycleTimeResultRow,
  StandardCuttingConditionRow,
} from '../types/cycle-time';

export class CycleTimeRepository {
  /**
   * quote_id に一致する最新のサイクルタイム計算結果を取得
   */
  async findByQuoteId(quoteId: number): Promise<CycleTimeResultRow | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, quote_id, cutting_time_sec, non_cutting_time_sec, total_cycle_time_sec,
              theoretical_cycle_time, correction_factor, corrected_cycle_time, correction_source, correction_applied,
              quantity, total_lot_time_sec, calculation_version, created_at, updated_at
       FROM cycle_time_results
       WHERE quote_id = ?
       ORDER BY id DESC
       LIMIT 1`,
      [quoteId]
    );

    if (rows.length === 0) {
      return null;
    }
    return rows[0] as CycleTimeResultRow;
  }

  /**
   * サイクルタイム計算結果の新規保存
   */
  async create(input: CreateCycleTimeResultInput): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO cycle_time_results (
         quote_id, cutting_time_sec, non_cutting_time_sec, total_cycle_time_sec,
         theoretical_cycle_time, correction_factor, corrected_cycle_time, correction_source, correction_applied,
         quantity, total_lot_time_sec, calculation_version
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.quoteId,
        input.cuttingTimeSec,
        input.nonCuttingTimeSec,
        input.totalCycleTimeSec,
        input.theoreticalCycleTime ?? input.totalCycleTimeSec,
        input.correctionFactor ?? 1.0,
        input.correctedCycleTime ?? input.totalCycleTimeSec,
        input.correctionSource ?? null,
        input.correctionApplied ? 1 : 0,
        input.quantity,
        input.totalLotTimeSec,
        input.calculationVersion || '1.0.0',
      ]
    );
    return result.insertId;
  }

  /**
   * quote_id に紐づく既存の計算結果を削除
   */
  async deleteByQuoteId(quoteId: number): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM cycle_time_results WHERE quote_id = ?',
      [quoteId]
    );
    return result.affectedRows;
  }

  /**
   * 材質名と加工種別から有効な切削条件マスタを検索
   */
  async findCuttingCondition(
    materialName: string,
    operationType: string
  ): Promise<StandardCuttingConditionRow | null> {
    // 1. 完全一致または前方一致で検索
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, material_group, material_name, operation_type, mode, tool_category,
              diameter_min, diameter_max, vc, feed_per_rev, feed_per_tooth, ap, ae,
              source_name, source_url, enabled, created_at, updated_at
       FROM standard_cutting_conditions
       WHERE enabled = 1
         AND operation_type = ?
         AND (material_name = ? OR ? LIKE CONCAT('%', material_name, '%'))
       ORDER BY CASE WHEN material_name = ? THEN 1 ELSE 2 END, id ASC
       LIMIT 1`,
      [operationType, materialName, materialName, materialName]
    );

    if (rows.length > 0) {
      return rows[0] as StandardCuttingConditionRow;
    }

    // 2. 該当しない場合は DEFAULT をフォールバック検索
    const [defaultRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, material_group, material_name, operation_type, mode, tool_category,
              diameter_min, diameter_max, vc, feed_per_rev, feed_per_tooth, ap, ae,
              source_name, source_url, enabled, created_at, updated_at
       FROM standard_cutting_conditions
       WHERE enabled = 1
         AND operation_type = ?
         AND material_name = 'DEFAULT'
       LIMIT 1`,
      [operationType]
    );

    if (defaultRows.length > 0) {
      return defaultRows[0] as StandardCuttingConditionRow;
    }

    return null;
  }

  /**
   * 工程テーブルに計算パラメータを反映更新
   */
  async updateOperationCalculation(
    operationId: number,
    data: {
      standardConditionId: number | null;
      vc: number;
      feedPerRev: number;
      ap: number | null;
      rpm: number;
      feedRate: number;
      cuttingTimeSec: number;
      nonCuttingTimeSec: number;
      totalTimeSec: number;
    }
  ): Promise<void> {
    await pool.query(
      `UPDATE operations
       SET standard_condition_id = ?,
           vc = ?,
           feed_per_rev = ?,
           ap = ?,
           rpm = ?,
           feed_rate = ?,
           cutting_time_sec = ?,
           non_cutting_time_sec = ?,
           total_time_sec = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [
        data.standardConditionId,
        data.vc,
        data.feedPerRev,
        data.ap,
        data.rpm,
        data.feedRate,
        data.cuttingTimeSec,
        data.nonCuttingTimeSec,
        data.totalTimeSec,
        operationId,
      ]
    );
  }
}

export const cycleTimeRepository = new CycleTimeRepository();
