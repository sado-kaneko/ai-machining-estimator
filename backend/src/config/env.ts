import dotenv from 'dotenv';
import path from 'path';

// .envファイルを読み込み（backend/.env）
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export interface EnvConfig {
  nodeEnv: string;
  port: number;
  frontendOrigin: string;
  db: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    connectionLimit: number;
  };
  sadoaDb: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    connectionLimit: number;
  };
  upload: {
    dir: string;
    maxUploadMb: number;
  };
  openai: {
    apiKey: string;
    model: string;
  };
}

function validateAndGetEnv(): EnvConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const port = parseInt(process.env.PORT || '3100', 10);
  const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:4200';

  const host = process.env.DB_HOST;
  const dbPort = parseInt(process.env.DB_PORT || '3306', 10);
  const name = process.env.DB_NAME;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const connectionLimit = parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10);

  // 必須環境変数の検証（秘密情報は出力しない）
  const missingVars: string[] = [];
  if (!host) missingVars.push('DB_HOST');
  if (!name) missingVars.push('DB_NAME');
  if (!user) missingVars.push('DB_USER');
  if (password === undefined || password === null) missingVars.push('DB_PASSWORD');

  if (missingVars.length > 0) {
    throw new Error(
      `データベース接続に必要な環境変数が設定されていません: ${missingVars.join(', ')}`
    );
  }

  const uploadDirRaw = process.env.UPLOAD_DIR || '../storage/drawings';
  const uploadDir = path.resolve(__dirname, '../../', uploadDirRaw);
  const maxUploadMb = parseInt(process.env.MAX_UPLOAD_MB || '20', 10);

  const openaiApiKey = process.env.OPENAI_API_KEY;
  const openaiModel = process.env.OPENAI_MODEL || 'gpt-5-mini';

  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY が設定されていません。');
  }

  const sadoaHost = process.env.SADOA_DB_HOST || host;
  const sadoaPort = parseInt(process.env.SADOA_DB_PORT || String(dbPort), 10);
  const sadoaName = process.env.SADOA_DB_NAME || 'sadoa';
  const sadoaUser = process.env.SADOA_DB_USER || user;
  const sadoaPassword = process.env.SADOA_DB_PASSWORD !== undefined ? process.env.SADOA_DB_PASSWORD : password;

  return {
    nodeEnv,
    port,
    frontendOrigin,
    db: {
      host: host!,
      port: dbPort,
      name: name!,
      user: user!,
      password: password!,
      connectionLimit,
    },
    sadoaDb: {
      host: sadoaHost!,
      port: sadoaPort,
      name: sadoaName,
      user: sadoaUser!,
      password: sadoaPassword!,
      connectionLimit: 5,
    },
    upload: {
      dir: uploadDir,
      maxUploadMb,
    },
    openai: {
      apiKey: openaiApiKey,
      model: openaiModel,
    },
  };
}

export const envConfig = validateAndGetEnv();
