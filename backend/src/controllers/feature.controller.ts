import { Request, Response } from 'express';
import { featureService } from '../services/feature.service';

export class FeatureController {
  /**
   * POST /api/drawing-analyses/:id/features
   * AI解析結果から加工Featureを生成・登録
   */
  async generateFeatures(req: Request, res: Response): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const analysisId = parseInt(rawId, 10);

      if (isNaN(analysisId) || analysisId <= 0) {
        res.status(400).json({
          error: {
            code: 'INVALID_ID',
            message: '有効な解析IDを指定してください。',
          },
        });
        return;
      }

      const result = await featureService.generateFeaturesFromAnalysis(analysisId);
      res.status(200).json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';

      if (message === 'ANALYSIS_NOT_FOUND') {
        res.status(404).json({
          error: {
            code: 'ANALYSIS_NOT_FOUND',
            message: '指定された図面解析結果が存在しません。',
          },
        });
        return;
      }

      if (message === 'NO_FEATURE_DATA') {
        res.status(400).json({
          error: {
            code: 'NO_FEATURE_DATA',
            message: '解析結果に有効な加工Feature情報が存在しません。',
          },
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 'FEATURE_CREATE_FAILED',
          message: '加工Featureの登録処理に失敗しました。',
        },
      });
    }
  }

  /**
   * GET /api/drawing-analyses/:id/features
   * 指定した解析IDの加工Feature一覧を取得
   */
  async getFeatures(req: Request, res: Response): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const analysisId = parseInt(rawId, 10);

      if (isNaN(analysisId) || analysisId <= 0) {
        res.status(400).json({
          error: {
            code: 'INVALID_ID',
            message: '有効な解析IDを指定してください。',
          },
        });
        return;
      }

      const result = await featureService.getFeaturesByAnalysisId(analysisId);
      res.status(200).json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';

      if (message === 'ANALYSIS_NOT_FOUND') {
        res.status(404).json({
          error: {
            code: 'ANALYSIS_NOT_FOUND',
            message: '指定された図面解析結果が存在しません。',
          },
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '加工Feature一覧の取得に失敗しました。',
        },
      });
    }
  }

  /**
   * PUT /api/features/:id
   * Feature の更新
   */
  async updateFeature(req: Request, res: Response): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const featureId = parseInt(rawId, 10);

      if (isNaN(featureId) || featureId <= 0) {
        res.status(400).json({
          error: {
            code: 'INVALID_ID',
            message: '有効なFeature IDを指定してください。',
          },
        });
        return;
      }

      const result = await featureService.updateFeature(featureId, req.body);
      res.status(200).json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';

      if (message === 'FEATURE_NOT_FOUND') {
        res.status(404).json({
          error: {
            code: 'FEATURE_NOT_FOUND',
            message: '指定された加工Featureが存在しません。',
          },
        });
        return;
      }

      if (message === 'VALIDATION_ERROR') {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '入力内容に不備があります。寸法値は0以上の数値を入力してください。',
          },
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 'FEATURE_UPDATE_FAILED',
          message: '加工Featureの更新に失敗しました。',
        },
      });
    }
  }

  /**
   * DELETE /api/features/:id
   * Feature の削除
   */
  async deleteFeature(req: Request, res: Response): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const featureId = parseInt(rawId, 10);

      if (isNaN(featureId) || featureId <= 0) {
        res.status(400).json({
          error: {
            code: 'INVALID_ID',
            message: '有効なFeature IDを指定してください。',
          },
        });
        return;
      }

      await featureService.deleteFeature(featureId);
      res.status(200).json({
        success: true,
        message: '加工Featureを削除しました。',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';

      if (message === 'FEATURE_NOT_FOUND') {
        res.status(404).json({
          error: {
            code: 'FEATURE_NOT_FOUND',
            message: '指定された加工Featureが存在しません。',
          },
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 'FEATURE_DELETE_FAILED',
          message: '加工Featureの削除に失敗しました。',
        },
      });
    }
  }
}

export const featureController = new FeatureController();
