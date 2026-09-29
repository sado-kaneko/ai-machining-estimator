import { Router } from 'express';
import { cycleTimeController } from '../controllers/cycle-time.controller';

const router = Router();

// POST /api/quotes/:id/cycle-time/calculate
router.post(
  '/quotes/:id/cycle-time/calculate',
  cycleTimeController.calculateCycleTime.bind(cycleTimeController)
);

// GET /api/quotes/:id/cycle-time
router.get(
  '/quotes/:id/cycle-time',
  cycleTimeController.getCycleTime.bind(cycleTimeController)
);

export default router;
