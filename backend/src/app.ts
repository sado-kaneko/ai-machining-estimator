import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();

// 基本ミドルウェア設定
app.use(helmet());
app.use(cors());
app.use(express.json());

// ヘルスチェックエンドポイント
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

export default app;
