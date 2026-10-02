import { Request, Response } from 'express';
import { latheService } from '../services/lathe.service';

export class LatheController {
  /**
   * POST /api/quotes/:id/lathe-operations/generate
   */
  async generateOperations(req: Request, res: Response): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const quoteId = parseInt(rawId, 10);
      const force = Boolean(req.body?.force);

      if (isNaN(quoteId) || quoteId <= 0) {
        res.status(400).json({
          error: { code: 'INVALID_ID', message: '有効な見積IDを指定してください。' },
        });
        return;
      }

      const result = await latheService.generateLatheOperations(quoteId, force);
      res.status(200).json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';

      if (message === 'QUOTE_NOT_FOUND') {
        res.status(404).json({
          error: { code: 'QUOTE_NOT_FOUND', message: '指定された見積案件が存在しません。' },
        });
        return;
      }

      if (message === 'OPERATIONS_ALREADY_EXIST') {
        res.status(409).json({
          error: { code: 'OPERATIONS_ALREADY_EXIST', message: '既に自動旋盤工程が存在します。再生成する場合は確認フラグを指定してください。' },
        });
        return;
      }

      if (message === 'NO_CONFIRMED_FEATURES' || message === 'NO_VALID_OPERATIONS_GENERATED') {
        res.status(400).json({
          error: { code: 'NO_CONFIRMED_FEATURES', message: '有効な加工Featureが存在しません。' },
        });
        return;
      }

      res.status(500).json({
        error: { code: 'OPERATION_GENERATE_FAILED', message: '自動旋盤工程の生成に失敗しました。' },
      });
    }
  }

  /**
   * GET /api/quotes/:id/lathe-operations
   */
  async getOperations(req: Request, res: Response): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const quoteId = parseInt(rawId, 10);

      if (isNaN(quoteId) || quoteId <= 0) {
        res.status(400).json({
          error: { code: 'INVALID_ID', message: '有効な見積IDを指定してください。' },
        });
        return;
      }

      const items = await latheService.getLatheOperations(quoteId);
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
        error: { code: 'FETCH_FAILED', message: '自動旋盤工程一覧の取得に失敗しました。' },
      });
    }
  }

  /**
   * POST /api/quotes/:id/lathe-cycle-time/calculate
   */
  async calculateCycleTime(req: Request, res: Response): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const quoteId = parseInt(rawId, 10);

      if (isNaN(quoteId) || quoteId <= 0) {
        res.status(400).json({
          error: { code: 'INVALID_ID', message: '有効な見積IDを指定してください。' },
        });
        return;
      }

      const maxRpm = req.body?.maxRpm ? Number(req.body.maxRpm) : undefined;
      const result = await latheService.calculateLatheCycleTime(quoteId, { maxRpm });
      res.status(200).json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';

      if (message === 'QUOTE_NOT_FOUND') {
        res.status(404).json({
          error: { code: 'QUOTE_NOT_FOUND', message: '指定された見積案件が存在しません。' },
        });
        return;
      }

      if (message === 'NO_OPERATION_DATA') {
        res.status(400).json({
          error: { code: 'NO_OPERATION_DATA', message: '計算対象となる自動旋盤工程が存在しません。' },
        });
        return;
      }

      if (message === 'CONDITION_NOT_FOUND') {
        res.status(400).json({
          error: { code: 'CONDITION_NOT_FOUND', message: '切削条件マスタに該当する加工条件が登録されていません。' },
        });
        return;
      }

      res.status(500).json({
        error: { code: 'CALCULATION_FAILED', message: '自動旋盤サイクルタイムの計算に失敗しました。' },
      });
    }
  }

  /**
   * GET /api/quotes/:id/lathe-cycle-time
   */
  async getCycleTime(req: Request, res: Response): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const quoteId = parseInt(rawId, 10);

      if (isNaN(quoteId) || quoteId <= 0) {
        res.status(400).json({
          error: { code: 'INVALID_ID', message: '有効な見積IDを指定してください。' },
        });
        return;
      }

      const result = await latheService.getLatheCycleTime(quoteId);
      if (!result) {
        res.status(404).json({
          error: { code: 'CYCLE_TIME_NOT_FOUND', message: '自動旋盤サイクルタイム計算結果がまだありません。' },
        });
        return;
      }

      res.status(200).json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';

      if (message === 'QUOTE_NOT_FOUND') {
        res.status(404).json({
          error: { code: 'QUOTE_NOT_FOUND', message: '指定された見積案件が存在しません。' },
        });
        return;
      }

      res.status(500).json({
        error: { code: 'FETCH_FAILED', message: '自動旋盤サイクルタイムの取得に失敗しました。' },
      });
    }
  }

  // ==============================================================
  // PHASE12: マスタ取得 & 工程再生成ハンドラー
  // ==============================================================

  /**
   * GET /api/lathe-masters
   * NC自動旋盤マスタ一覧取得
   */
  async getMasters(req: Request, res: Response): Promise<void> {
    try {
      const result = await latheService.getLatheMasters();
      res.status(200).json(result);
    } catch (err: unknown) {
      res.status(500).json({
        error: { code: 'FETCH_MASTERS_FAILED', message: '自動旋盤マスタの取得に失敗しました。' },
      });
    }
  }

  /**
   * POST /api/quotes/:id/lathe-operations/regenerate
   * 最新マスタ基準で工程候補を強制再生成
   */
  async regenerateOperations(req: Request, res: Response): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const quoteId = parseInt(rawId, 10);

      if (isNaN(quoteId) || quoteId <= 0) {
        res.status(400).json({
          error: { code: 'INVALID_ID', message: '有効な見積IDを指定してください。' },
        });
        return;
      }

      const result = await latheService.regenerateLatheOperations(quoteId);
      res.status(200).json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';

      if (message === 'QUOTE_NOT_FOUND') {
        res.status(404).json({
          error: { code: 'QUOTE_NOT_FOUND', message: '指定された見積案件が存在しません。' },
        });
        return;
      }

      if (message === 'NO_CONFIRMED_FEATURES' || message === 'NO_VALID_OPERATIONS_GENERATED') {
        res.status(400).json({
          error: { code: 'NO_CONFIRMED_FEATURES', message: '有効な加工Featureが存在しません。' },
        });
        return;
      }

      res.status(500).json({
        error: { code: 'REGENERATE_FAILED', message: '自動旋盤工程の再生成に失敗しました。' },
      });
    }
  }
}

export const latheController = new LatheController();
