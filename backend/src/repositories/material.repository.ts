import { ResultSetHeader } from 'mysql2';
import { pool } from '../config/database';
import {
  MaterialInformationRow,
  SaveMaterialInformationRequest,
  UpdateMaterialInformationRequest,
} from '../types/material';

export class MaterialRepository {
  /**
   * 案件IDから素材情報を取得（最新1件）
   */
  async findByQuoteId(quoteId: number): Promise<MaterialInformationRow | null> {
    const query = `
      SELECT *
      FROM material_information
      WHERE quote_id = ?
      ORDER BY id DESC
      LIMIT 1
    `;
    const [rows] = await pool.query<MaterialInformationRow[]>(query, [quoteId]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * IDから素材情報を取得
   */
  async findById(id: number): Promise<MaterialInformationRow | null> {
    const query = `
      SELECT *
      FROM material_information
      WHERE id = ?
      LIMIT 1
    `;
    const [rows] = await pool.query<MaterialInformationRow[]>(query, [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * 素材情報新規登録
   */
  async create(quoteId: number, data: SaveMaterialInformationRequest): Promise<number> {
    const query = `
      INSERT INTO material_information (
        quote_id,
        material_name,
        material_standard,
        shape_type,
        diameter,
        width,
        height,
        length,
        weight,
        source,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    const values = [
      quoteId,
      data.materialName ?? null,
      data.materialStandard ?? null,
      data.shapeType ?? 'ROUND_BAR',
      data.diameter ?? null,
      data.width ?? null,
      data.height ?? null,
      data.length ?? null,
      data.weight ?? null,
      data.source ?? 'AI',
    ];

    const [result] = await pool.query<ResultSetHeader>(query, values);
    return result.insertId;
  }

  /**
   * 素材情報更新 (ID指定)
   */
  async update(id: number, data: UpdateMaterialInformationRequest): Promise<void> {
    const query = `
      UPDATE material_information
      SET
        material_name = ?,
        material_standard = ?,
        shape_type = ?,
        diameter = ?,
        width = ?,
        height = ?,
        length = ?,
        weight = ?,
        source = ?,
        updated_at = NOW()
      WHERE id = ?
    `;
    const values = [
      data.materialName ?? null,
      data.materialStandard ?? null,
      data.shapeType ?? 'ROUND_BAR',
      data.diameter ?? null,
      data.width ?? null,
      data.height ?? null,
      data.length ?? null,
      data.weight ?? null,
      data.source ?? 'MANUAL',
      id,
    ];

    await pool.query<ResultSetHeader>(query, values);
  }

  /**
   * 案件IDに対するUpsert（既存があれば更新、なければ新規作成）
   */
  async upsertByQuoteId(quoteId: number, data: SaveMaterialInformationRequest): Promise<number> {
    const existing = await this.findByQuoteId(quoteId);
    if (existing) {
      await this.update(existing.id, data);
      return existing.id;
    } else {
      return await this.create(quoteId, data);
    }
  }

  /**
   * 削除
   */
  async delete(id: number): Promise<void> {
    const query = `DELETE FROM material_information WHERE id = ?`;
    await pool.query<ResultSetHeader>(query, [id]);
  }
}

export const materialRepository = new MaterialRepository();
