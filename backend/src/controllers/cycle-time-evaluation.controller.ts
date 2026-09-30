import { Request, Response } from 'express';
import { cycleTimeEvaluationService } from '../services/cycle-time-evaluation.service';
import { CreateCycleTimeEvaluationSchema } from '../schemas/cycle-time-evaluation.schema';

export class CycleTimeEvaluationController {
  /**
   * POST /api/quotes/:id/cycle-time-evaluations
   * 評価登録
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

      const parseResult = CreateCycleTimeEvaluationSchema.safeParse(req.body);
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

      const result = await cycleTimeEvaluationService.createEvaluation(quoteId, parseResult.data);
      res.status(201).json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message === 'QUOTE_NOT_FOUND') {
        res.status(404).json({
          error: { code: 'QUOTE_NOT_FOUND', message: '指定された見積案件が存在しません。' },
        });
        return;
      }
      if (message === 'CALCULATED_CYCLE_TIME_REQUIRED') {
        res.status(400).json({
          error: { code: 'CALCULATED_CYCLE_TIME_REQUIRED', message: 'Web計算サイクルタイムがまだ算出されていません。先に計算を実行してください。' },
        });
        return;
      }
      res.status(500).json({
        error: { code: 'CREATE_FAILED', message: '計算精度評価の登録に失敗しました。' },
      });
    }
  }

  /**
   * GET /api/quotes/:id/cycle-time-evaluations
   * 評価一覧取得
   */
  async getByQuoteId(req: Request, res: Response): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const quoteId = parseInt(rawId, 10);

      if (isNaN(quoteId) || quoteId <= 0) {
        res.status(400).json({
          error: { code: 'INVALID_ID', message: '有効な見積IDを指定してください。' },
        });
        return;
      }

      const list = await cycleTimeEvaluationService.getEvaluationsByQuoteId(quoteId);
      res.status(200).json({ items: list });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message === 'QUOTE_NOT_FOUND') {
        res.status(404).json({
          error: { code: 'QUOTE_NOT_FOUND', message: '指定された見積案件が存在しません。' },
        });
        return;
      }
      res.status(500).json({
        error: { code: 'FETCH_FAILED', message: '評価一覧の取得に失敗しました。' },
      });
    }
  }

  /**
   * GET /api/lathe-correction-factors
   * 補正係数一覧取得
   */
  async getCorrectionFactors(req: Request, res: Response): Promise<void> {
    try {
      const factors = await cycleTimeEvaluationService.getAllCorrectionFactors();
      res.status(200).json({ items: factors });
    } catch (err: unknown) {
      res.status(500).json({
        error: { code: 'FETCH_FAILED', message: '補正係数の取得に失敗しました。' },
      });
    }
  }
}

export const cycleTimeEvaluationController = new CycleTimeEvaluationController();
