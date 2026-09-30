import { Request, Response } from 'express';
import { materialService } from '../services/material.service';
import { SaveMaterialSchema, UpdateMaterialSchema } from '../schemas/material.schema';

export class MaterialController {
  /**
   * GET /api/quotes/:id/material
   * 素材情報取得
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

      const material = await materialService.getMaterialByQuoteId(quoteId);
      if (!material) {
        res.status(200).json(null);
        return;
      }

      res.status(200).json(material);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message === 'QUOTE_NOT_FOUND') {
        res.status(404).json({
          error: { code: 'QUOTE_NOT_FOUND', message: '指定された見積案件が存在しません。' },
        });
        return;
      }
      res.status(500).json({
        error: { code: 'FETCH_FAILED', message: '素材情報の取得に失敗しました。' },
      });
    }
  }

  /**
   * POST /api/quotes/:id/material
   * 素材情報登録・Upsert
   */
  async saveForQuote(req: Request, res: Response): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const quoteId = parseInt(rawId, 10);

      if (isNaN(quoteId) || quoteId <= 0) {
        res.status(400).json({
          error: { code: 'INVALID_ID', message: '有効な見積IDを指定してください。' },
        });
        return;
      }

      const parseResult = SaveMaterialSchema.safeParse(req.body);
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

      const result = await materialService.saveMaterialForQuote(quoteId, parseResult.data);
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
        error: { code: 'SAVE_FAILED', message: '素材情報の保存に失敗しました。' },
      });
    }
  }

  /**
   * PUT /api/materials/:id
   * 素材情報更新
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const id = parseInt(rawId, 10);

      if (isNaN(id) || id <= 0) {
        res.status(400).json({
          error: { code: 'INVALID_ID', message: '有効な素材情報IDを指定してください。' },
        });
        return;
      }

      const parseResult = UpdateMaterialSchema.safeParse(req.body);
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

      const result = await materialService.updateMaterial(id, parseResult.data);
      res.status(200).json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message === 'MATERIAL_NOT_FOUND') {
        res.status(404).json({
          error: { code: 'NOT_FOUND', message: '指定された素材情報が存在しません。' },
        });
        return;
      }
      res.status(500).json({
        error: { code: 'UPDATE_FAILED', message: '素材情報の更新に失敗しました。' },
      });
    }
  }
}

export const materialController = new MaterialController();
