export type ShapeType = 'ROUND_BAR' | 'PLATE' | 'PIPE' | 'BLOCK' | 'OTHER';

export interface MaterialInformation {
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

export interface SaveMaterialRequest {
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

export interface UpdateMaterialRequest {
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
