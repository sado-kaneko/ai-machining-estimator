import { Request, Response } from 'express';
import { similarityService } from '../services/similarity.service';

export class SimilarityController {
  /**
   * GET /api/quotes/:id/similar
   * 類似加工案件検索 (指示書第18節)
   */
  async getSimilarQuotes(req: Request, res: Response): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const quoteId = parseInt(rawId, 10);
      if (isNaN(quoteId) || quoteId <= 0) {
        res.status(400).json({ error: { code: 'INVALID_ID', message: '有効な案件IDを指定してください。' } });
        return;
      }

      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 10;
      const result = await similarityService.findSimilarQuotes(quoteId, isNaN(limit) ? 10 : limit);

      res.status(200).json(result);
    } catch (err: unknown) {
      console.error('Error fetching similar quotes:', err);
      res.status(500).json({ error: { code: 'SEARCH_FAILED', message: '類似案件の検索に失敗しました。' } });
    }
  }
}

export const similarityController = new SimilarityController();
