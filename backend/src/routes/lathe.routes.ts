import { Router } from 'express';
import { latheController } from '../controllers/lathe.controller';

const router = Router();

// 工程生成
router.post(
  '/quotes/:id/lathe-operations/generate',
  latheController.generateOperations.bind(latheController)
);

// 工程一覧取得
router.get(
  '/quotes/:id/lathe-operations',
  latheController.getOperations.bind(latheController)
);

// サイクルタイム計算
router.post(
  '/quotes/:id/lathe-cycle-time/calculate',
  latheController.calculateCycleTime.bind(latheController)
);

// サイクルタイム取得
router.get(
  '/quotes/:id/lathe-cycle-time',
  latheController.getCycleTime.bind(latheController)
);

export default router;
