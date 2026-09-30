import { Router } from 'express';
import { productionAnalysisController } from '../controllers/production-analysis.controller';

const router = Router();

// GET /api/production-analysis/summary (全体概要)
router.get('/production-analysis/summary', (req, res) =>
  productionAnalysisController.getSummary(req, res)
);

// GET /api/production-analysis/machines (設備別分析)
router.get('/production-analysis/machines', (req, res) =>
  productionAnalysisController.getMachines(req, res)
);

// GET /api/production-analysis/materials (材料別分析)
router.get('/production-analysis/materials', (req, res) =>
  productionAnalysisController.getMaterials(req, res)
);

// GET /api/production-analysis/diameters (材料径別分析)
router.get('/production-analysis/diameters', (req, res) =>
  productionAnalysisController.getDiameters(req, res)
);

// GET /api/production-analysis/processes (工程別分析)
router.get('/production-analysis/processes', (req, res) =>
  productionAnalysisController.getProcesses(req, res)
);

// GET /api/lathe-correction-factors/confidence (補正係数候補・信頼度)
router.get('/lathe-correction-factors/confidence', (req, res) =>
  productionAnalysisController.getCorrectionFactorsConfidence(req, res)
);

// POST /api/production-analysis/execute (分析実行 & 保存)
router.post('/production-analysis/execute', (req, res) =>
  productionAnalysisController.execute(req, res)
);

export default router;
