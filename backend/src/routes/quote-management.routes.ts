import { Router } from 'express';
import { quoteManagementController } from '../controllers/quote-management.controller';

const router = Router();

// GET /api/quotes/search/similar - 類似案件検索 (paramsより前に定義)
router.get('/quotes/search/similar', (req, res) => quoteManagementController.searchSimilar(req, res));

// POST /api/quotes/:id/complete - 見積確定保存
router.post('/quotes/:id/complete', (req, res) => quoteManagementController.completeQuote(req, res));

// GET /api/quotes/:id/basis - 見積根拠データ取得
router.get('/quotes/:id/basis', (req, res) => quoteManagementController.getQuoteBasis(req, res));

// GET /api/quotes/:id/history - 見積変更履歴取得
router.get('/quotes/:id/history', (req, res) => quoteManagementController.getHistory(req, res));

// PATCH /api/quotes/:id/status - ステータス更新
router.patch('/quotes/:id/status', (req, res) => quoteManagementController.updateStatus(req, res));

// GET /api/quotes/:id/export-pdf - 見積根拠資料HTML/PDF出力
router.get('/quotes/:id/export-pdf', (req, res) => quoteManagementController.exportPdf(req, res));

export default router;
