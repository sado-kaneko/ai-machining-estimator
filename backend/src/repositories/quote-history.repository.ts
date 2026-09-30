import { pool } from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { QuoteHistoryDto } from '../types/quote-management';

export class QuoteHistoryRepository {
  /**
   * 履歴記録
   */
  async recordHistory(
    quoteId: number,
    action: string,
    beforeData: any,
    afterData: any,
    createdBy: string = 'システム'
  ): Promise<number> {
    const beforeJson = beforeData ? JSON.stringify(beforeData) : null;
    const afterJson = afterData ? JSON.stringify(afterData) : null;

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO quote_history (quote_id, action, before_data, after_data, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [quoteId, action, beforeJson, afterJson, createdBy]
    );

    return result.insertId;
  }

  /**
   * 見積案件の履歴一覧取得 (最新順)
   */
  async findByQuoteId(quoteId: number): Promise<QuoteHistoryDto[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM quote_history WHERE quote_id = ? ORDER BY id DESC`,
      [quoteId]
    );

    return rows.map((r) => {
      let beforeData = null;
      let afterData = null;
      try {
        if (r.before_data) beforeData = JSON.parse(r.before_data);
      } catch {
        beforeData = r.before_data;
      }
      try {
        if (r.after_data) afterData = JSON.parse(r.after_data);
      } catch {
        afterData = r.after_data;
      }

      return {
        id: Number(r.id),
        quoteId: Number(r.quote_id),
        action: String(r.action),
        beforeData,
        afterData,
        createdBy: String(r.created_by || 'システム'),
        createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
      };
    });
  }
}

export const quoteHistoryRepository = new QuoteHistoryRepository();
