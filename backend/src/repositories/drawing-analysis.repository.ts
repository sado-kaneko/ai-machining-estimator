import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/database';
import { CreateDrawingAnalysisInput, DrawingAnalysisRow } from '../types/drawing-analysis';

export class DrawingAnalysisRepository {
  /**
   * 図面解析結果を登録
   */
  async create(data: CreateDrawingAnalysisInput): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO drawing_analyses (
        drawing_id,
        model_name,
        prompt_version,
        analysis_status,
        part_type,
        material,
        stock_type,
        stock_diameter,
        stock_width,
        stock_height,
        stock_length,
        overall_length,
        raw_response,
        warnings
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.drawingId,
        data.modelName,
        data.promptVersion,
        data.analysisStatus,
        data.partType,
        data.material,
        data.stockType,
        data.stockDiameter,
        data.stockWidth,
        data.stockHeight,
        data.stockLength,
        data.overallLength,
        data.rawResponse,
        data.warnings,
      ]
    );

    return result.insertId;
  }

  /**
   * IDで解析結果を取得
   */
  async findById(id: number): Promise<DrawingAnalysisRow | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM drawing_analyses WHERE id = ?`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return null;
    }

    return rows[0] as DrawingAnalysisRow;
  }

  /**
   * drawing_idで最新の解析結果を取得
   */
  async findLatestByDrawingId(drawingId: number): Promise<DrawingAnalysisRow | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM drawing_analyses WHERE drawing_id = ? ORDER BY id DESC LIMIT 1`,
      [drawingId]
    );

    if (!rows || rows.length === 0) {
      return null;
    }

    return rows[0] as DrawingAnalysisRow;
  }

  /**
   * drawing_idに紐づく解析結果一覧を取得
   */
  async findByDrawingId(drawingId: number): Promise<DrawingAnalysisRow[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM drawing_analyses WHERE drawing_id = ? ORDER BY id DESC`,
      [drawingId]
    );

    return rows as DrawingAnalysisRow[];
  }

  /**
   * IDで解析結果を削除
   */
  async delete(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      `DELETE FROM drawing_analyses WHERE id = ?`,
      [id]
    );

    return result.affectedRows > 0;
  }

  /**
   * 全件数を取得（テスト・検証用）
   */
  async count(): Promise<number> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM drawing_analyses`
    );
    return Number(rows[0].count);
  }
}

export const drawingAnalysisRepository = new DrawingAnalysisRepository();
