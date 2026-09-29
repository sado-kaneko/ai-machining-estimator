import { Request, Response } from 'express';
import { operationService } from '../services/operation.service';

export class OperationController {
  /**
   * POST /api/quotes/:id/operations/generate
   * Featureから加工工程候補を生成
   */
  async generateOperations(req: Request, res: Response): Promise<void> {
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

      const force = req.body?.force === true || req.query?.force === 'true';
      const result = await operationService.generateOperations(quoteId, force);

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

      if (message === 'OPERATIONS_ALREADY_EXIST') {
        res.status(409).json({
          error: {
            code: 'OPERATIONS_ALREADY_EXIST',
            message: '既に加工工程が存在します。再生成する場合は確認フラグを指定してください。',
          },
        });
        return;
      }

      if (message === 'NO_CONFIRMED_FEATURES' || message === 'NO_VALID_OPERATIONS_GENERATED') {
        res.status(400).json({
          error: {
            code: 'NO_CONFIRMED_FEATURES',
            message: '生成対象となる有効な加工Featureが存在しません。',
          },
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 'OPERATION_GENERATE_FAILED',
          message: '加工工程の生成処理に失敗しました。',
        },
      });
    }
  }

  /**
   * GET /api/quotes/:id/operations
   * 見積案件の工程一覧を取得
   */
  async getOperations(req: Request, res: Response): Promise<void> {
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

      const result = await operationService.getOperationsByQuoteId(quoteId);
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
          code: 'INTERNAL_SERVER_ERROR',
          message: '工程一覧の取得に失敗しました。',
        },
      });
    }
  }

  /**
   * PUT /api/operations/:id
   * 工程の更新
   */
  async updateOperation(req: Request, res: Response): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const operationId = parseInt(rawId, 10);

      if (isNaN(operationId) || operationId <= 0) {
        res.status(400).json({
          error: {
            code: 'INVALID_ID',
            message: '有効な工程IDを指定してください。',
          },
        });
        return;
      }

      const result = await operationService.updateOperation(operationId, req.body);
      res.status(200).json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';

      if (message === 'OPERATION_NOT_FOUND') {
        res.status(404).json({
          error: {
            code: 'OPERATION_NOT_FOUND',
            message: '指定された工程が存在しません。',
          },
        });
        return;
      }

      if (message === 'VALIDATION_ERROR') {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '入力内容に不備があります。',
          },
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 'OPERATION_UPDATE_FAILED',
          message: '工程の更新に失敗しました。',
        },
      });
    }
  }

  /**
   * DELETE /api/operations/:id
   * 工程の削除
   */
  async deleteOperation(req: Request, res: Response): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const operationId = parseInt(rawId, 10);

      if (isNaN(operationId) || operationId <= 0) {
        res.status(400).json({
          error: {
            code: 'INVALID_ID',
            message: '有効な工程IDを指定してください。',
          },
        });
        return;
      }

      const success = await operationService.deleteOperation(operationId);
      if (!success) {
        res.status(404).json({
          error: {
            code: 'OPERATION_NOT_FOUND',
            message: '指定された工程が存在しません。',
          },
        });
        return;
      }

      res.status(204).send();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';

      if (message === 'OPERATION_NOT_FOUND') {
        res.status(404).json({
          error: {
            code: 'OPERATION_NOT_FOUND',
            message: '指定された工程が存在しません。',
          },
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 'OPERATION_DELETE_FAILED',
          message: '工程の削除に失敗しました。',
        },
      });
    }
  }
}

export const operationController = new OperationController();
