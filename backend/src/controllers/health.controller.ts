import { Request, Response } from 'express';
import { databaseHealthService } from '../services/database-health.service';

export class HealthController {
  /**
   * 基本ヘルスチェック
   */
  getHealth(_req: Request, res: Response): void {
    res.status(200).json({ status: 'ok' });
  }

  /**
   * データベース疎通確認ヘルスチェック
   */
  async getDatabaseHealth(_req: Request, res: Response): Promise<void> {
    const result = await databaseHealthService.checkHealth();

    if (result.connected) {
      res.status(200).json({
        status: 'ok',
        database: 'connected',
        version: result.version,
      });
      return;
    }

    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      code: result.errorCode || 'DB_CONNECTION_FAILED',
    });
  }
}

export const healthController = new HealthController();
