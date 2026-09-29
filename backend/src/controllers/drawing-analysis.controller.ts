import { Request, Response } from 'express';
import { drawingAnalysisService } from '../services/drawing-analysis.service';

export class DrawingAnalysisController {
  /**
   * POST /api/drawings/:id/analyze
   */
  async analyzeDrawing(req: Request, res: Response): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const drawingId = parseInt(rawId, 10);

      if (isNaN(drawingId) || drawingId <= 0) {
        res.status(400).json({
          error: {
            code: 'INVALID_ID',
            message: '有効な図面IDを指定してください。',
          },
        });
        return;
      }

      const result = await drawingAnalysisService.analyzeDrawing(drawingId);

      res.status(200).json(result);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '';

      if (errorMessage === 'DRAWING_NOT_FOUND') {
        res.status(404).json({
          error: {
            code: 'DRAWING_NOT_FOUND',
            message: '指定された図面が存在しません。',
          },
        });
        return;
      }

      if (errorMessage === 'PDF_FILE_NOT_FOUND') {
        res.status(404).json({
          error: {
            code: 'PDF_FILE_NOT_FOUND',
            message: '図面PDFファイルが存在しません。',
          },
        });
        return;
      }

      // APIキーや内部詳細、スタックトレースは返さない
      res.status(500).json({
        error: {
          code: 'ANALYSIS_FAILED',
          message: '図面の解析に失敗しました。',
        },
      });
    }
  }
}

export const drawingAnalysisController = new DrawingAnalysisController();
