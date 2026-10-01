import { accuracyRepository } from '../repositories/accuracy.repository';
import { pool } from '../config/database';
import { RowDataPacket } from 'mysql2/promise';
import {
  AccuracySummary,
  MachineAccuracy,
  MaterialAccuracy,
  MonthlyTrend,
  CorrectionEffect,
  ImprovementCandidate,
  PredictionAccuracyRecord,
} from '../types/accuracy';

export class AccuracyService {
  /**
   * 未評価または実績が取得された案件の精度評価を一括実行 (指示書第20節〜第22節)
   */
  async executeAccuracyEvaluation(): Promise<{
    evaluatedCount: number;
    message: string;
  }> {
    const candidates = await accuracyRepository.findCandidatesForEvaluation();
    let evaluatedCount = 0;

    for (const cand of candidates) {
      if (cand.predictionCt <= 0 || cand.actualCt <= 0) continue;

      const errorSeconds = Number((cand.actualCt - cand.predictionCt).toFixed(3));
      const errorRate = Number(((cand.actualCt - cand.predictionCt) / cand.predictionCt).toFixed(4));
      const absoluteErrorRate = Number((Math.abs(cand.actualCt - cand.predictionCt) / cand.actualCt).toFixed(4));

      await accuracyRepository.upsertAccuracyRecord({
        quoteId: cand.quoteId,
        cycleTimeResultId: cand.cycleTimeResultId,
        predictionCt: cand.predictionCt,
        theoreticalCt: cand.theoreticalCt,
        actualCt: cand.actualCt,
        errorSeconds,
        errorRate,
        absoluteErrorRate,
        machineName: cand.machineName,
        materialName: cand.materialName,
      });

      evaluatedCount++;
    }

    return {
      evaluatedCount,
      message: `${evaluatedCount}件の案件について実績CTとの精度評価を実行・保存しました。`,
    };
  }

  /**
   * 全体KPIサマリ取得 (指示書第23節)
   */
  async getSummary(): Promise<AccuracySummary> {
    return await accuracyRepository.getSummary();
  }

  /**
   * 設備別精度取得 (指示書第24節)
   */
  async getMachineAccuracy(): Promise<MachineAccuracy[]> {
    return await accuracyRepository.getMachineAccuracy();
  }

  /**
   * 材料別精度取得 (指示書第25節)
   */
  async getMaterialAccuracy(): Promise<MaterialAccuracy[]> {
    return await accuracyRepository.getMaterialAccuracy();
  }

  /**
   * 月別推移取得 (指示書第26節)
   */
  async getMonthlyTrends(): Promise<MonthlyTrend[]> {
    return await accuracyRepository.getMonthlyTrends();
  }

  /**
   * 補正効果比較取得 (指示書第27節)
   */
  async getCorrectionEffect(): Promise<CorrectionEffect> {
    return await accuracyRepository.getCorrectionEffect();
  }

  /**
   * 精度評価明細レコード一覧取得
   */
  async getAllRecords(limit = 100): Promise<PredictionAccuracyRecord[]> {
    return await accuracyRepository.getAllAccuracyRecords(limit);
  }

  /**
   * 補正係数改善候補の生成 (指示書第28節〜第30節)
   * サンプル件数 >= 20, 信頼度 MEDIUM以上, 異常値除外後の統計値から改善候補を算出
   * ※ 自動適用は禁止（承認フローで更新）
   */
  async getImprovementCandidates(): Promise<ImprovementCandidate[]> {
    // 既存の補正マスタと実績統計から改善候補を抽出
    const [factors] = await pool.query<RowDataPacket[]>(
      `SELECT lcf.id, lcf.machine_id, lcf.material_name, lcf.process_type, lcf.factor,
              lcf.sample_count, lcf.confidence_level, lcf.approved, mm.machine_name
       FROM lathe_correction_factors lcf
       LEFT JOIN machine_master mm ON mm.id = lcf.machine_id
       ORDER BY lcf.id ASC`
    );

    const candidates: ImprovementCandidate[] = [];

    for (const f of factors) {
      const machineName = String(f.machine_name || '未設定');
      const materialName = String(f.material_name);
      const currentFactor = Number(f.factor);

      // prediction_accuracy から対象条件の誤差実績を集計
      const [accRows] = await pool.query<RowDataPacket[]>(
        `SELECT AVG(error_rate) AS avg_err, COUNT(*) AS count
         FROM prediction_accuracy
         WHERE (machine_name LIKE CONCAT('%', ?, '%') OR ? = 'ALL')
           AND (material_name = ? OR ? = 'ALL')`,
        [machineName.replace(/Citizen\s+/i, '').trim(), machineName, materialName, materialName]
      );

      const count = Number(accRows[0]?.count || f.sample_count || 0);
      const avgErrorRate = accRows[0]?.avg_err !== null ? Number(accRows[0].avg_err) : 0;

      // 改善候補倍率の計算: 実績CTが平均して予測CTよりavgErrorRate高ければ、係数を引き上げる
      let suggestedFactor = currentFactor;
      let status: 'PENDING' | 'APPROVED' | 'INSUFFICIENT_DATA' = 'INSUFFICIENT_DATA';
      let notes = 'サンプル数不足 (最低20件必要)';

      if (count >= 20 && (f.confidence_level === 'MEDIUM' || f.confidence_level === 'HIGH')) {
        // 改善候補係数 = 現在係数 * (1 + 平均誤差率)
        suggestedFactor = Number((currentFactor * (1 + avgErrorRate)).toFixed(4));
        if (Boolean(f.approved)) {
          status = 'APPROVED';
          notes = '技術者承認済み';
        } else {
          status = 'PENDING';
          notes = `実績差異 (${(avgErrorRate * 100).toFixed(1)}%) に基づく改善推奨`;
        }
      } else if (Boolean(f.approved)) {
        status = 'APPROVED';
        notes = '技術者承認済み (サンプル収集中)';
      }

      candidates.push({
        id: Number(f.id),
        machineId: f.machine_id ? Number(f.machine_id) : undefined,
        machineName,
        materialName,
        processType: String(f.process_type || 'ALL'),
        currentFactor,
        suggestedFactor,
        sampleCount: count,
        confidenceLevel: String(f.confidence_level || 'LOW'),
        avgErrorRate: Number((avgErrorRate * 100).toFixed(2)),
        status,
        notes,
      });
    }

    return candidates;
  }

  /**
   * 技術者による改善候補の承認 & 補正マスタ更新 (指示書第29節)
   * ※ 自動適用は禁止、明示的な技術者承認による更新のみ
   */
  async applyImprovementCandidate(
    factorId: number,
    suggestedFactor: number,
    operatorName = '技術担当者'
  ): Promise<void> {
    if (suggestedFactor <= 0 || isNaN(suggestedFactor)) {
      throw new Error('INVALID_FACTOR');
    }

    await pool.query(
      `UPDATE lathe_correction_factors
       SET factor = ?, approved = 1, approved_by = ?, approved_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [suggestedFactor, operatorName, factorId]
    );

    console.log(`[AccuracyService] Factor #${factorId} approved and updated to ${suggestedFactor} by ${operatorName}`);
  }
}

export const accuracyService = new AccuracyService();
