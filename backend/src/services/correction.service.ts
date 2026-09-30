import { correctionRepository } from '../repositories/correction.repository';
import {
  CorrectionDecision,
  CorrectionPreviewResult,
  CorrectionConfidenceLevel,
  CorrectionHistoryItem,
} from '../types/correction';

export class CorrectionService {
  /**
   * 補正倍率の制限範囲 (指示書第7節)
   * 0.90 ～ 1.20 のみ自動適用を許可
   */
  private readonly MIN_ALLOWED_FACTOR = 0.9;
  private readonly MAX_ALLOWED_FACTOR = 1.2;

  /**
   * 理論CTに対する最適な補正係数を探索・判定し返却する
   */
  async resolveCorrection(
    machineId: number,
    materialName: string,
    theoreticalTime: number,
    quoteId?: number
  ): Promise<CorrectionDecision> {
    // 承認済み補正係数の検索 (優先順位: 設備×材料×工程 -> 設備×材料 -> 設備全体)
    const matched = await correctionRepository.findApprovedFactor(machineId, materialName);

    if (!matched) {
      return {
        applied: false,
        factor: 1.0,
        source: '未適用 (該当する承認済補正係数なし)',
        confidence: 'NONE',
        sampleCount: 0,
        reason: '対象条件に合致する承認済み補正係数が存在しないため、理論値をそのまま採用します。',
      };
    }

    const { factor, sampleCount, confidenceLevel, source } = matched;
    const confidence = confidenceLevel as CorrectionConfidenceLevel;

    // 1. 信頼度・件数チェック (指示書第6.1節, 第6.2節)
    if (confidence === 'LOW' || sampleCount < 10) {
      return {
        applied: false,
        factor: 1.0,
        source,
        confidence,
        sampleCount,
        reason: `信頼度またはサンプル件数が不足しているため補正は適用されません (信頼度:${confidence}, 件数:${sampleCount}件)。`,
      };
    }

    // 2. 倍率範囲制限チェック (指示書第7節)
    if (factor < this.MIN_ALLOWED_FACTOR || factor > this.MAX_ALLOWED_FACTOR) {
      return {
        applied: false,
        factor: 1.0,
        source,
        confidence,
        sampleCount,
        reason: `補正倍率（×${factor}）が安全制限範囲（${this.MIN_ALLOWED_FACTOR}～${this.MAX_ALLOWED_FACTOR}）外のため、過補正防止により自動適用を停止しました。`,
      };
    }

    // 3. 条件クリア: 補正適用
    const correctedTime = Math.round(theoreticalTime * factor * 1000) / 1000;

    // 案件IDが指定されていれば適用履歴を保存
    if (quoteId && quoteId > 0) {
      await correctionRepository.saveHistory(
        quoteId,
        theoreticalTime,
        factor,
        correctedTime,
        source
      );
    }

    return {
      applied: true,
      factor,
      source,
      confidence,
      sampleCount,
      reason: `承認済みの実績補正係数（${source}, 信頼度:${confidence}, ${sampleCount}件）を適用しました。`,
    };
  }

  /**
   * 補正プレビューAPI用
   */
  async previewCorrection(
    machineId: number,
    materialName: string,
    theoreticalTime: number
  ): Promise<CorrectionPreviewResult> {
    const decision = await this.resolveCorrection(machineId, materialName, theoreticalTime);
    const afterTimeSec = decision.applied
      ? Math.round(theoreticalTime * decision.factor * 1000) / 1000
      : theoreticalTime;

    return {
      beforeTimeSec: theoreticalTime,
      factor: decision.factor,
      afterTimeSec,
      source: decision.source,
      confidence: decision.confidence,
      sampleCount: decision.sampleCount,
      applied: decision.applied,
      reason: decision.reason,
    };
  }

  /**
   * 補正係数の承認・承認解除
   */
  async toggleApproval(id: number, approved: boolean, operatorName: string = '管理者'): Promise<void> {
    await correctionRepository.setApprovalStatus(id, approved, operatorName);
  }

  /**
   * 案件別補正適用履歴を取得
   */
  async getHistory(quoteId: number): Promise<CorrectionHistoryItem[]> {
    return await correctionRepository.findHistoryByQuoteId(quoteId);
  }
}

export const correctionService = new CorrectionService();
