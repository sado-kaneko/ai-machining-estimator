import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/database';
import { CreateFeatureInput, FeatureRow } from '../types/feature';

export class FeatureRepository {
  /**
   * features レコードを複数件一括登録する（トランザクション使用）
   */
  async createMany(items: CreateFeatureInput[]): Promise<number> {
    if (items.length === 0) {
      return 0;
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      let insertedCount = 0;
      const sql = `
        INSERT INTO features (
          analysis_id,
          sequence_no,
          feature_type,
          description,
          start_diameter,
          end_diameter,
          diameter,
          length,
          depth,
          width,
          thread_spec,
          count,
          tolerance_text,
          surface_roughness_text,
          needs_review,
          source_text
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      for (const item of items) {
        await connection.query<ResultSetHeader>(sql, [
          item.analysisId,
          item.sequenceNo,
          item.featureType,
          item.description,
          item.startDiameter,
          item.endDiameter,
          item.diameter,
          item.length,
          item.depth,
          item.width,
          item.threadSpec,
          item.count,
          item.toleranceText,
          item.surfaceRoughnessText,
          item.needsReview ? 1 : 0,
          item.sourceText,
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
   * analysis_id に紐づく features レコード一覧を取得
   */
  async findByAnalysisId(analysisId: number): Promise<FeatureRow[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM features WHERE analysis_id = ? ORDER BY sequence_no ASC`,
      [analysisId]
    );

    return rows as FeatureRow[];
  }

  /**
   * analysis_id に紐づく features レコード件数を取得
   */
  async countByAnalysisId(analysisId: number): Promise<number> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM features WHERE analysis_id = ?`,
      [analysisId]
    );

    return Number(rows[0].count);
  }

  /**
   * analysis_id に紐づく features レコードを削除
   */
  async deleteByAnalysisId(analysisId: number): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      `DELETE FROM features WHERE analysis_id = ?`,
      [analysisId]
    );

    return result.affectedRows;
  }

  /**
   * ID で Feature 1件を取得
   */
  async findById(id: number): Promise<FeatureRow | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM features WHERE id = ?`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return null;
    }

    return rows[0] as FeatureRow;
  }

  /**
   * Feature レコードの更新
   */
  async update(id: number, data: import('../types/feature').UpdateFeatureInput): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE features
       SET
         feature_type = ?,
         description = ?,
         diameter = ?,
         length = ?,
         depth = ?,
         needs_review = ?,
         updated_at = NOW()
       WHERE id = ?`,
      [
        data.featureType,
        data.description,
        data.diameter,
        data.length,
        data.depth,
        data.needsReview ? 1 : 0,
        id,
      ]
    );

    return result.affectedRows > 0;
  }

  /**
   * ID で Feature を1件削除
   */
  async deleteById(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      `DELETE FROM features WHERE id = ?`,
      [id]
    );

    return result.affectedRows > 0;
  }

  /**
   * 全件数を取得（テスト・検証用）
   */
  async count(): Promise<number> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM features`
    );

    return Number(rows[0].count);
  }
}

export const featureRepository = new FeatureRepository();
