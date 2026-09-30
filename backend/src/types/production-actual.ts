/**
 * PHASE14: 生産実績DB連携・補正学習データ蓄積基盤 型定義
 */

/**
 * sadoa DB (d_nkoutei, hdata, tokui, d_nkakou) 取得Raw行
 */
export interface SadoaSourceRow {
  source_recno: number;
  buban: string | null;
  hd_hinmei: string | null;
  to_ryaku: string | null;
  kimei: string | null;
  komei: string | null;
  ins_tamei: string | null;
  zai_renban: number | null;
  zai_mei: string | null;
  zai_kei: string | number | null;
  zai_kosa: string | null;
  first_hiduke: Date | string | null;
  last_hiduke: Date | string | null;
  cycle_time: number | null;
  kakosu: number | string | null;
}

/**
 * production_actual_records テーブルのエンティティ
 */
export interface ProductionActualRecord {
  id: number;
  sourceRecno: number;
  buban: string | null;
  hinmei: string | null;
  customer: string | null;
  machineName: string | null;
  processName: string | null;
  operatorName: string | null;
  materialName: string | null;
  materialDiameter: number | null;
  materialTolerance: string | null;
  startDatetime: string | null;
  endDatetime: string | null;
  cycleTimeSec: number | null;
  quantity: number;
  totalTimeSec: number;
  createdAt: string;
  updatedAt: string | null;
}

/**
 * drawing_number_mapping テーブルのエンティティ
 */
export interface DrawingNumberMapping {
  id: number;
  buban: string;
  quoteId: number;
  createdAt: string;
}

/**
 * 同期処理の結果サマリ
 */
export interface ProductionSyncResult {
  success: boolean;
  totalFetched: number;
  syncedCount: number;
  skippedCount: number;
  latestSourceRecno: number | null;
  durationMs: number;
  message: string;
}

/**
 * 実績検索フィルタ
 */
export interface ProductionActualFilter {
  buban?: string;
  machineName?: string;
  limit?: number;
  offset?: number;
}
