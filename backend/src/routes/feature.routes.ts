import { Router } from 'express';
import { featureController } from '../controllers/feature.controller';

const router = Router();

// POST /api/drawing-analyses/:id/features (Feature生成・登録)
router.post('/drawing-analyses/:id/features', (req, res) => {
  featureController.generateFeatures(req, res);
});

// GET /api/drawing-analyses/:id/features (Feature一覧取得)
router.get('/drawing-analyses/:id/features', (req, res) => {
  featureController.getFeatures(req, res);
});

export default router;
