export interface Quote {
  id: number;
  quoteNo: string | null;
  customerName: string;
  partNo: string;
  partName: string;
  quantity: number;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface QuoteListResponse {
  items: Quote[];
}

export interface CreateQuoteRequest {
  quoteNo?: string | null;
  customerName: string;
  partNo?: string;
  partName?: string;
  quantity: number;
  status?: string;
  notes?: string | null;
}
