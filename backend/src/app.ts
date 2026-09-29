import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import healthRoutes from './routes/health.routes';
import quoteRoutes from './routes/quote.routes';
import drawingRoutes from './routes/drawing.routes';
import featureRoutes from './routes/feature.routes';

const app = express();

// 基本ミドルウェア設定
app.use(helmet());
app.use(cors());
app.use(express.json());

// ヘルスチェックルーターのマウント (/api/health, /api/health/database)
app.use('/api/health', healthRoutes);

// 見積案件CRUDルーターのマウント (/api/quotes)
app.use('/api/quotes', quoteRoutes);

// 図面管理ルーターのマウント (/api/quotes/:quoteId/drawings, /api/drawings/:id)
app.use('/api', drawingRoutes);

// Feature管理ルーターのマウント (/api/drawing-analyses/:id/features)
app.use('/api', featureRoutes);

export default app;
