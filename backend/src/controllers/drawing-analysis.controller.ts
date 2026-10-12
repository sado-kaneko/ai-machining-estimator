import { Request, Response } from 'express';
import { drawingAnalysisService } from '../services/drawing-analysis.service';

export class DrawingAnalysisController {
  private activeAbortControllers = new Map<number, AbortController>();

  /**
   * POST /api/drawings/:id/analyze
   */
  async analyzeDrawing(req: Request, res: Response): Promise<void> {
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

    const abortController = new AbortController();
    this.activeAbortControllers.set(drawingId, abortController);

    try {
      const result = await drawingAnalysisService.analyzeDrawing(drawingId, abortController.signal);
      this.activeAbortControllers.delete(drawingId);
      res.status(200).json(result);
    } catch (err: unknown) {
      this.activeAbortControllers.delete(drawingId);
      const errorMessage = err instanceof Error ? err.message : '';

      if (errorMessage === 'ANALYSIS_ABORTED' || abortController.signal.aborted) {
        if (!res.writableEnded) {
          res.status(499).json({
            error: {
              code: 'ANALYSIS_ABORTED',
              message: '図面のAI解析が中断されました。',
            },
          });
        }
        return;
      }

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
      if (!res.writableEnded) {
        res.status(500).json({
          error: {
            code: 'ANALYSIS_FAILED',
            message: '図面の解析に失敗しました。',
          },
        });
      }
    }
  }

  /**
   * POST /api/drawings/:id/cancel-analysis
   * 実行中のAI解析を安全に停止
   */
  async cancelAnalysis(req: Request, res: Response): Promise<void> {
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

    const controller = this.activeAbortControllers.get(drawingId);
    if (controller) {
      console.log(`[AI Analysis] Cancel request received for drawingId=${drawingId}`);
      controller.abort();
      this.activeAbortControllers.delete(drawingId);
      res.status(200).json({
        success: true,
        message: 'AI解析を中断しました。',
      });
    } else {
      res.status(200).json({
        success: true,
        message: '実行中の解析はありません。',
      });
    }
  }

  /**
   * GET /api/drawings/:id/analysis
   * 図面の最新解析結果を取得
   */
  async getLatestAnalysis(req: Request, res: Response): Promise<void> {
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

      const result = await drawingAnalysisService.getLatestAnalysisByDrawingId(drawingId);
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

      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '解析結果の取得に失敗しました。',
        },
      });
    }
  }
}

export const drawingAnalysisController = new DrawingAnalysisController();
