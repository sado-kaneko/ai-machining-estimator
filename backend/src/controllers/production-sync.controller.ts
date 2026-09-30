import { Request, Response } from 'express';
import { productionSyncService } from '../services/production-sync.service';

export class ProductionSyncController {
  /**
   * POST /api/production-sync
   * sadoa生産実績同期実行
   */
  async sync(req: Request, res: Response): Promise<void> {
    try {
      const forceFullSync = req.body?.forceFullSync === true || req.query.force === 'true';
      const result = await productionSyncService.syncFromSadoa(forceFullSync);
      res.status(200).json(result);
    } catch (err: unknown) {
      console.error('Production sync error:', err);
      res.status(500).json({
        error: { code: 'SYNC_FAILED', message: '生産実績データの同期に失敗しました。' },
      });
    }
  }

  /**
   * GET /api/production-actual-records
   * 実績一覧取得
   */
  async getRecords(req: Request, res: Response): Promise<void> {
    try {
      const buban = typeof req.query.buban === 'string' ? req.query.buban : undefined;
      const machineName = typeof req.query.machineName === 'string' ? req.query.machineName : undefined;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
      const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : undefined;

      const items = await productionSyncService.getRecords({
        buban,
        machineName,
        limit,
        offset,
      });

      res.status(200).json({ items });
    } catch (err: unknown) {
      res.status(500).json({
        error: { code: 'FETCH_FAILED', message: '生産実績一覧の取得に失敗しました。' },
      });
    }
  }

  /**
   * GET /api/production-actual-records/:buban
   * 図番別実績取得
   */
  async getByBuban(req: Request, res: Response): Promise<void> {
    try {
      const rawBuban = Array.isArray(req.params.buban) ? req.params.buban[0] : req.params.buban;
      const buban = decodeURIComponent(rawBuban || '');

      if (!buban || buban.trim() === '') {
        res.status(400).json({
          error: { code: 'INVALID_BUBAN', message: '図番を指定してください。' },
        });
        return;
      }

      const items = await productionSyncService.getRecordsByBuban(buban);
      res.status(200).json({ buban, items });
    } catch (err: unknown) {
      res.status(500).json({
        error: { code: 'FETCH_FAILED', message: '図番別生産実績の取得に失敗しました。' },
      });
    }
  }

  /**
   * GET /api/quotes/:id/production-actual-records
   * 案件に紐づく過去実績取得
   */
  async getForQuote(req: Request, res: Response): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const quoteId = parseInt(rawId, 10);

      if (isNaN(quoteId) || quoteId <= 0) {
        res.status(400).json({
          error: { code: 'INVALID_ID', message: '有効な見積IDを指定してください。' },
        });
        return;
      }

      const items = await productionSyncService.getRecordsForQuote(quoteId);
      res.status(200).json({ quoteId, items });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message === 'QUOTE_NOT_FOUND') {
        res.status(404).json({
          error: { code: 'QUOTE_NOT_FOUND', message: '指定された見積案件が存在しません。' },
        });
        return;
      }
      res.status(500).json({
        error: { code: 'FETCH_FAILED', message: '案件過去実績の取得に失敗しました。' },
      });
    }
  }

  /**
   * POST /api/quotes/:id/drawing-mapping
   * 案件と図番の手動マッピング
   */
  async mapDrawing(req: Request, res: Response): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const quoteId = parseInt(rawId, 10);
      const buban = req.body?.buban;

      if (isNaN(quoteId) || quoteId <= 0 || !buban || typeof buban !== 'string') {
        res.status(400).json({
          error: { code: 'INVALID_PARAM', message: '案件IDおよび図番を指定してください。' },
        });
        return;
      }

      await productionSyncService.mapQuoteToBuban(quoteId, buban);
      res.status(200).json({ success: true, message: '図番マッピングを登録しました。' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message === 'QUOTE_NOT_FOUND') {
        res.status(404).json({
          error: { code: 'QUOTE_NOT_FOUND', message: '指定された見積案件が存在しません。' },
        });
        return;
      }
      res.status(500).json({
        error: { code: 'MAPPING_FAILED', message: '図番マッピングの登録に失敗しました。' },
      });
    }
  }
}

export const productionSyncController = new ProductionSyncController();
