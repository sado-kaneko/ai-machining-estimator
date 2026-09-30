import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { pool } from '../config/database';
import {
  AnalysisType,
  ConfidenceLevel,
  CorrectionFactorCandidate,
} from '../types/production-analysis';

export class ProductionAnalysisRepository {
  /**
   * cycle_time_evaluations から理論CT・実績CTの対比データを取得
   */
  async getEvaluationsFactorData(): Promise<
    Array<{
      machineName: string;
      materialName: string;
      materialDiameter: number | null;
      calculatedSec: number;
      actualSec: number;
      factor: number;
    }>
  > {
    const sql = `
      SELECT
        COALESCE(m.machine_name, '自動旋盤') AS machineName,
        COALESCE(mat.material_name, 'S45C') AS materialName,
        mat.diameter AS materialDiameter,
        cte.calculated_cycle_time_sec AS calculatedSec,
        cte.actual_cycle_time_sec AS actualSec
      FROM cycle_time_evaluations cte
      LEFT JOIN machine_master m ON cte.machine_id = m.id
      LEFT JOIN material_information mat ON cte.quote_id = mat.quote_id
      WHERE cte.actual_cycle_time_sec IS NOT NULL
        AND cte.calculated_cycle_time_sec > 0
    `;
    const [rows] = await pool.execute<RowDataPacket[]>(sql);
    return rows.map((r) => ({
      machineName: String(r.machineName),
      materialName: String(r.materialName),
      materialDiameter: r.materialDiameter ? Number(r.materialDiameter) : null,
      calculatedSec: Number(r.calculatedSec),
      actualSec: Number(r.actualSec),
      factor: Math.round((Number(r.actualSec) / Number(r.calculatedSec)) * 10000) / 10000,
    }));
  }

  /**
   * production_actual_records から実績生データを全件取得
   * (cycle_time_sec > 0 のレコード)
   */
  async getProductionActualRawData(): Promise<
    Array<{
      id: number;
      machineName: string;
      materialName: string;
      materialDiameter: number | null;
      processName: string;
      cycleTimeSec: number;
      quantity: number;
    }>
  > {
    const sql = `
      SELECT
        id,
        COALESCE(machine_name, 'その他設備') AS machineName,
        COALESCE(material_name, '一般材') AS materialName,
        material_diameter AS materialDiameter,
        COALESCE(process_name, '旋削') AS processName,
        cycle_time_sec AS cycleTimeSec,
        quantity
      FROM production_actual_records
      WHERE cycle_time_sec IS NOT NULL AND cycle_time_sec > 0
      ORDER BY id ASC
    `;
    const [rows] = await pool.execute<RowDataPacket[]>(sql);
    return rows.map((r) => ({
      id: Number(r.id),
      machineName: String(r.machineName),
      materialName: String(r.materialName),
      materialDiameter: r.materialDiameter !== null ? Number(r.materialDiameter) : null,
      processName: String(r.processName),
      cycleTimeSec: Number(r.cycleTimeSec),
      quantity: Number(r.quantity || 0),
    }));
  }

  /**
   * 分析結果テーブルへの一括保存
   */
  async saveAnalysisResult(item: {
    analysisType: AnalysisType;
    targetKey: string;
    sampleCount: number;
    averageFactor: number;
    medianFactor: number;
    stddevFactor: number | null;
    maxFactor: number | null;
    minFactor: number | null;
    confidenceLevel: ConfidenceLevel;
  }): Promise<void> {
    const sql = `
      INSERT INTO production_analysis_results (
        analysis_type,
        target_key,
        sample_count,
        average_factor,
        median_factor,
        stddev_factor,
        max_factor,
        min_factor,
        confidence_level,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    await pool.execute(sql, [
      item.analysisType,
      item.targetKey,
      item.sampleCount,
      item.averageFactor,
      item.medianFactor,
      item.stddevFactor,
      item.maxFactor,
      item.minFactor,
      item.confidenceLevel,
    ]);
  }

  /**
   * 分析結果テーブルの直近レコードを取得
   */
  async getLatestAnalysisResults(analysisType?: AnalysisType): Promise<any[]> {
    let sql = `
      SELECT * FROM production_analysis_results
    `;
    const params: any[] = [];
    if (analysisType) {
      sql += ` WHERE analysis_type = ?`;
      params.push(analysisType);
    }
    sql += ` ORDER BY id DESC LIMIT 100`;

    const [rows] = await pool.execute<RowDataPacket[]>(sql, params);
    return rows.map((r) => ({
      id: Number(r.id),
      analysisType: String(r.analysis_type),
      targetKey: String(r.target_key),
      sampleCount: Number(r.sample_count),
      averageFactor: Number(r.average_factor),
      medianFactor: Number(r.median_factor),
      stddevFactor: r.stddev_factor !== null ? Number(r.stddev_factor) : null,
      maxFactor: r.max_factor !== null ? Number(r.max_factor) : null,
      minFactor: r.min_factor !== null ? Number(r.min_factor) : null,
      confidenceLevel: String(r.confidence_level) as ConfidenceLevel,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : '',
    }));
  }

  /**
   * lathe_correction_factors から補正係数候補と信頼度一覧を取得
   */
  async getCorrectionFactorCandidates(): Promise<CorrectionFactorCandidate[]> {
    const sql = `
      SELECT
        lcf.id,
        lcf.machine_id AS machineId,
        m.machine_name AS machineName,
        lcf.material_name AS materialName,
        lcf.process_type AS processType,
        lcf.factor,
        lcf.sample_count AS sampleCount,
        lcf.confidence_level AS confidenceLevel,
        lcf.approved,
        lcf.approved_by AS approvedBy,
        lcf.approved_at AS approvedAt
      FROM lathe_correction_factors lcf
      JOIN machine_master m ON lcf.machine_id = m.id
      ORDER BY lcf.sample_count DESC, lcf.id ASC
    `;
    const [rows] = await pool.execute<RowDataPacket[]>(sql);
    return rows.map((r) => ({
      id: Number(r.id),
      machineId: Number(r.machineId),
      machineName: String(r.machineName),
      materialName: String(r.materialName),
      processType: String(r.processType),
      factor: Number(r.factor),
      sampleCount: Number(r.sampleCount),
      confidenceLevel: (r.confidenceLevel || 'LOW') as ConfidenceLevel,
      approved: Boolean(r.approved),
      approvedBy: r.approvedBy ? String(r.approvedBy) : null,
      approvedAt: r.approvedAt ? new Date(r.approvedAt).toISOString() : null,
    }));
  }

  /**
   * 補正係数テーブルの更新・登録（候補生成用、自動適用なし）
   */
  async upsertCorrectionFactorCandidate(item: {
    machineId: number;
    materialName: string;
    processType: string;
    factor: number;
    sampleCount: number;
    confidenceLevel: ConfidenceLevel;
  }): Promise<void> {
    const sql = `
      INSERT INTO lathe_correction_factors (
        machine_id,
        material_name,
        process_type,
        factor,
        sample_count,
        confidence_level,
        approved,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 0, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        factor = VALUES(factor),
        sample_count = VALUES(sample_count),
        confidence_level = VALUES(confidence_level),
        updated_at = NOW()
    `;
    await pool.execute(sql, [
      item.machineId,
      item.materialName,
      item.processType,
      item.factor,
      item.sampleCount,
      item.confidenceLevel,
    ]);
  }
}

export const productionAnalysisRepository = new ProductionAnalysisRepository();
