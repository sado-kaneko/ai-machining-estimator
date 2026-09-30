import { Router } from 'express';
import { productionSyncController } from '../controllers/production-sync.controller';

const router = Router();

// POST /api/production-sync (実績同期実行)
router.post('/production-sync', (req, res) => productionSyncController.sync(req, res));

// GET /api/production-actual-records (実績一覧取得)
router.get('/production-actual-records', (req, res) => productionSyncController.getRecords(req, res));

// GET /api/production-actual-records/:buban (図番別実績取得)
router.get('/production-actual-records/:buban', (req, res) => productionSyncController.getByBuban(req, res));

// GET /api/quotes/:id/production-actual-records (案件関連実績取得)
router.get('/quotes/:id/production-actual-records', (req, res) => productionSyncController.getForQuote(req, res));

// POST /api/quotes/:id/drawing-mapping (案件-図番マッピング登録)
router.post('/quotes/:id/drawing-mapping', (req, res) => productionSyncController.mapDrawing(req, res));

export default router;
