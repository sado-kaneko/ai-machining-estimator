import { Router } from 'express';
import { materialController } from '../controllers/material.controller';

const router = Router();

// 素材情報取得: GET /api/quotes/:id/material
router.get('/quotes/:id/material', (req, res) => materialController.getByQuoteId(req, res));

// 素材情報登録・Upsert: POST /api/quotes/:id/material
router.post('/quotes/:id/material', (req, res) => materialController.saveForQuote(req, res));

// 素材情報更新: PUT /api/materials/:id
router.put('/materials/:id', (req, res) => materialController.update(req, res));

export default router;
