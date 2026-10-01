import { Router } from 'express';
import { accuracyController } from '../controllers/accuracy.controller';

const router = Router();

// POST /api/accuracy/execute - 精度評価一括実行
router.post('/accuracy/execute', (req, res) => accuracyController.executeEvaluation(req, res));

// GET /api/accuracy/summary - 全体KPIサマリ
router.get('/accuracy/summary', (req, res) => accuracyController.getSummary(req, res));

// GET /api/accuracy/machines - 設備別精度
router.get('/accuracy/machines', (req, res) => accuracyController.getMachineAccuracy(req, res));

// GET /api/accuracy/materials - 材料別精度
router.get('/accuracy/materials', (req, res) => accuracyController.getMaterialAccuracy(req, res));

// GET /api/accuracy/trends - 月別推移
router.get('/accuracy/trends', (req, res) => accuracyController.getMonthlyTrends(req, res));

// GET /api/accuracy/correction-effect - 補正効果比較
router.get('/accuracy/correction-effect', (req, res) => accuracyController.getCorrectionEffect(req, res));

// GET /api/accuracy/candidates - 補正改善候補一覧
router.get('/accuracy/candidates', (req, res) => accuracyController.getCandidates(req, res));

// POST /api/accuracy/candidates/:id/apply - 改善候補の承認更新
router.post('/accuracy/candidates/:id/apply', (req, res) => accuracyController.applyCandidate(req, res));

// GET /api/accuracy/records - 精度評価明細レコード一覧
router.get('/accuracy/records', (req, res) => accuracyController.getRecords(req, res));

export default router;
