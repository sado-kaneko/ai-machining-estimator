import mysql, { Pool } from 'mysql2/promise';
import { envConfig } from './env';

/**
 * 既存生産管理システム (sadoa DB) 専用の接続プール
 * 【重要・セキュリティ規則】
 * 本接続は「参照専用 (Read-Only)」です。
 * INSERT / UPDATE / DELETE の実行はシステム全体で固く禁止されています。
 */
export const sadoaPool: Pool = mysql.createPool({
  host: envConfig.sadoaDb.host,
  port: envConfig.sadoaDb.port,
  user: envConfig.sadoaDb.user,
  password: envConfig.sadoaDb.password,
  database: envConfig.sadoaDb.name,
  connectionLimit: envConfig.sadoaDb.connectionLimit,
  waitForConnections: true,
  multipleStatements: false,
});
