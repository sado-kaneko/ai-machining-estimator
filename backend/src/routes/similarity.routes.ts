import { Router } from 'express';
import { similarityController } from '../controllers/similarity.controller';

const router = Router();

// GET /api/quotes/:id/similar - 類似加工案件検索
router.get('/quotes/:id/similar', (req, res) => similarityController.getSimilarQuotes(req, res));

export default router;
