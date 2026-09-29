import { Request, Response } from 'express';
import { cycleTimeService } from '../services/cycle-time.service';

export class CycleTimeController {
  /**
   * POST /api/quotes/:id/cycle-time/calculate
   * 案件のサイクルタイム計算を実行
   */
  async calculateCycleTime(req: Request, res: Response): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const quoteId = parseInt(rawId, 10);

      if (isNaN(quoteId) || quoteId <= 0) {
        res.status(400).json({
          error: {
            code: 'INVALID_ID',
            message: '有効な見積IDを指定してください。',
          },
        });
        return;
      }

      const result = await cycleTimeService.calculateCycleTime(quoteId);
      res.status(200).json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';

      if (message === 'QUOTE_NOT_FOUND') {
        res.status(404).json({
          error: {
            code: 'QUOTE_NOT_FOUND',
            message: '指定された見積案件が存在しません。',
          },
        });
        return;
      }

      if (message === 'NO_OPERATION_DATA') {
        res.status(400).json({
          error: {
            code: 'NO_OPERATION_DATA',
            message: '計算対象となる加工工程（operations）が存在しません。先に工程候補を生成してください。',
          },
        });
        return;
      }

      if (message === 'CONDITION_NOT_FOUND') {
        res.status(400).json({
          error: {
            code: 'CONDITION_NOT_FOUND',
            message: '該当する材質・加工種類の標準切削条件が見つかりませんでした。',
          },
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 'CALCULATION_FAILED',
          message: 'サイクルタイム計算処理に失敗しました。',
        },
      });
    }
  }

  /**
   * GET /api/quotes/:id/cycle-time
   * 案件のサイクルタイム計算結果を取得
   */
  async getCycleTime(req: Request, res: Response): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const quoteId = parseInt(rawId, 10);

      if (isNaN(quoteId) || quoteId <= 0) {
        res.status(400).json({
          error: {
            code: 'INVALID_ID',
            message: '有効な見積IDを指定してください。',
          },
        });
        return;
      }

      const result = await cycleTimeService.getCycleTime(quoteId);
      if (!result) {
        res.status(404).json({
          error: {
            code: 'CYCLE_TIME_NOT_FOUND',
            message: 'サイクルタイム計算結果がまだ登録されていません。',
          },
        });
        return;
      }

      res.status(200).json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';

      if (message === 'QUOTE_NOT_FOUND') {
        res.status(404).json({
          error: {
            code: 'QUOTE_NOT_FOUND',
            message: '指定された見積案件が存在しません。',
          },
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 'FETCH_FAILED',
          message: 'サイクルタイム計算結果の取得に失敗しました。',
        },
      });
    }
  }
}

export const cycleTimeController = new CycleTimeController();
