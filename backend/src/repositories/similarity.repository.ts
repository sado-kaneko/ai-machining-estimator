import { pool } from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { SimilarQuoteResult, SimilarityLevel } from '../types/similarity';

export class SimilarityRepository {
  /**
   * 類似検索結果を監査・再現用に保存
   */
  async saveSimilarityResults(quoteId: number, results: SimilarQuoteResult[]): Promise<void> {
    if (results.length === 0) return;

    // 既存の同一quoteIdの検索結果を削除して最新化
    await pool.query('DELETE FROM similarity_results WHERE quote_id = ?', [quoteId]);

    const values = results.map((r) => [
      quoteId,
      r.targetQuoteId,
      r.similarityScore,
      r.similarityLevel,
      JSON.stringify(r.breakdown),
    ]);

    await pool.query(
      `INSERT INTO similarity_results (quote_id, target_quote_id, similarity_score, similarity_level, score_breakdown)
       VALUES ?`,
      [values]
    );
  }

  /**
   * 比較元案件の詳細情報を取得（材料、素材径、設備、寸法、Feature一覧）
   */
  async getQuoteComparisonData(quoteId: number): Promise<{
    quoteId: number;
    quoteNo: string | null;
    partNo: string;
    partName: string;
    customerName: string;
    material: string | null;
    diameter: number | null;
    machineName: string | null;
    maxDiameter: number | null;
    minDiameter: number | null;
    overallLength: number | null;
    features: string[];
    predictedCycleTime: number | null;
  } | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT q.id, q.quote_no, q.part_no, q.part_name, q.customer_name,
              COALESCE(m.material_name, da.material, q.material) AS resolved_material,
              COALESCE(m.diameter, da.stock_diameter) AS resolved_diameter,
              COALESCE(qr.machine, mm.machine_name) AS machine_name,
              da.overall_length,
              COALESCE(qr.final_time, ctr.corrected_cycle_time, ctr.total_cycle_time_sec) AS predicted_ct
       FROM quotes q
       LEFT JOIN drawings d ON d.quote_id = q.id
       LEFT JOIN drawing_analyses da ON da.drawing_id = d.id
       LEFT JOIN material_information m ON m.quote_id = q.id
       LEFT JOIN quote_machine_selection qms ON qms.quote_id = q.id AND qms.selected = 1
       LEFT JOIN machine_master mm ON mm.id = qms.machine_id
       LEFT JOIN quote_results qr ON qr.quote_id = q.id
       LEFT JOIN cycle_time_results ctr ON ctr.quote_id = q.id
       WHERE q.id = ?
       ORDER BY da.id DESC
       LIMIT 1`,
      [quoteId]
    );

    if (rows.length === 0) return null;
    const r = rows[0];

    // Feature一覧取得
    const [featureRows] = await pool.query<RowDataPacket[]>(
      `SELECT f.feature_type, f.diameter, f.length, f.depth
       FROM features f
       JOIN drawing_analyses da ON da.id = f.analysis_id
       JOIN drawings d ON d.id = da.drawing_id
       WHERE d.quote_id = ?
       ORDER BY f.sequence_no ASC`,
      [quoteId]
    );

    const featureTypes = featureRows.map((fr) => String(fr.feature_type).toUpperCase());
    const diameters = featureRows
      .map((fr) => (fr.diameter !== null ? Number(fr.diameter) : null))
      .filter((d): d is number => d !== null && d > 0);

    const maxDiameter = diameters.length > 0 ? Math.max(...diameters) : null;
    const minDiameter = diameters.length > 0 ? Math.min(...diameters) : null;

    return {
      quoteId: Number(r.id),
      quoteNo: r.quote_no ? String(r.quote_no) : null,
      partNo: String(r.part_no || ''),
      partName: String(r.part_name || ''),
      customerName: String(r.customer_name || ''),
      material: r.resolved_material ? String(r.resolved_material) : null,
      diameter: r.resolved_diameter !== null ? Number(r.resolved_diameter) : null,
      machineName: r.machine_name ? String(r.machine_name) : null,
      maxDiameter,
      minDiameter,
      overallLength: r.overall_length !== null ? Number(r.overall_length) : null,
      features: featureTypes,
      predictedCycleTime: r.predicted_ct !== null ? Number(r.predicted_ct) : null,
    };
  }

  /**
   * 比較対象となる他の全案件候補を取得
   */
  async getCandidateQuotes(excludeQuoteId: number): Promise<Array<{
    quoteId: number;
    quoteNo: string | null;
    partNo: string;
    partName: string;
    customerName: string;
    material: string | null;
    diameter: number | null;
    machineName: string | null;
    maxDiameter: number | null;
    minDiameter: number | null;
    overallLength: number | null;
    features: string[];
    predictedCycleTime: number | null;
    actualCycleTime: number | null;
    processedAt: string | null;
  }>> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT q.id, q.quote_no, q.part_no, q.part_name, q.customer_name,
              COALESCE(m.material_name, da.material, q.material) AS resolved_material,
              COALESCE(m.diameter, da.stock_diameter) AS resolved_diameter,
              COALESCE(qr.machine, mm.machine_name) AS machine_name,
              da.overall_length,
              COALESCE(qr.final_time, ctr.corrected_cycle_time, ctr.total_cycle_time_sec) AS predicted_ct,
              COALESCE(act.actual_cycle_time_sec, par.cycle_time_sec) AS actual_ct,
              COALESCE(act.production_date, par.start_datetime, qr.completed_at, q.created_at) AS processed_at
       FROM quotes q
       LEFT JOIN drawings d ON d.quote_id = q.id
       LEFT JOIN drawing_analyses da ON da.drawing_id = d.id
       LEFT JOIN material_information m ON m.quote_id = q.id
       LEFT JOIN quote_machine_selection qms ON qms.quote_id = q.id AND qms.selected = 1
       LEFT JOIN machine_master mm ON mm.id = qms.machine_id
       LEFT JOIN quote_results qr ON qr.quote_id = q.id
       LEFT JOIN cycle_time_results ctr ON ctr.quote_id = q.id
       LEFT JOIN actual_cycle_times act ON act.quote_id = q.id
       LEFT JOIN drawing_number_mapping dnm ON dnm.quote_id = q.id
       LEFT JOIN production_actual_records par ON par.buban = q.part_no OR par.buban = dnm.buban
       WHERE q.id != ?
       GROUP BY q.id
       ORDER BY q.id DESC`,
      [excludeQuoteId]
    );

    const candidates = [];
    for (const r of rows) {
      const qId = Number(r.id);
      // Feature一覧取得
      const [featureRows] = await pool.query<RowDataPacket[]>(
        `SELECT f.feature_type, f.diameter, f.length, f.depth
         FROM features f
         JOIN drawing_analyses da ON da.id = f.analysis_id
         JOIN drawings d ON d.id = da.drawing_id
         WHERE d.quote_id = ?
         ORDER BY f.sequence_no ASC`,
        [qId]
      );

      const featureTypes = featureRows.map((fr) => String(fr.feature_type).toUpperCase());
      const diameters = featureRows
        .map((fr) => (fr.diameter !== null ? Number(fr.diameter) : null))
        .filter((d): d is number => d !== null && d > 0);

      const maxDiameter = diameters.length > 0 ? Math.max(...diameters) : null;
      const minDiameter = diameters.length > 0 ? Math.min(...diameters) : null;

      candidates.push({
        quoteId: qId,
        quoteNo: r.quote_no ? String(r.quote_no) : null,
        partNo: String(r.part_no || ''),
        partName: String(r.part_name || ''),
        customerName: String(r.customer_name || ''),
        material: r.resolved_material ? String(r.resolved_material) : null,
        diameter: r.resolved_diameter !== null ? Number(r.resolved_diameter) : null,
        machineName: r.machine_name ? String(r.machine_name) : null,
        maxDiameter,
        minDiameter,
        overallLength: r.overall_length !== null ? Number(r.overall_length) : null,
        features: featureTypes,
        predictedCycleTime: r.predicted_ct !== null ? Number(r.predicted_ct) : null,
        actualCycleTime: r.actual_ct !== null ? Number(r.actual_ct) : null,
        processedAt: r.processed_at instanceof Date ? r.processed_at.toISOString() : (r.processed_at ? String(r.processed_at) : null),
      });
    }

    return candidates;
  }
}

export const similarityRepository = new SimilarityRepository();
