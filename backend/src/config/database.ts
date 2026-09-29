import mysql, { Pool } from 'mysql2/promise';
import { envConfig } from './env';

// MySQL 5.6互換の接続プール作成
export const pool: Pool = mysql.createPool({
  host: envConfig.db.host,
  port: envConfig.db.port,
  user: envConfig.db.user,
  password: envConfig.db.password,
  database: envConfig.db.name,
  connectionLimit: envConfig.db.connectionLimit,
  waitForConnections: true,
  // セキュリティおよびMySQL 5.6互換のため複数ステートメントは無効
  multipleStatements: false,
});
