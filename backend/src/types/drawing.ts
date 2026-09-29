// DBレコード型 (snake_case)
export interface DrawingRow {
  id: number;
  quote_id: number;
  original_name: string;
  stored_name: string;
  mime_type: string;
  file_size: number;
  file_path: string;
  sha256: string;
  created_at: Date;
  updated_at: Date | null;
}

// 単体・作成時レスポンスDTO (camelCase)
export interface DrawingDto {
  id: number;
  quoteId: number;
  originalName: string;
  storedName: string;
  fileSize: number;
  createdAt: string;
}

// 一覧取得時レスポンスDTO (camelCase)
export interface DrawingListItemDto {
  id: number;
  originalName: string;
  storedName: string;
  fileSize: number;
  createdAt: string;
}

// DBレコード挿入用入力型
export interface CreateDrawingRecordInput {
  quoteId: number;
  originalName: string;
  storedName: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  sha256: string;
}

export function toDrawingDto(row: DrawingRow): DrawingDto {
  return {
    id: Number(row.id),
    quoteId: Number(row.quote_id),
    originalName: row.original_name,
    storedName: row.stored_name,
    fileSize: Number(row.file_size),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

export function toDrawingListItemDto(row: DrawingRow): DrawingListItemDto {
  return {
    id: Number(row.id),
    originalName: row.original_name,
    storedName: row.stored_name,
    fileSize: Number(row.file_size),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}
