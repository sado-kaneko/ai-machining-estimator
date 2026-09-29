import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/database';
import { CreateQuoteInput, QuoteRow, UpdateQuoteInput } from '../types/quote';

export class QuoteRepository {
  /**
   * 見積一覧取得 (最大100件、id DESC)
   */
  async findAll(limit: number = 100): Promise<QuoteRow[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, quote_no, customer_name, part_no, part_name, quantity, status, notes, created_at, updated_at FROM quotes ORDER BY id DESC LIMIT ?',
      [limit]
    );
    return rows as QuoteRow[];
  }

  /**
   * 見積1件取得
   */
  async findById(id: number): Promise<QuoteRow | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, quote_no, customer_name, part_no, part_name, quantity, status, notes, created_at, updated_at FROM quotes WHERE id = ?',
      [id]
    );
    if (!rows || rows.length === 0) {
      return null;
    }
    return rows[0] as QuoteRow;
  }

  /**
   * 見積新規作成
   */
  async create(input: CreateQuoteInput): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO quotes (
        quote_no, customer_name, part_no, part_name, quantity, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        input.quoteNo ?? null,
        input.customerName,
        input.partNo ?? '',
        input.partName ?? '',
        input.quantity,
        input.status ?? 'DRAFT',
        input.notes ?? null,
      ]
    );
    return result.insertId;
  }

  /**
   * 見積更新 (updated_atはNOW()で明示的更新)
   */
  async update(id: number, input: UpdateQuoteInput): Promise<boolean> {
    // 既存レコードを取得して差分マージ
    const current = await this.findById(id);
    if (!current) {
      return false;
    }

    const newQuoteNo = input.quoteNo !== undefined ? input.quoteNo : current.quote_no;
    const newCustomerName = input.customerName !== undefined ? input.customerName : current.customer_name;
    const newPartNo = input.partNo !== undefined ? input.partNo : current.part_no;
    const newPartName = input.partName !== undefined ? input.partName : current.part_name;
    const newQuantity = input.quantity !== undefined ? input.quantity : current.quantity;
    const newStatus = input.status !== undefined ? input.status : current.status;
    const newNotes = input.notes !== undefined ? input.notes : current.notes;

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE quotes SET
        quote_no = ?,
        customer_name = ?,
        part_no = ?,
        part_name = ?,
        quantity = ?,
        status = ?,
        notes = ?,
        updated_at = NOW()
      WHERE id = ?`,
      [newQuoteNo, newCustomerName, newPartNo, newPartName, newQuantity, newStatus, newNotes, id]
    );

    return result.affectedRows > 0;
  }

  /**
   * 見積削除
   */
  async delete(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM quotes WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }
}

export const quoteRepository = new QuoteRepository();
