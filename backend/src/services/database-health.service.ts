import { pool } from '../config/database';
import { RowDataPacket } from 'mysql2/promise';

export interface DatabaseHealthResult {
  connected: boolean;
  version?: string;
  errorCode?: string;
}

export class DatabaseHealthService {
  /**
   * データベースの疎通確認を実施（読み取り専用クエリのみ）
   */
  async checkHealth(): Promise<DatabaseHealthResult> {
    try {
      // 1. SELECT 1 AS ok の実行
      const [pingRows] = await pool.query<RowDataPacket[]>('SELECT 1 AS ok');
      if (!pingRows || pingRows.length === 0 || pingRows[0].ok !== 1) {
        return { connected: false, errorCode: 'PING_FAILED' };
      }

      // 2. SELECT VERSION() AS version の実行
      const [versionRows] = await pool.query<RowDataPacket[]>('SELECT VERSION() AS version');
      const version = versionRows?.[0]?.version ? String(versionRows[0].version) : undefined;

      return {
        connected: true,
        version,
      };
    } catch (error: unknown) {
      // 秘密情報は漏洩させず、エラーコードのみを特定
      const err = error as { code?: string };
      return {
        connected: false,
        errorCode: err.code || 'DB_CONNECTION_FAILED',
      };
    }
  }
}

export const databaseHealthService = new DatabaseHealthService();
