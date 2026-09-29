import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import healthRoutes from './routes/health.routes';
import quoteRoutes from './routes/quote.routes';

const app = express();

// 基本ミドルウェア設定
app.use(helmet());
app.use(cors());
app.use(express.json());

// ヘルスチェックルーターのマウント (/api/health, /api/health/database)
app.use('/api/health', healthRoutes);

// 見積案件CRUDルーターのマウント (/api/quotes)
app.use('/api/quotes', quoteRoutes);

export default app;
