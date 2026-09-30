import { Request, Response } from 'express';
import { productionAnalysisService } from '../services/production-analysis.service';

export class ProductionAnalysisController {
  /**
   * GET /api/production-analysis/summary
   * 全体概要分析
   */
  async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const summary = await productionAnalysisService.getOverallSummary();
      res.status(200).json(summary);
    } catch (err: unknown) {
      console.error('Error fetching analysis summary:', err);
      res.status(500).json({
        error: { code: 'FETCH_FAILED', message: '分析サマリの取得に失敗しました。' },
      });
    }
  }

  /**
   * GET /api/production-analysis/machines
   * 設備別分析
   */
  async getMachines(req: Request, res: Response): Promise<void> {
    try {
      const machines = await productionAnalysisService.getMachineAnalysis();
      res.status(200).json(machines);
    } catch (err: unknown) {
      console.error('Error fetching machine analysis:', err);
      res.status(500).json({
        error: { code: 'FETCH_FAILED', message: '設備別分析の取得に失敗しました。' },
      });
    }
  }

  /**
   * GET /api/production-analysis/materials
   * 材料別分析
   */
  async getMaterials(req: Request, res: Response): Promise<void> {
    try {
      const materials = await productionAnalysisService.getMaterialAnalysis();
      res.status(200).json(materials);
    } catch (err: unknown) {
      console.error('Error fetching material analysis:', err);
      res.status(500).json({
        error: { code: 'FETCH_FAILED', message: '材料別分析の取得に失敗しました。' },
      });
    }
  }

  /**
   * GET /api/production-analysis/diameters
   * 材料径別分析
   */
  async getDiameters(req: Request, res: Response): Promise<void> {
    try {
      const diameters = await productionAnalysisService.getDiameterAnalysis();
      res.status(200).json(diameters);
    } catch (err: unknown) {
      console.error('Error fetching diameter analysis:', err);
      res.status(500).json({
        error: { code: 'FETCH_FAILED', message: '材料径別分析の取得に失敗しました。' },
      });
    }
  }

  /**
   * GET /api/production-analysis/processes
   * 工程別分析
   */
  async getProcesses(req: Request, res: Response): Promise<void> {
    try {
      const processes = await productionAnalysisService.getProcessAnalysis();
      res.status(200).json(processes);
    } catch (err: unknown) {
      console.error('Error fetching process analysis:', err);
      res.status(500).json({
        error: { code: 'FETCH_FAILED', message: '工程別分析の取得に失敗しました。' },
      });
    }
  }

  /**
   * GET /api/lathe-correction-factors/confidence
   * 補正係数候補 & 信頼度一覧取得
   */
  async getCorrectionFactorsConfidence(req: Request, res: Response): Promise<void> {
    try {
      const candidates = await productionAnalysisService.getConfidenceFactors();
      res.status(200).json({ items: candidates });
    } catch (err: unknown) {
      console.error('Error fetching correction factor candidates:', err);
      res.status(500).json({
        error: { code: 'FETCH_FAILED', message: '補正係数候補の取得に失敗しました。' },
      });
    }
  }

  /**
   * POST /api/production-analysis/execute
   * 分析を実行してDBに保存
   */
  async execute(req: Request, res: Response): Promise<void> {
    try {
      const result = await productionAnalysisService.executeFullAnalysis();
      res.status(200).json(result);
    } catch (err: unknown) {
      console.error('Error executing production analysis:', err);
      res.status(500).json({
        error: { code: 'EXECUTION_FAILED', message: '実績統計分析の実行に失敗しました。' },
      });
    }
  }
}

export const productionAnalysisController = new ProductionAnalysisController();
