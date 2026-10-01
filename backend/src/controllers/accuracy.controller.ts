import { Request, Response } from 'express';
import { accuracyService } from '../services/accuracy.service';

export class AccuracyController {
  /**
   * POST /api/accuracy/execute
   * 精度評価の一括実行 (未評価案件の照合・登録)
   */
  async executeEvaluation(req: Request, res: Response): Promise<void> {
    try {
      const result = await accuracyService.executeAccuracyEvaluation();
      res.status(200).json(result);
    } catch (err: unknown) {
      console.error('Error executing accuracy evaluation:', err);
      res.status(500).json({ error: { code: 'EXECUTE_FAILED', message: '精度評価の実行に失敗しました。' } });
    }
  }

  /**
   * GET /api/accuracy/summary
   * 全体KPIサマリ取得
   */
  async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const summary = await accuracyService.getSummary();
      res.status(200).json(summary);
    } catch (err: unknown) {
      console.error('Error fetching accuracy summary:', err);
      res.status(500).json({ error: { code: 'FETCH_FAILED', message: '全体KPIの取得に失敗しました。' } });
    }
  }

  /**
   * GET /api/accuracy/machines
   * 設備別精度取得
   */
  async getMachineAccuracy(req: Request, res: Response): Promise<void> {
    try {
      const machines = await accuracyService.getMachineAccuracy();
      res.status(200).json({ machines });
    } catch (err: unknown) {
      console.error('Error fetching machine accuracy:', err);
      res.status(500).json({ error: { code: 'FETCH_FAILED', message: '設備別精度の取得に失敗しました。' } });
    }
  }

  /**
   * GET /api/accuracy/materials
   * 材料別精度取得
   */
  async getMaterialAccuracy(req: Request, res: Response): Promise<void> {
    try {
      const materials = await accuracyService.getMaterialAccuracy();
      res.status(200).json({ materials });
    } catch (err: unknown) {
      console.error('Error fetching material accuracy:', err);
      res.status(500).json({ error: { code: 'FETCH_FAILED', message: '材料別精度の取得に失敗しました。' } });
    }
  }

  /**
   * GET /api/accuracy/trends
   * 月別推移取得
   */
  async getMonthlyTrends(req: Request, res: Response): Promise<void> {
    try {
      const trends = await accuracyService.getMonthlyTrends();
      res.status(200).json({ trends });
    } catch (err: unknown) {
      console.error('Error fetching accuracy trends:', err);
      res.status(500).json({ error: { code: 'FETCH_FAILED', message: '月別精度の取得に失敗しました。' } });
    }
  }

  /**
   * GET /api/accuracy/correction-effect
   * 補正効果比較取得
   */
  async getCorrectionEffect(req: Request, res: Response): Promise<void> {
    try {
      const effect = await accuracyService.getCorrectionEffect();
      res.status(200).json(effect);
    } catch (err: unknown) {
      console.error('Error fetching correction effect:', err);
      res.status(500).json({ error: { code: 'FETCH_FAILED', message: '補正効果の取得に失敗しました。' } });
    }
  }

  /**
   * GET /api/accuracy/candidates
   * 補正改善候補一覧取得
   */
  async getCandidates(req: Request, res: Response): Promise<void> {
    try {
      const candidates = await accuracyService.getImprovementCandidates();
      res.status(200).json({ candidates });
    } catch (err: unknown) {
      console.error('Error fetching improvement candidates:', err);
      res.status(500).json({ error: { code: 'FETCH_FAILED', message: '改善候補の取得に失敗しました。' } });
    }
  }

  /**
   * POST /api/accuracy/candidates/:id/apply
   * 改善候補の承認 & 適用
   */
  async applyCandidate(req: Request, res: Response): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const factorId = parseInt(rawId, 10);
      const suggestedFactor = parseFloat(String(req.body.suggestedFactor));
      const operatorName = String(req.body.operatorName || '技術担当者');

      if (isNaN(factorId) || isNaN(suggestedFactor) || suggestedFactor <= 0) {
        res.status(400).json({ error: { code: 'INVALID_INPUT', message: '有効な補正係数を指定してください。' } });
        return;
      }

      await accuracyService.applyImprovementCandidate(factorId, suggestedFactor, operatorName);
      res.status(200).json({
        message: `補正係数を ${suggestedFactor} に承認・更新しました。`,
      });
    } catch (err: unknown) {
      console.error('Error applying candidate factor:', err);
      res.status(500).json({ error: { code: 'APPLY_FAILED', message: '改善候補の適用に失敗しました。' } });
    }
  }

  /**
   * GET /api/accuracy/records
   * 精度評価明細レコード一覧取得
   */
  async getRecords(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 100;
      const records = await accuracyService.getAllRecords(isNaN(limit) ? 100 : limit);
      res.status(200).json({ records });
    } catch (err: unknown) {
      console.error('Error fetching accuracy records:', err);
      res.status(500).json({ error: { code: 'FETCH_FAILED', message: '明細レコードの取得に失敗しました。' } });
    }
  }
}

export const accuracyController = new AccuracyController();
