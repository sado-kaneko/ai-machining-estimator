import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/database';
import { CreateOperationInput, OperationRow, UpdateOperationInput } from '../types/operation';

export class OperationRepository {
  /**
   * 工程レコードを一括作成する（トランザクション使用）
   */
  async createMany(items: CreateOperationInput[]): Promise<number> {
    if (items.length === 0) {
      return 0;
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      let insertedCount = 0;
      const sql = `
        INSERT INTO operations (
          quote_id,
          feature_id,
          standard_condition_id,
          sequence_no,
          operation_type,
          mode,
          tool_category,
          work_diameter,
          cutting_length,
          passes,
          vc,
          feed_per_rev,
          feed_per_tooth,
          ap,
          ae,
          rpm,
          feed_rate,
          cutting_time_sec,
          non_cutting_time_sec,
          total_time_sec,
          condition_source,
          is_manual_override
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      for (const item of items) {
        await connection.query<ResultSetHeader>(sql, [
          item.quoteId,
          item.featureId,
          null, // standard_condition_id (PHASE07で設定)
          item.sequenceNo,
          item.operationType,
          item.description, // mode カラムに説明を格納
          item.machineType, // tool_category カラムに設備分類を格納
          item.workDiameter,
          item.cuttingLength,
          1,    // passes
          0.00, // vc (PHASE07で計算)
          null, // feed_per_rev
          null, // feed_per_tooth
          null, // ap
          null, // ae
          0.00, // rpm (PHASE07で計算)
          0.00, // feed_rate (PHASE07で計算)
          0.000,// cutting_time_sec
          0.000,// non_cutting_time_sec
          0.000,// total_time_sec
          item.status, // condition_source カラムに状態を格納
          item.status === 'MANUAL' ? 1 : 0,
        ]);
        insertedCount++;
      }

      await connection.commit();
      return insertedCount;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * quote_id に紐づく工程一覧を取得
   */
  async findByQuoteId(quoteId: number): Promise<OperationRow[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM operations WHERE quote_id = ? ORDER BY sequence_no ASC`,
      [quoteId]
    );

    return rows as OperationRow[];
  }

  /**
   * ID で工程 1件を取得
   */
  async findById(id: number): Promise<OperationRow | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM operations WHERE id = ?`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return null;
    }

    return rows[0] as OperationRow;
  }

  /**
   * 工程の更新
   */
  async update(id: number, data: UpdateOperationInput): Promise<boolean> {
    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (data.sequenceNo !== undefined) {
      fields.push('sequence_no = ?');
      values.push(data.sequenceNo);
    }
    if (data.description !== undefined) {
      fields.push('mode = ?');
      values.push(data.description);
    }
    if (data.machineType !== undefined) {
      fields.push('tool_category = ?');
      values.push(data.machineType);
    }
    if (data.status !== undefined) {
      fields.push('condition_source = ?');
      values.push(data.status);
    }

    if (fields.length === 0) {
      return true;
    }

    fields.push('is_manual_override = 1');
    fields.push('updated_at = NOW()');
    values.push(id);

    const sql = `UPDATE operations SET ${fields.join(', ')} WHERE id = ?`;
    const [result] = await pool.query<ResultSetHeader>(sql, values);

    return result.affectedRows > 0;
  }

  /**
   * 工程の削除
   */
  async delete(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      `DELETE FROM operations WHERE id = ?`,
      [id]
    );

    return result.affectedRows > 0;
  }

  /**
   * quote_id に紐づく工程を一括削除
   */
  async deleteByQuoteId(quoteId: number): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      `DELETE FROM operations WHERE quote_id = ?`,
      [quoteId]
    );

    return result.affectedRows;
  }

  /**
   * quote_id に紐づく工程件数を取得
   */
  async countByQuoteId(quoteId: number): Promise<number> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM operations WHERE quote_id = ?`,
      [quoteId]
    );

    return Number(rows[0].count);
  }

  /**
   * 全件数を取得（テスト・検証用）
   */
  async count(): Promise<number> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM operations`
    );

    return Number(rows[0].count);
  }
}

export const operationRepository = new OperationRepository();
