import { Router } from 'express';
import { masterController } from '../controllers/master.controller';

const router = Router();

// 加工設備マスタ CRUD
router.get('/masters/machines', (req, res) => masterController.getMachines(req, res));
router.post('/masters/machines', (req, res) => masterController.createMachine(req, res));
router.put('/masters/machines/:id', (req, res) => masterController.updateMachine(req, res));
router.delete('/masters/machines/:id', (req, res) => masterController.deleteMachine(req, res));

// 工具マスタ CRUD
router.get('/masters/tools', (req, res) => masterController.getTools(req, res));
router.post('/masters/tools', (req, res) => masterController.createTool(req, res));
router.put('/masters/tools/:id', (req, res) => masterController.updateTool(req, res));
router.delete('/masters/tools/:id', (req, res) => masterController.deleteTool(req, res));

export default router;
