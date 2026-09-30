import { Router } from 'express';
import { correctionController } from '../controllers/correction.controller';

const router = Router();

// GET /api/correction/preview - 補正予定プレビュー
router.get('/correction/preview', (req, res) => correctionController.preview(req, res));

// GET /api/quotes/:id/correction-history - 案件別補正適用履歴
router.get('/quotes/:id/correction-history', (req, res) => correctionController.getHistory(req, res));

// POST /api/lathe-correction-factors/:id/approve - 補正係数の承認・解除
router.post('/lathe-correction-factors/:id/approve', (req, res) => correctionController.toggleApproval(req, res));

export default router;
