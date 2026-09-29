// DBレコード型 (snake_case)
export interface FeatureRow {
  id: number;
  analysis_id: number;
  sequence_no: number;
  feature_type: string;
  description: string | null;
  start_diameter: number | null;
  end_diameter: number | null;
  diameter: number | null;
  length: number | null;
  depth: number | null;
  width: number | null;
  thread_spec: string | null;
  count: number;
  tolerance_text: string | null;
  surface_roughness_text: string | null;
  needs_review: number; // TINYINT(1): 0 or 1
  source_text: string | null;
  created_at: Date;
  updated_at: Date | null;
}

// DBレコード挿入用入力型
export interface CreateFeatureInput {
  analysisId: number;
  sequenceNo: number;
  featureType: string;
  description: string | null;
  startDiameter: number | null;
  endDiameter: number | null;
  diameter: number | null;
  length: number | null;
  depth: number | null;
  width: number | null;
  threadSpec: string | null;
  count: number;
  toleranceText: string | null;
  surfaceRoughnessText: string | null;
  needsReview: boolean;
  sourceText: string | null;
}

// Feature単体DTO (camelCase)
export interface FeatureDto {
  id: number;
  analysisId: number;
  sequenceNo: number;
  featureType: string;
  description: string | null;
  diameter: number | null;
  length: number | null;
  depth: number | null;
  needsReview: boolean;
  sourceText: string | null;
  createdAt: string;
}

// Feature生成APIレスポンスDTO
export interface GenerateFeaturesResponseDto {
  analysisId: number;
  featureCount: number;
}

// Feature一覧取得APIレスポンスDTO
export interface FeatureListResponseDto {
  items: FeatureDto[];
}

export function toFeatureDto(row: FeatureRow): FeatureDto {
  return {
    id: Number(row.id),
    analysisId: Number(row.analysis_id),
    sequenceNo: Number(row.sequence_no),
    featureType: row.feature_type,
    description: row.description,
    diameter: row.diameter !== null ? Number(row.diameter) : null,
    length: row.length !== null ? Number(row.length) : null,
    depth: row.depth !== null ? Number(row.depth) : null,
    needsReview: Boolean(row.needs_review),
    sourceText: row.source_text,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}
