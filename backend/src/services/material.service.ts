import { materialRepository } from '../repositories/material.repository';
import { quoteRepository } from '../repositories/quote.repository';
import {
  MaterialInformationDto,
  MaterialInformationRow,
  SaveMaterialInformationRequest,
  UpdateMaterialInformationRequest,
} from '../types/material';

export class MaterialService {
  /**
   * DB行をDTOに変換
   */
  private toDto(row: MaterialInformationRow): MaterialInformationDto {
    return {
      id: row.id,
      quoteId: row.quote_id,
      materialName: row.material_name,
      materialStandard: row.material_standard,
      shapeType: row.shape_type,
      diameter: row.diameter !== null ? Number(row.diameter) : null,
      width: row.width !== null ? Number(row.width) : null,
      height: row.height !== null ? Number(row.height) : null,
      length: row.length !== null ? Number(row.length) : null,
      weight: row.weight !== null ? Number(row.weight) : null,
      source: row.source,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * 案件IDから素材情報を取得
   */
  async getMaterialByQuoteId(quoteId: number): Promise<MaterialInformationDto | null> {
    const quote = await quoteRepository.findById(quoteId);
    if (!quote) {
      throw new Error('QUOTE_NOT_FOUND');
    }

    const row = await materialRepository.findByQuoteId(quoteId);
    if (!row) {
      return null;
    }
    return this.toDto(row);
  }

  /**
   * 案件に対する素材情報登録（またはUpsert）
   */
  async saveMaterialForQuote(
    quoteId: number,
    data: SaveMaterialInformationRequest
  ): Promise<MaterialInformationDto> {
    const quote = await quoteRepository.findById(quoteId);
    if (!quote) {
      throw new Error('QUOTE_NOT_FOUND');
    }

    const targetId = await materialRepository.upsertByQuoteId(quoteId, data);
    const updated = await materialRepository.findById(targetId);
    if (!updated) {
      throw new Error('MATERIAL_RECORD_NOT_FOUND');
    }
    return this.toDto(updated);
  }

  /**
   * 素材情報更新 (ID指定)
   */
  async updateMaterial(
    id: number,
    data: UpdateMaterialInformationRequest
  ): Promise<MaterialInformationDto> {
    const existing = await materialRepository.findById(id);
    if (!existing) {
      throw new Error('MATERIAL_NOT_FOUND');
    }

    await materialRepository.update(id, data);
    const updated = await materialRepository.findById(id);
    if (!updated) {
      throw new Error('MATERIAL_RECORD_NOT_FOUND');
    }
    return this.toDto(updated);
  }
}

export const materialService = new MaterialService();
