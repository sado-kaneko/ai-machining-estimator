import { Router } from 'express';
import { healthController } from '../controllers/health.controller';

const router = Router();

// GET /api/health
router.get('/', (req, res) => healthController.getHealth(req, res));

// GET /api/health/database
router.get('/database', (req, res) => healthController.getDatabaseHealth(req, res));

export default router;
