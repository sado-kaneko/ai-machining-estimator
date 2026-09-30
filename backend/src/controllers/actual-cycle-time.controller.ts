import { Request, Response } from 'express';
import { actualCycleTimeService } from '../services/actual-cycle-time.service';
import { createActualCycleTimeSchema } from '../schemas/actual-cycle-time.schema';

export class ActualCycleTimeController {
  /**
   * POST /api/quotes/:id/actual-cycle-times
   * 実績登録
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const quoteId = parseInt(rawId, 10);

      if (isNaN(quoteId) || quoteId <= 0) {
        res.status(400).json({
          error: { code: 'INVALID_ID', message: '有効な見積IDを指定してください。' },
        });
        return;
      }

      const parseResult = createActualCycleTimeSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: parseResult.error.issues[0]?.message || '入力データが不正です。',
            details: parseResult.error.issues,
          },
        });
        return;
      }

      const result = await actualCycleTimeService.createActualCycleTime(quoteId, parseResult.data);
      res.status(201).json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message === 'QUOTE_NOT_FOUND') {
        res.status(404).json({
          error: { code: 'QUOTE_NOT_FOUND', message: '指定された見積案件が存在しません。' },
        });
        return;
      }
      res.status(500).json({
        error: { code: 'CREATE_FAILED', message: '加工実績の登録に失敗しました。' },
      });
    }
  }

  /**
   * GET /api/quotes/:id/actual-cycle-times
   * 実績一覧取得
   */
  async getList(req: Request, res: Response): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const quoteId = parseInt(rawId, 10);

      if (isNaN(quoteId) || quoteId <= 0) {
        res.status(400).json({
          error: { code: 'INVALID_ID', message: '有効な見積IDを指定してください。' },
        });
        return;
      }

      const items = await actualCycleTimeService.getActualCycleTimes(quoteId);
      res.status(200).json({ items });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message === 'QUOTE_NOT_FOUND') {
        res.status(404).json({
          error: { code: 'QUOTE_NOT_FOUND', message: '指定された見積案件が存在しません。' },
        });
        return;
      }
      res.status(500).json({
        error: { code: 'FETCH_FAILED', message: '加工実績一覧の取得に失敗しました。' },
      });
    }
  }

  /**
   * GET /api/quotes/:id/cycle-time-comparison
   * 差異比較情報取得
   */
  async getComparison(req: Request, res: Response): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const quoteId = parseInt(rawId, 10);

      if (isNaN(quoteId) || quoteId <= 0) {
        res.status(400).json({
          error: { code: 'INVALID_ID', message: '有効な見積IDを指定してください。' },
        });
        return;
      }

      const result = await actualCycleTimeService.getCycleTimeComparison(quoteId);
      res.status(200).json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message === 'QUOTE_NOT_FOUND') {
        res.status(404).json({
          error: { code: 'QUOTE_NOT_FOUND', message: '指定された見積案件が存在しません。' },
        });
        return;
      }
      if (message === 'ESTIMATE_NOT_FOUND') {
        res.status(404).json({
          error: { code: 'ESTIMATE_NOT_FOUND', message: '見積サイクルタイムがまだ計算されていません。' },
        });
        return;
      }
      if (message === 'NO_ACTUAL_DATA') {
        res.status(404).json({
          error: { code: 'NO_ACTUAL_DATA', message: '登録されている加工実績がありません。' },
        });
        return;
      }
      res.status(500).json({
        error: { code: 'FETCH_FAILED', message: '差異比較情報の取得に失敗しました。' },
      });
    }
  }

  /**
   * DELETE /api/actual-cycle-times/:id
   * 実績削除
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const id = parseInt(rawId, 10);

      if (isNaN(id) || id <= 0) {
        res.status(400).json({
          error: { code: 'INVALID_ID', message: '有効な実績IDを指定してください。' },
        });
        return;
      }

      await actualCycleTimeService.deleteActualCycleTime(id);
      res.status(204).send();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message === 'ACTUAL_NOT_FOUND') {
        res.status(404).json({
          error: { code: 'ACTUAL_NOT_FOUND', message: '指定された実績レコードが存在しません。' },
        });
        return;
      }
      res.status(500).json({
        error: { code: 'DELETE_FAILED', message: '加工実績の削除に失敗しました。' },
      });
    }
  }
}

export const actualCycleTimeController = new ActualCycleTimeController();
