import { Request, Response } from 'express';
import { quoteManagementService } from '../services/quote-management.service';
import { QuoteStatus } from '../types/quote-management';

export class QuoteManagementController {
  /**
   * POST /api/quotes/:id/complete
   * 見積確定保存
   */
  async completeQuote(req: Request, res: Response): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const quoteId = parseInt(rawId, 10);
      if (isNaN(quoteId) || quoteId <= 0) {
        res.status(400).json({ error: { code: 'INVALID_ID', message: '有効な案件IDを指定してください。' } });
        return;
      }

      const operatorName = String(req.body.operatorName || req.body.completedBy || '見積担当者');
      const result = await quoteManagementService.completeQuote(quoteId, req.body, operatorName);

      res.status(200).json({
        message: '見積を確定保存しました。',
        result,
      });
    } catch (err: unknown) {
      console.error('Error completing quote:', err);
      res.status(500).json({ error: { code: 'COMPLETE_FAILED', message: '見積の確定保存に失敗しました。' } });
    }
  }

  /**
   * GET /api/quotes/:id/basis
   * 見積根拠データ取得
   */
  async getQuoteBasis(req: Request, res: Response): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const quoteId = parseInt(rawId, 10);
      if (isNaN(quoteId) || quoteId <= 0) {
        res.status(400).json({ error: { code: 'INVALID_ID', message: '有効な案件IDを指定してください。' } });
        return;
      }

      const basis = await quoteManagementService.getQuoteBasis(quoteId);
      res.status(200).json(basis);
    } catch (err: unknown) {
      console.error('Error getting quote basis:', err);
      res.status(500).json({ error: { code: 'FETCH_FAILED', message: '見積根拠の取得に失敗しました。' } });
    }
  }

  /**
   * GET /api/quotes/:id/history
   * 見積変更履歴取得
   */
  async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const quoteId = parseInt(rawId, 10);
      if (isNaN(quoteId) || quoteId <= 0) {
        res.status(400).json({ error: { code: 'INVALID_ID', message: '有効な案件IDを指定してください。' } });
        return;
      }

      const items = await quoteManagementService.getHistory(quoteId);
      res.status(200).json({ items });
    } catch (err: unknown) {
      console.error('Error getting quote history:', err);
      res.status(500).json({ error: { code: 'FETCH_FAILED', message: '履歴の取得に失敗しました。' } });
    }
  }

  /**
   * GET /api/quotes/search/similar
   * 類似案件検索 (指示書第7節、第12節)
   */
  async searchSimilar(req: Request, res: Response): Promise<void> {
    try {
      const partNo = req.query.partNo ? String(req.query.partNo) : undefined;
      const material = req.query.material ? String(req.query.material) : undefined;
      const machine = req.query.machine ? String(req.query.machine) : undefined;
      const diameter = req.query.diameter ? parseFloat(String(req.query.diameter)) : undefined;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 10;

      const items = await quoteManagementService.searchSimilarQuotes({
        partNo,
        material,
        machine,
        diameter: isNaN(diameter as any) ? undefined : diameter,
        limit,
      });

      res.status(200).json({ items });
    } catch (err: unknown) {
      console.error('Error searching similar quotes:', err);
      res.status(500).json({ error: { code: 'SEARCH_FAILED', message: '類似案件の検索に失敗しました。' } });
    }
  }

  /**
   * PATCH /api/quotes/:id/status
   * ステータス更新
   */
  async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const quoteId = parseInt(rawId, 10);
      const status = req.body.status as QuoteStatus;
      const operatorName = String(req.body.operatorName || '担当者');

      if (isNaN(quoteId) || !status) {
        res.status(400).json({ error: { code: 'INVALID_INPUT', message: '有効な案件IDとステータスを指定してください。' } });
        return;
      }

      await quoteManagementService.updateStatus(quoteId, status, operatorName);
      res.status(200).json({ message: `ステータスを ${status} に更新しました。` });
    } catch (err: unknown) {
      console.error('Error updating status:', err);
      res.status(500).json({ error: { code: 'UPDATE_FAILED', message: 'ステータスの更新に失敗しました。' } });
    }
  }

  /**
   * GET /api/quotes/:id/export-pdf
   * 見積根拠資料 (HTML印刷 / PDFビュー) 出力
   */
  async exportPdf(req: Request, res: Response): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const quoteId = parseInt(rawId, 10);
      if (isNaN(quoteId) || quoteId <= 0) {
        res.status(400).send('無効な案件IDです。');
        return;
      }

      const basis = await quoteManagementService.getQuoteBasis(quoteId);
      const html = quoteManagementService.generatePdfHtml(basis);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send(html);
    } catch (err: unknown) {
      console.error('Error exporting PDF HTML:', err);
      res.status(500).send('見積根拠資料の出力に失敗しました。');
    }
  }
}

export const quoteManagementController = new QuoteManagementController();
