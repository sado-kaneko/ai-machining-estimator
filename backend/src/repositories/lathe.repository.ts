import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/database';
import {
  AutomaticLatheOperationRow,
  CreateLatheOperationInput,
  LatheConditionMasterRow,
  LatheProcessMasterRow,
  MachineMasterRow,
  MachineTimeMasterRow,
  UpdateLatheOperationInput,
} from '../types/lathe';

export class LatheRepository {
  /**
   * 設備マスタ取得
   */
  async findMachineByType(machineType: string): Promise<MachineMasterRow | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, machine_type, calculation_engine_type, machine_name, maker, model, max_rpm, created_at, updated_at FROM machine_master WHERE machine_type = ? LIMIT 1',
      [machineType]
    );
    return rows.length > 0 ? (rows[0] as MachineMasterRow) : null;
  }

  /**
   * 設備マスタ全件取得 (GET /api/machines)
   */
  async findAllMachines(): Promise<MachineMasterRow[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, machine_type, calculation_engine_type, machine_name, maker, model, max_rpm, created_at, updated_at FROM machine_master ORDER BY id ASC'
    );
    return rows as MachineMasterRow[];
  }

  /**
   * 設備ID指定取得
   */
  async findMachineById(id: number): Promise<MachineMasterRow | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, machine_type, calculation_engine_type, machine_name, maker, model, max_rpm, created_at, updated_at FROM machine_master WHERE id = ? LIMIT 1',
      [id]
    );
    return rows.length > 0 ? (rows[0] as MachineMasterRow) : null;
  }

  /**
   * 案件に選択された設備を取得 (無ければCincom L20をデフォルト)
   */
  async getQuoteSelectedMachine(quoteId: number): Promise<MachineMasterRow | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT m.id, m.machine_type, m.calculation_engine_type, m.machine_name, m.maker, m.model, m.max_rpm, m.created_at, m.updated_at
       FROM quote_machine_selection s
       JOIN machine_master m ON s.machine_id = m.id
       WHERE s.quote_id = ? AND s.selected = 1
       ORDER BY s.priority ASC
       LIMIT 1`,
      [quoteId]
    );
    if (rows.length > 0) {
      return rows[0] as MachineMasterRow;
    }
    // デフォルト設備（Cincom L20）を取得
    return this.findMachineByType('NC_AUTOMATIC_LATHE');
  }

  /**
   * 案件の加工機設定 (POST /api/quotes/:id/machine)
   */
  async setQuoteMachine(quoteId: number, machineId: number): Promise<void> {
    // 既存の選択を解除
    await pool.query('DELETE FROM quote_machine_selection WHERE quote_id = ?', [quoteId]);
    await pool.query(
      'INSERT INTO quote_machine_selection (quote_id, machine_id, priority, selected) VALUES (?, ?, 1, 1)',
      [quoteId, machineId]
    );
  }

  /**
   * 工程マスタ全件取得
   */
  async findAllProcesses(): Promise<LatheProcessMasterRow[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, process_category, process_name, calculation_type, default_time_sec, enabled, created_at, updated_at FROM lathe_process_master WHERE enabled = 1'
    );
    return rows as LatheProcessMasterRow[];
  }

  /**
   * 工程名から工程マスタを検索
   */
  async findProcessByName(processName: string): Promise<LatheProcessMasterRow | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, process_category, process_name, calculation_type, default_time_sec, enabled, created_at, updated_at FROM lathe_process_master WHERE process_name = ? AND enabled = 1 LIMIT 1',
      [processName]
    );
    return rows.length > 0 ? (rows[0] as LatheProcessMasterRow) : null;
  }

  /**
   * 切削条件マスタ検索 (材質 × processId)
   */
  async findCondition(
    materialName: string,
    processId: number
  ): Promise<LatheConditionMasterRow | null> {
    // 1. 完全一致または前方一致
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, material_name, process_id, tool_type, diameter_min, diameter_max,
              vc, feed, ap, enabled, created_at, updated_at
       FROM lathe_condition_master
       WHERE enabled = 1
         AND process_id = ?
         AND (material_name = ? OR ? LIKE CONCAT('%', material_name, '%'))
       ORDER BY CASE WHEN material_name = ? THEN 1 ELSE 2 END, id ASC
       LIMIT 1`,
      [processId, materialName, materialName, materialName]
    );

    if (rows.length > 0) {
      return rows[0] as LatheConditionMasterRow;
    }

    // 2. DEFAULT フォールバック
    const [defaultRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, material_name, process_id, tool_type, diameter_min, diameter_max,
              vc, feed, ap, enabled, created_at, updated_at
       FROM lathe_condition_master
       WHERE enabled = 1
         AND process_id = ?
         AND material_name = 'DEFAULT'
       LIMIT 1`,
      [processId]
    );

    return defaultRows.length > 0 ? (defaultRows[0] as LatheConditionMasterRow) : null;
  }

  /**
   * 非切削時間マスタ全件取得
   */
  async findMachineTimes(machineType: string): Promise<MachineTimeMasterRow[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, machine_type, parameter_name, time_sec, created_at, updated_at FROM machine_time_master WHERE machine_type = ?',
      [machineType]
    );
    return rows as MachineTimeMasterRow[];
  }

  /**
   * quote_id に紐づく自動旋盤工程一覧取得
   */
  async findOperationsByQuoteId(quoteId: number): Promise<(AutomaticLatheOperationRow & { process_name: string; process_category: string; calculation_type: string })[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT o.id, o.quote_id, o.feature_id, o.sequence_no, o.process_id,
              o.machining_length, o.diameter, o.depth, o.repeat_count,
              o.feed, o.vc, o.cutting_time_sec, o.non_cutting_time_sec, o.total_time_sec,
              o.status, o.created_at, o.updated_at,
              p.process_name, p.process_category, p.calculation_type
       FROM automatic_lathe_operations o
       JOIN lathe_process_master p ON o.process_id = p.id
       WHERE o.quote_id = ?
       ORDER BY o.sequence_no ASC`,
      [quoteId]
    );
    return rows as (AutomaticLatheOperationRow & { process_name: string; process_category: string; calculation_type: string })[];
  }

  /**
   * 自動旋盤工程の複数件一括登録
   */
  async createOperations(inputs: CreateLatheOperationInput[]): Promise<void> {
    if (inputs.length === 0) return;

    for (const input of inputs) {
      await pool.query(
        `INSERT INTO automatic_lathe_operations (
           quote_id, feature_id, sequence_no, process_id,
           machining_length, diameter, depth, repeat_count,
           feed, vc, cutting_time_sec, non_cutting_time_sec, total_time_sec, status
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.quoteId,
          input.featureId,
          input.sequenceNo,
          input.processId,
          input.machiningLength,
          input.diameter,
          input.depth,
          input.repeatCount ?? 1,
          input.feed ?? 0,
          input.vc ?? 0,
          input.cuttingTimeSec ?? 0,
          input.nonCuttingTimeSec ?? 0,
          input.totalTimeSec ?? 0,
          input.status ?? 'GENERATED',
        ]
      );
    }
  }

  /**
   * quote_id に紐づく工程の件数
   */
  async countByQuoteId(quoteId: number): Promise<number> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM automatic_lathe_operations WHERE quote_id = ?',
      [quoteId]
    );
    return Number(rows[0].count);
  }

  /**
   * quote_id に紐づく工程を全削除
   */
  async deleteByQuoteId(quoteId: number): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM automatic_lathe_operations WHERE quote_id = ?',
      [quoteId]
    );
    return result.affectedRows;
  }

  /**
   * 単一工程の計算結果・切削条件を更新
   */
  async updateOperationCalculation(
    id: number,
    data: {
      feed: number;
      vc: number;
      cuttingTimeSec: number;
      nonCuttingTimeSec: number;
      totalTimeSec: number;
    }
  ): Promise<void> {
    await pool.query(
      `UPDATE automatic_lathe_operations
       SET feed = ?,
           vc = ?,
           cutting_time_sec = ?,
           non_cutting_time_sec = ?,
           total_time_sec = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [
        data.feed,
        data.vc,
        data.cuttingTimeSec,
        data.nonCuttingTimeSec,
        data.totalTimeSec,
        id,
      ]
    );
  }

  /**
   * 工程全件数カウント（テスト後確認用）
   */
  async count(): Promise<number> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM automatic_lathe_operations'
    );
    return Number(rows[0].count);
  }
}

export const latheRepository = new LatheRepository();
