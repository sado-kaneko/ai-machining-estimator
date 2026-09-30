import { Request, Response } from 'express';
import { correctionService } from '../services/correction.service';

export class CorrectionController {
  /**
   * GET /api/correction/preview
   * 適用予定の補正係数・補正後CTをプレビュー (指示書第12節)
   */
  async preview(req: Request, res: Response): Promise<void> {
    try {
      const machineId = parseInt(String(req.query.machineId || '1'), 10);
      const materialName = String(req.query.materialName || 'S45C');
      const theoreticalTime = parseFloat(String(req.query.theoreticalTime || '0'));

      if (isNaN(theoreticalTime) || theoreticalTime < 0) {
        res.status(400).json({
          error: { code: 'INVALID_INPUT', message: '有効な理論サイクルタイムを指定してください。' },
        });
        return;
      }

      const preview = await correctionService.previewCorrection(
        machineId,
        materialName,
        theoreticalTime
      );

      res.status(200).json(preview);
    } catch (err: unknown) {
      console.error('Error previewing correction:', err);
      res.status(500).json({
        error: { code: 'PREVIEW_FAILED', message: '補正プレビューの取得に失敗しました。' },
      });
    }
  }

  /**
   * GET /api/quotes/:id/correction-history
   * 案件の補正適用履歴を取得
   */
  async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const quoteId = parseInt(rawId, 10);

      if (isNaN(quoteId) || quoteId <= 0) {
        res.status(400).json({
          error: { code: 'INVALID_ID', message: '有効な見積IDを指定してください。' },
        });
        return;
      }

      const history = await correctionService.getHistory(quoteId);
      res.status(200).json({ items: history });
    } catch (err: unknown) {
      console.error('Error fetching correction history:', err);
      res.status(500).json({
        error: { code: 'FETCH_FAILED', message: '補正履歴の取得に失敗しました。' },
      });
    }
  }

  /**
   * POST /api/lathe-correction-factors/:id/approve
   * 補正係数の承認・承認解除
   */
  async toggleApproval(req: Request, res: Response): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const factorId = parseInt(rawId, 10);
      const approved = req.body?.approved === true;
      const operatorName = req.body?.operatorName || '加工管理者';

      if (isNaN(factorId) || factorId <= 0) {
        res.status(400).json({
          error: { code: 'INVALID_ID', message: '有効な補正係数IDを指定してください。' },
        });
        return;
      }

      await correctionService.toggleApproval(factorId, approved, operatorName);
      res.status(200).json({
        success: true,
        factorId,
        approved,
        message: approved ? '補正係数を承認しました。' : '補正係数の承認を解除しました。',
      });
    } catch (err: unknown) {
      console.error('Error toggling approval:', err);
      res.status(500).json({
        error: { code: 'UPDATE_FAILED', message: '補正係数承認状態の更新に失敗しました。' },
      });
    }
  }
}

export const correctionController = new CorrectionController();
