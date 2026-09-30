import { RowDataPacket } from 'mysql2';

/**
 * 素材形状区分
 */
export type ShapeType = 'ROUND_BAR' | 'PLATE' | 'PIPE' | 'BLOCK' | 'OTHER';

/**
 * 情報取得元区分
 */
export type MaterialSource = 'AI' | 'MANUAL';

/**
 * material_information テーブルの行定義
 */
export interface MaterialInformationRow extends RowDataPacket {
  id: number;
  quote_id: number;
  material_name: string | null;
  material_standard: string | null;
  shape_type: ShapeType;
  diameter: number | null;
  width: number | null;
  height: number | null;
  length: number | null;
  weight: number | null;
  source: string;
  created_at: string;
  updated_at: string | null;
}

/**
 * 素材情報DTO (APIレスポンス)
 */
export interface MaterialInformationDto {
  id: number;
  quoteId: number;
  materialName: string | null;
  materialStandard: string | null;
  shapeType: ShapeType;
  diameter: number | null;
  width: number | null;
  height: number | null;
  length: number | null;
  weight: number | null;
  source: string;
  createdAt: string;
  updatedAt: string | null;
}

/**
 * 素材情報登録/更新リクエストDTO
 */
export interface SaveMaterialInformationRequest {
  materialName?: string | null;
  materialStandard?: string | null;
  shapeType?: ShapeType;
  diameter?: number | null;
  width?: number | null;
  height?: number | null;
  length?: number | null;
  weight?: number | null;
  source?: string;
}

/**
 * 素材情報更新リクエストDTO
 */
export interface UpdateMaterialInformationRequest {
  materialName?: string | null;
  materialStandard?: string | null;
  shapeType?: ShapeType;
  diameter?: number | null;
  width?: number | null;
  height?: number | null;
  length?: number | null;
  weight?: number | null;
  source?: string;
}
