import { Router } from 'express';
import { drawingController } from '../controllers/drawing.controller';
import { drawingAnalysisController } from '../controllers/drawing-analysis.controller';
import { uploadPdf } from '../middleware/upload.middleware';

const router = Router();

// POST /api/quotes/:quoteId/drawings (PDFアップロード)
router.post('/quotes/:quoteId/drawings', uploadPdf.single('file'), (req, res) => {
  drawingController.uploadDrawing(req, res);
});

// GET /api/quotes/:quoteId/drawings (図面一覧取得)
router.get('/quotes/:quoteId/drawings', (req, res) => {
  drawingController.getDrawingsByQuoteId(req, res);
});

// POST /api/drawings/:id/analyze (図面AI解析)
router.post('/drawings/:id/analyze', (req, res) => {
  drawingAnalysisController.analyzeDrawing(req, res);
});

// DELETE /api/drawings/:id (図面削除)
router.delete('/drawings/:id', (req, res) => {
  drawingController.deleteDrawing(req, res);
});

export default router;
