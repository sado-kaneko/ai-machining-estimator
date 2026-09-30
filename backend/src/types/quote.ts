// DBレコード型 (snake_case)
export interface QuoteRow {
  id: number;
  quote_no: string | null;
  customer_name: string;
  part_no: string;
  part_name: string;
  quantity: number;
  material?: string | null;
  status: string;
  notes: string | null;
  created_by?: string | null;
  created_at: Date;
  updated_at: Date | null;
}

// APIレスポンスDTO型 (camelCase)
export interface QuoteDto {
  id: number;
  quoteNo: string | null;
  customerName: string;
  partNo: string;
  partName: string;
  quantity: number;
  material?: string | null;
  status: string;
  notes: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string | null;
}

// 新規作成用入力型
export interface CreateQuoteInput {
  quoteNo?: string | null;
  customerName: string;
  partNo?: string;
  partName?: string;
  quantity: number;
  material?: string | null;
  status?: string;
  notes?: string | null;
  createdBy?: string | null;
}

// 更新用入力型
export interface UpdateQuoteInput {
  quoteNo?: string | null;
  customerName?: string;
  partNo?: string;
  partName?: string;
  quantity?: number;
  material?: string | null;
  status?: string;
  notes?: string | null;
  createdBy?: string | null;
}

/**
 * DBレコードをAPIレスポンスDTOへ変換するヘルパー関数
 */
export function toQuoteDto(row: QuoteRow): QuoteDto {
  return {
    id: Number(row.id),
    quoteNo: row.quote_no,
    customerName: row.customer_name,
    partNo: row.part_no,
    partName: row.part_name,
    quantity: Number(row.quantity),
    material: row.material ?? null,
    status: row.status,
    notes: row.notes,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : (row.updated_at ? String(row.updated_at) : null),
  };
}
