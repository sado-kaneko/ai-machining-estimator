import { Request, Response } from 'express';
import { masterService } from '../services/master.service';

export class MasterController {
  async getMachines(_req: Request, res: Response): Promise<void> {
    try {
      const items = await masterService.getMachines();
      res.json({ items });
    } catch (err: any) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  }

  async createMachine(req: Request, res: Response): Promise<void> {
    try {
      const result = await masterService.createMachine(req.body);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: err.message } });
    }
  }

  async updateMachine(req: Request, res: Response): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const id = parseInt(rawId, 10);
      const success = await masterService.updateMachine(id, req.body);
      if (!success) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Machine not found' } });
        return;
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: err.message } });
    }
  }

  async deleteMachine(req: Request, res: Response): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const id = parseInt(rawId, 10);
      const success = await masterService.deleteMachine(id);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  }

  async getTools(_req: Request, res: Response): Promise<void> {
    try {
      const items = await masterService.getTools();
      res.json({ items });
    } catch (err: any) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  }

  async createTool(req: Request, res: Response): Promise<void> {
    try {
      const result = await masterService.createTool(req.body);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: err.message } });
    }
  }

  async updateTool(req: Request, res: Response): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const id = parseInt(rawId, 10);
      const success = await masterService.updateTool(id, req.body);
      if (!success) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Tool not found' } });
        return;
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: err.message } });
    }
  }

  async deleteTool(req: Request, res: Response): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const id = parseInt(rawId, 10);
      const success = await masterService.deleteTool(id);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  }
}

export const masterController = new MasterController();
