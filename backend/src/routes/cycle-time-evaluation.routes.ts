import { Router } from 'express';
import { cycleTimeEvaluationController } from '../controllers/cycle-time-evaluation.controller';

const router = Router();

// 評価登録: POST /api/quotes/:id/cycle-time-evaluations
router.post(
  '/quotes/:id/cycle-time-evaluations',
  cycleTimeEvaluationController.create.bind(cycleTimeEvaluationController)
);

// 評価一覧取得: GET /api/quotes/:id/cycle-time-evaluations
router.get(
  '/quotes/:id/cycle-time-evaluations',
  cycleTimeEvaluationController.getByQuoteId.bind(cycleTimeEvaluationController)
);

// 補正係数一覧取得: GET /api/lathe-correction-factors
router.get(
  '/lathe-correction-factors',
  cycleTimeEvaluationController.getCorrectionFactors.bind(cycleTimeEvaluationController)
);

export default router;
