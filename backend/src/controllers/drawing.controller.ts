import { Request, Response } from 'express';
import { drawingService } from '../services/drawing.service';

export class DrawingController {
  /**
   * PDFアップロード (POST /api/quotes/:quoteId/drawings)
   */
  async uploadDrawing(req: Request, res: Response): Promise<void> {
    try {
      const rawQuoteId = Array.isArray(req.params.quoteId) ? req.params.quoteId[0] : req.params.quoteId;
      const quoteId = parseInt(rawQuoteId, 10);
      if (isNaN(quoteId) || quoteId <= 0) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid quote ID',
          },
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          error: {
            code: 'FILE_REQUIRED',
            message: 'PDF file is required',
          },
        });
        return;
      }

      const drawing = await drawingService.uploadDrawing(quoteId, req.file);
      res.status(201).json(drawing);
    } catch (error: unknown) {
      this.handleError(res, error);
    }
  }

  /**
   * 図面一覧取得 (GET /api/quotes/:quoteId/drawings)
   */
  async getDrawingsByQuoteId(req: Request, res: Response): Promise<void> {
    try {
      const rawQuoteId = Array.isArray(req.params.quoteId) ? req.params.quoteId[0] : req.params.quoteId;
      const quoteId = parseInt(rawQuoteId, 10);
      if (isNaN(quoteId) || quoteId <= 0) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid quote ID',
          },
        });
        return;
      }

      const items = await drawingService.getDrawingsByQuoteId(quoteId);
      res.status(200).json({ items });
    } catch (error: unknown) {
      this.handleError(res, error);
    }
  }

  /**
   * 図面削除 (DELETE /api/drawings/:id)
   */
  async deleteDrawing(req: Request, res: Response): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const id = parseInt(rawId, 10);
      if (isNaN(id) || id <= 0) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid drawing ID',
          },
        });
        return;
      }

      const success = await drawingService.deleteDrawing(id);
      if (!success) {
        res.status(404).json({
          error: {
            code: 'DRAWING_NOT_FOUND',
            message: 'Drawing not found',
          },
        });
        return;
      }

      res.status(204).send();
    } catch (error: unknown) {
      this.handleError(res, error);
    }
  }

  /**
   * 図面画像取得 (GET /api/drawings/:id/image)
   */
  async getDrawingImage(req: Request, res: Response): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const id = parseInt(rawId, 10);
      if (isNaN(id) || id <= 0) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid drawing ID',
          },
        });
        return;
      }

      const { buffer, mimeType } = await drawingService.getDrawingImage(id);
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.status(200).send(buffer);
    } catch (error: unknown) {
      const err = error as { message?: string };
      if (err?.message === 'DRAWING_NOT_FOUND' || err?.message === 'PDF_FILE_NOT_FOUND') {
        res.status(404).json({
          error: {
            code: 'DRAWING_NOT_FOUND',
            message: 'Drawing not found',
          },
        });
        return;
      }
      this.handleError(res, error);
    }
  }

  private handleError(res: Response, error: unknown): void {
    const err = error as { message?: string };
    if (err?.message === 'QUOTE_NOT_FOUND') {
      res.status(404).json({
        error: {
          code: 'QUOTE_NOT_FOUND',
          message: 'Quote not found',
        },
      });
      return;
    }

    if (err?.message === 'INVALID_FILE_TYPE') {
      res.status(400).json({
        error: {
          code: 'INVALID_FILE_TYPE',
          message: 'Only PDF files are allowed',
        },
      });
      return;
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      },
    });
  }
}

export const drawingController = new DrawingController();
