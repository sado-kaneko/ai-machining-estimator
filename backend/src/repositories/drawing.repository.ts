import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/database';
import { CreateDrawingRecordInput, DrawingRow } from '../types/drawing';

export class DrawingRepository {
  /**
   * 図面新規登録
   */
  async create(data: CreateDrawingRecordInput): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO drawings (
        quote_id, original_name, stored_name, mime_type, file_size, file_path, sha256
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.quoteId,
        data.originalName,
        data.storedName,
        data.mimeType,
        data.fileSize,
        data.filePath,
        data.sha256,
      ]
    );
    return result.insertId;
  }

  /**
   * 見積案件ごとの図面一覧取得
   */
  async findByQuoteId(quoteId: number): Promise<DrawingRow[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, quote_id, original_name, stored_name, mime_type, file_size, file_path, sha256, created_at, updated_at
       FROM drawings
       WHERE quote_id = ?
       ORDER BY id DESC`,
      [quoteId]
    );
    return rows as DrawingRow[];
  }

  /**
   * 図面1件取得
   */
  async findById(id: number): Promise<DrawingRow | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, quote_id, original_name, stored_name, mime_type, file_size, file_path, sha256, created_at, updated_at
       FROM drawings
       WHERE id = ?`,
      [id]
    );
    if (!rows || rows.length === 0) {
      return null;
    }
    return rows[0] as DrawingRow;
  }

  /**
   * 図面削除
   */
  async delete(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM drawings WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }
}

export const drawingRepository = new DrawingRepository();
