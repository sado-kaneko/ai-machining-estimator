import { Request, Response } from 'express';
import { calculationService } from '../services/calculation.service';
import { cycleTimeService } from '../services/cycle-time.service';

export class CalculationController {
  /**
   * GET /api/machines
   * 使用可能設備一覧取得
   */
  async getAllMachines(_req: Request, res: Response): Promise<void> {
    try {
      const machines = await calculationService.getAllMachines();
      res.status(200).json({ items: machines });
    } catch {
      res.status(500).json({
        error: { code: 'FETCH_FAILED', message: '設備一覧の取得に失敗しました。' },
      });
    }
  }

  /**
   * POST /api/quotes/:id/machine
   * 案件への加工機設定
   */
  async setQuoteMachine(req: Request, res: Response): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const quoteId = parseInt(rawId, 10);
      const machineId = parseInt(req.body?.machineId, 10);

      if (isNaN(quoteId) || quoteId <= 0 || isNaN(machineId) || machineId <= 0) {
        res.status(400).json({
          error: { code: 'INVALID_ID', message: '有効な見積IDおよび設備IDを指定してください。' },
        });
        return;
      }

      const result = await calculationService.setQuoteMachine(quoteId, machineId);
      res.status(200).json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message === 'QUOTE_NOT_FOUND') {
        res.status(404).json({ error: { code: 'QUOTE_NOT_FOUND', message: '指定された見積案件が存在しません。' } });
        return;
      }
      if (message === 'MACHINE_NOT_FOUND') {
        res.status(404).json({ error: { code: 'MACHINE_NOT_FOUND', message: '指定された設備が存在しません。' } });
        return;
      }
      res.status(500).json({ error: { code: 'UPDATE_FAILED', message: '加工機設定に失敗しました。' } });
    }
  }

  /**
   * GET /api/quotes/:id/machine
   * 案件に設定されている加工機取得
   */
  async getQuoteMachine(req: Request, res: Response): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const quoteId = parseInt(rawId, 10);

      if (isNaN(quoteId) || quoteId <= 0) {
        res.status(400).json({
          error: { code: 'INVALID_ID', message: '有効な見積IDを指定してください。' },
        });
        return;
      }

      const result = await calculationService.getQuoteMachine(quoteId);
      res.status(200).json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message === 'QUOTE_NOT_FOUND') {
        res.status(404).json({ error: { code: 'QUOTE_NOT_FOUND', message: '指定された見積案件が存在しません。' } });
        return;
      }
      res.status(500).json({ error: { code: 'FETCH_FAILED', message: '加工機設定の取得に失敗しました。' } });
    }
  }

  /**
   * POST /api/quotes/:id/cycle-time/calculate
   * 共通Engine経由でサイクルタイム計算を実行
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

      // 共通計算Engine実行
      const maxRpm = req.body?.maxRpm ? Number(req.body.maxRpm) : undefined;
      const result = await calculationService.calculateCycleTime(quoteId, { maxRpm });
      res.status(200).json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';

      if (message === 'QUOTE_NOT_FOUND') {
        res.status(404).json({ error: { code: 'QUOTE_NOT_FOUND', message: '指定された見積案件が存在しません。' } });
        return;
      }

      if (message === 'NO_OPERATION_DATA') {
        res.status(400).json({
          error: { code: 'NO_OPERATION_DATA', message: '計算対象となる加工工程が存在しません。先に工程候補を生成してください。' },
        });
        return;
      }

      if (message === 'CONDITION_NOT_FOUND') {
        res.status(400).json({
          error: { code: 'CONDITION_NOT_FOUND', message: '該当する材質・加工種類の標準切削条件が見つかりませんでした。' },
        });
        return;
      }

      if (message === 'ENGINE_NOT_IMPLEMENTED') {
        res.status(400).json({
          error: { code: 'ENGINE_NOT_IMPLEMENTED', message: '選択された設備の計算Engineは現在準備中です。' },
        });
        return;
      }

      res.status(500).json({
        error: { code: 'CALCULATION_FAILED', message: 'サイクルタイム計算処理に失敗しました。' },
      });
    }
  }

  /**
   * GET /api/quotes/:id/cycle-time
   * サイクルタイム計算結果取得
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

      const result = await cycleTimeService.getCycleTime(quoteId);
      if (!result) {
        res.status(404).json({
          error: { code: 'CYCLE_TIME_NOT_FOUND', message: 'サイクルタイム計算結果がまだ登録されていません。' },
        });
        return;
      }

      res.status(200).json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message === 'QUOTE_NOT_FOUND') {
        res.status(404).json({ error: { code: 'QUOTE_NOT_FOUND', message: '指定された見積案件が存在しません。' } });
        return;
      }
      res.status(500).json({ error: { code: 'FETCH_FAILED', message: 'サイクルタイム計算結果の取得に失敗しました。' } });
    }
  }
}

export const calculationController = new CalculationController();
