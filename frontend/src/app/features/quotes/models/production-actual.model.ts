/**
 * PHASE14: 生産実績DB連携・補正学習データ蓄積基盤 フロントエンドモデル
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

export interface ProductionSyncResult {
  success: boolean;
  totalFetched: number;
  syncedCount: number;
  skippedCount: number;
  latestSourceRecno: number | null;
  durationMs: number;
  message: string;
}
