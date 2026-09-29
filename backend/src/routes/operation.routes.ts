import { Router } from 'express';
import { operationController } from '../controllers/operation.controller';

const router = Router();

// POST /api/quotes/:id/operations/generate (工程生成)
router.post('/quotes/:id/operations/generate', (req, res) => {
  operationController.generateOperations(req, res);
});

// GET /api/quotes/:id/operations (工程一覧取得)
router.get('/quotes/:id/operations', (req, res) => {
  operationController.getOperations(req, res);
});

// PUT /api/operations/:id (工程更新)
router.put('/operations/:id', (req, res) => {
  operationController.updateOperation(req, res);
});

// DELETE /api/operations/:id (工程削除)
router.delete('/operations/:id', (req, res) => {
  operationController.deleteOperation(req, res);
});

export default router;
