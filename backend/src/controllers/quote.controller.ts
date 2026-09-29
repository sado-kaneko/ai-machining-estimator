import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { createQuoteSchema, quoteIdParamSchema, updateQuoteSchema } from '../schemas/quote.schema';
import { quoteService } from '../services/quote.service';

export class QuoteController {
  /**
   * 見積一覧取得 (GET /api/quotes)
   */
  async getAllQuotes(_req: Request, res: Response): Promise<void> {
    try {
      const items = await quoteService.getAllQuotes();
      res.status(200).json({ items });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * 見積1件取得 (GET /api/quotes/:id)
   */
  async getQuoteById(req: Request, res: Response): Promise<void> {
    try {
      const paramResult = quoteIdParamSchema.safeParse(req.params);
      if (!paramResult.success) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request',
            details: paramResult.error.issues,
          },
        });
        return;
      }

      const quote = await quoteService.getQuoteById(paramResult.data.id);
      if (!quote) {
        res.status(404).json({
          error: {
            code: 'QUOTE_NOT_FOUND',
            message: 'Quote not found',
          },
        });
        return;
      }

      res.status(200).json(quote);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * 見積新規作成 (POST /api/quotes)
   */
  async createQuote(req: Request, res: Response): Promise<void> {
    try {
      const bodyResult = createQuoteSchema.safeParse(req.body);
      if (!bodyResult.success) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request',
            details: bodyResult.error.issues,
          },
        });
        return;
      }

      const quote = await quoteService.createQuote(bodyResult.data);
      res.status(201).json(quote);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * 見積更新 (PUT /api/quotes/:id)
   */
  async updateQuote(req: Request, res: Response): Promise<void> {
    try {
      const paramResult = quoteIdParamSchema.safeParse(req.params);
      if (!paramResult.success) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request',
            details: paramResult.error.issues,
          },
        });
        return;
      }

      const bodyResult = updateQuoteSchema.safeParse(req.body);
      if (!bodyResult.success) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request',
            details: bodyResult.error.issues,
          },
        });
        return;
      }

      const quote = await quoteService.updateQuote(paramResult.data.id, bodyResult.data);
      if (!quote) {
        res.status(404).json({
          error: {
            code: 'QUOTE_NOT_FOUND',
            message: 'Quote not found',
          },
        });
        return;
      }

      res.status(200).json(quote);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * 見積削除 (DELETE /api/quotes/:id)
   */
  async deleteQuote(req: Request, res: Response): Promise<void> {
    try {
      const paramResult = quoteIdParamSchema.safeParse(req.params);
      if (!paramResult.success) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request',
            details: paramResult.error.issues,
          },
        });
        return;
      }

      const success = await quoteService.deleteQuote(paramResult.data.id);
      if (!success) {
        res.status(404).json({
          error: {
            code: 'QUOTE_NOT_FOUND',
            message: 'Quote not found',
          },
        });
        return;
      }

      res.status(204).send();
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * 共通エラーハンドラー (秘密情報やスタックトレースを隠蔽)
   */
  private handleError(res: Response, error: unknown): void {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request',
          details: error.issues,
        },
      });
      return;
    }

    // 内部エラーは汎用メッセージを返却
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      },
    });
  }
}

export const quoteController = new QuoteController();
