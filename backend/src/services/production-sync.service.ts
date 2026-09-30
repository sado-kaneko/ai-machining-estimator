import { productionActualRepository } from '../repositories/production-actual.repository';
import { quoteRepository } from '../repositories/quote.repository';
import {
  ProductionActualRecord,
  ProductionSyncResult,
  ProductionActualFilter,
} from '../types/production-actual';

export class ProductionSyncService {
  /**
   * sadoa DB から実績を取得し、自DBへ同期・保存する
   * @param forceFullSync trueの場合、最新recnoに依らず全件/初期条件で取得
   */
  async syncFromSadoa(forceFullSync: boolean = false): Promise<ProductionSyncResult> {
    const startTime = Date.now();

    // 差分同期の起点recnoを特定
    let sinceRecno: number | null = null;
    if (!forceFullSync) {
      sinceRecno = await productionActualRepository.getMaxSourceRecno();
    }

    // sadoa からレコード取得 (Citizen Cincom L20, M16, M32 を対象)
    const rawRows = await productionActualRepository.fetchFromSadoa(sinceRecno, [
      'L20',
      'M16',
      'M32',
    ]);

    let syncedCount = 0;
    let skippedCount = 0;
    let maxRecno: number | null = sinceRecno;

    for (const r of rawRows) {
      try {
        const cycleTimeSec = r.cycle_time !== null && !isNaN(Number(r.cycle_time)) ? Number(r.cycle_time) : null;
        const quantity = r.kakosu !== null && !isNaN(Number(r.kakosu)) ? Math.max(0, parseInt(String(r.kakosu), 10)) : 0;

        // 指示書第8節: 総加工時間 total_time_sec = cycle_time_sec * quantity
        let totalTimeSec = 0;
        if (cycleTimeSec !== null && cycleTimeSec > 0 && quantity > 0) {
          totalTimeSec = Math.round(cycleTimeSec * quantity * 1000) / 1000;
        }

        // 材料径パース
        let materialDiameter: number | null = null;
        if (r.zai_kei !== null && r.zai_kei !== undefined) {
          const parsed = parseFloat(String(r.zai_kei).trim());
          if (!isNaN(parsed)) {
            materialDiameter = parsed;
          }
        }

        // 開始・終了日時
        const startDatetime = r.first_hiduke ? new Date(r.first_hiduke) : null;
        const endDatetime = r.last_hiduke ? new Date(r.last_hiduke) : null;

        await productionActualRepository.upsertProductionRecord({
          sourceRecno: Number(r.source_recno),
          buban: r.buban ? String(r.buban).trim() : null,
          hinmei: r.hd_hinmei ? String(r.hd_hinmei).trim() : null,
          customer: r.to_ryaku ? String(r.to_ryaku).trim() : null,
          machineName: r.kimei ? String(r.kimei).trim() : null,
          processName: r.komei ? String(r.komei).trim() : null,
          operatorName: r.ins_tamei ? String(r.ins_tamei).trim() : null,
          materialName: r.zai_mei ? String(r.zai_mei).trim() : null,
          materialDiameter,
          materialTolerance: r.zai_kosa ? String(r.zai_kosa).trim() : null,
          startDatetime,
          endDatetime,
          cycleTimeSec,
          quantity,
          totalTimeSec,
        });

        syncedCount++;
        if (maxRecno === null || Number(r.source_recno) > maxRecno) {
          maxRecno = Number(r.source_recno);
        }
      } catch (err) {
        skippedCount++;
        // 個別エラーが発生しても処理を継続
      }
    }

    const durationMs = Date.now() - startTime;
    const message = `sadoa生産実績同期完了: 取得${rawRows.length}件、同期${syncedCount}件、スキップ${skippedCount}件 (${durationMs}ms)`;

    return {
      success: true,
      totalFetched: rawRows.length,
      syncedCount,
      skippedCount,
      latestSourceRecno: maxRecno,
      durationMs,
      message,
    };
  }

  /**
   * 実績レコード一覧取得
   */
  async getRecords(filter: ProductionActualFilter = {}): Promise<ProductionActualRecord[]> {
    return await productionActualRepository.findRecords(filter);
  }

  /**
   * 図番から実績レコードを取得
   */
  async getRecordsByBuban(buban: string): Promise<ProductionActualRecord[]> {
    if (!buban || buban.trim() === '') {
      return [];
    }
    return await productionActualRepository.findByBuban(buban.trim());
  }

  /**
   * 案件情報に関連する過去実績レコードを取得
   * quote.part_no または drawing_number_mapping から図番を特定して実績を検索
   */
  async getRecordsForQuote(quoteId: number): Promise<ProductionActualRecord[]> {
    const quote = await quoteRepository.findById(quoteId);
    if (!quote) {
      throw new Error('QUOTE_NOT_FOUND');
    }

    const candidates = new Set<string>();

    if (quote.part_no && quote.part_no.trim() !== '') {
      candidates.add(quote.part_no.trim());
    }

    // マッピングされた図番も追加
    const mappings = await productionActualRepository.findMappingsByQuoteId(quoteId);
    for (const m of mappings) {
      if (m.buban && m.buban.trim() !== '') {
        candidates.add(m.buban.trim());
      }
    }

    const results: ProductionActualRecord[] = [];
    const seenIds = new Set<number>();

    for (const buban of candidates) {
      const records = await productionActualRepository.findByBuban(buban);
      for (const rec of records) {
        if (!seenIds.has(rec.id)) {
          seenIds.add(rec.id);
          results.push(rec);
        }
      }
    }

    return results;
  }

  /**
   * 案件と図番をマッピング
   */
  async mapQuoteToBuban(quoteId: number, buban: string): Promise<void> {
    const quote = await quoteRepository.findById(quoteId);
    if (!quote) {
      throw new Error('QUOTE_NOT_FOUND');
    }
    await productionActualRepository.upsertDrawingMapping(buban.trim(), quoteId);
  }
}

export const productionSyncService = new ProductionSyncService();
