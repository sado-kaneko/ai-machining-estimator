import { Router } from 'express';
import { actualCycleTimeController } from '../controllers/actual-cycle-time.controller';

const router = Router();

// 案件別加工実績登録
// POST /api/quotes/:id/actual-cycle-times
router.post(
  '/quotes/:id/actual-cycle-times',
  actualCycleTimeController.create.bind(actualCycleTimeController)
);

// 案件別加工実績一覧取得
// GET /api/quotes/:id/actual-cycle-times
router.get(
  '/quotes/:id/actual-cycle-times',
  actualCycleTimeController.getList.bind(actualCycleTimeController)
);

// 案件別サイクルタイム差異比較取得
// GET /api/quotes/:id/cycle-time-comparison
router.get(
  '/quotes/:id/cycle-time-comparison',
  actualCycleTimeController.getComparison.bind(actualCycleTimeController)
);

// 加工実績レコード削除
// DELETE /api/actual-cycle-times/:id
router.delete(
  '/actual-cycle-times/:id',
  actualCycleTimeController.delete.bind(actualCycleTimeController)
);

export default router;
