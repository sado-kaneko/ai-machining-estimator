import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import healthRoutes from './routes/health.routes';
import quoteRoutes from './routes/quote.routes';
import drawingRoutes from './routes/drawing.routes';
import featureRoutes from './routes/feature.routes';
import operationRoutes from './routes/operation.routes';
import cycleTimeRoutes from './routes/cycle-time.routes';
import latheRoutes from './routes/lathe.routes';
import actualCycleTimeRoutes from './routes/actual-cycle-time.routes';
import materialRoutes from './routes/material.routes';
import cycleTimeEvaluationRoutes from './routes/cycle-time-evaluation.routes';
import productionSyncRoutes from './routes/production-sync.routes';
import productionAnalysisRoutes from './routes/production-analysis.routes';
import correctionRoutes from './routes/correction.routes';
import quoteManagementRoutes from './routes/quote-management.routes';
import similarityRoutes from './routes/similarity.routes';
import accuracyRoutes from './routes/accuracy.routes';

const app = express();

// 基本ミドルウェア設定
app.use(helmet());
app.use(cors());
app.use(express.json());

// ヘルスチェックルーターのマウント (/api/health, /api/health/database)
app.use('/api/health', healthRoutes);

// PHASE18: 類似加工検索ルーターのマウント (/api/quotes/:id/similar)
app.use('/api', similarityRoutes);

// PHASE18: 予測精度分析ルーターのマウント (/api/accuracy/...)
app.use('/api', accuracyRoutes);

// PHASE17: 見積業務管理ルーターのマウント (/api/quotes/search/similar, /api/quotes/:id/complete, /api/quotes/:id/basis, /api/quotes/:id/history)
app.use('/api', quoteManagementRoutes);

// 見積案件CRUDルーターのマウント (/api/quotes)
app.use('/api/quotes', quoteRoutes);

// 図面管理ルーターのマウント (/api/quotes/:quoteId/drawings, /api/drawings/:id)
app.use('/api', drawingRoutes);

// Feature管理ルーターのマウント (/api/drawing-analyses/:id/features, /api/features/:id)
app.use('/api', featureRoutes);

// 加工工程ルーターのマウント (/api/quotes/:id/operations, /api/operations/:id)
app.use('/api', operationRoutes);

// サイクルタイム計算ルーターのマウント (/api/quotes/:id/cycle-time)
app.use('/api', cycleTimeRoutes);

// NC自動旋盤エンジンルーターのマウント (/api/quotes/:id/lathe-operations, /api/quotes/:id/lathe-cycle-time)
app.use('/api', latheRoutes);

// 加工実績・比較ルーターのマウント (/api/quotes/:id/actual-cycle-times, /api/quotes/:id/cycle-time-comparison)
app.use('/api', actualCycleTimeRoutes);

// 素材情報ルーターのマウント (/api/quotes/:id/material, /api/materials/:id)
app.use('/api', materialRoutes);

// PHASE13: サイクルタイム精度評価・補正ルーターのマウント (/api/quotes/:id/cycle-time-evaluations, /api/lathe-correction-factors)
app.use('/api', cycleTimeEvaluationRoutes);

// PHASE14: 生産実績同期ルーターのマウント (/api/production-sync, /api/production-actual-records)
app.use('/api', productionSyncRoutes);

// PHASE15: 生産実績統計分析・補正係数評価ルーターのマウント (/api/production-analysis, /api/lathe-correction-factors/confidence)
app.use('/api', productionAnalysisRoutes);

// PHASE16: 補正Engineルーターのマウント (/api/correction/preview, /api/quotes/:id/correction-history, /api/lathe-correction-factors/:id/approve)
app.use('/api', correctionRoutes);

export default app;

