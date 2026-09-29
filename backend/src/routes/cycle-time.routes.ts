import { Router } from 'express';
import { calculationController } from '../controllers/calculation.controller';

const router = Router();

// GET /api/machines (使用可能設備一覧取得)
router.get(
  '/machines',
  calculationController.getAllMachines.bind(calculationController)
);

// POST /api/quotes/:id/machine (案件加工機設定)
router.post(
  '/quotes/:id/machine',
  calculationController.setQuoteMachine.bind(calculationController)
);

// GET /api/quotes/:id/machine (案件加工機取得)
router.get(
  '/quotes/:id/machine',
  calculationController.getQuoteMachine.bind(calculationController)
);

// POST /api/quotes/:id/cycle-time/calculate (共通Engine経由での計算実行)
router.post(
  '/quotes/:id/cycle-time/calculate',
  calculationController.calculateCycleTime.bind(calculationController)
);

// GET /api/quotes/:id/cycle-time
router.get(
  '/quotes/:id/cycle-time',
  calculationController.getCycleTime.bind(calculationController)
);

export default router;
