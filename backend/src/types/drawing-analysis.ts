// DBレコード型 (snake_case)
export interface DrawingAnalysisRow {
  id: number;
  drawing_id: number;
  model_name: string;
  prompt_version: string;
  analysis_status: string;
  part_type: string | null;
  material: string | null;
  stock_type: string | null;
  stock_diameter: number | null;
  stock_width: number | null;
  stock_height: number | null;
  stock_length: number | null;
  overall_length: number | null;
  raw_response: string | null;
  warnings: string | null;
  created_at: Date;
  updated_at: Date | null;
}

// DBレコード作成用入力型
export interface CreateDrawingAnalysisInput {
  drawingId: number;
  modelName: string;
  promptVersion: string;
  analysisStatus: string;
  partType: string | null;
  material: string | null;
  stockType: string | null;
  stockDiameter: number | null;
  stockWidth: number | null;
  stockHeight: number | null;
  stockLength: number | null;
  overallLength: number | null;
  rawResponse: string | null;
  warnings: string | null;
}

// APIレスポンスDTO
export interface DrawingAnalysisDto {
  id: number;
  drawingId: number;
  status: string;
  createdAt: string;
}

export function toDrawingAnalysisDto(row: DrawingAnalysisRow): DrawingAnalysisDto {
  return {
    id: Number(row.id),
    drawingId: Number(row.drawing_id),
    status: row.analysis_status,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

// 基本解析情報DTO（Frontend表示用）
export interface DrawingAnalysisDetailDto {
  id: number;
  drawingId: number;
  status: string;
  partType: string | null;
  material: string | null;
  stockDiameter: number | null;
  overallLength: number | null;
  recommendedMachine?: string | null;
  machineFeasibilityReason?: string | null;
  createdAt: string;
}

export function toDrawingAnalysisDetailDto(row: DrawingAnalysisRow): DrawingAnalysisDetailDto {
  let recommendedMachine: string | null = null;
  let machineFeasibilityReason: string | null = null;
  if (row.raw_response) {
    try {
      const parsed = JSON.parse(row.raw_response);
      recommendedMachine = parsed.recommendedMachine || null;
      machineFeasibilityReason = parsed.machineFeasibilityReason || null;
    } catch {
      // ignore
    }
  }

  return {
    id: Number(row.id),
    drawingId: Number(row.drawing_id),
    status: row.analysis_status,
    partType: row.part_type,
    material: row.material,
    stockDiameter: row.stock_diameter !== null ? Number(row.stock_diameter) : null,
    overallLength: row.overall_length !== null ? Number(row.overall_length) : null,
    recommendedMachine,
    machineFeasibilityReason,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}
