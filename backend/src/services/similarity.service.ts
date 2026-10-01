import { similarityRepository } from '../repositories/similarity.repository';
import {
  SimilarQuoteResult,
  SimilarQuoteSearchResponse,
  SimilarityScoreBreakdown,
  SimilarityLevel,
} from '../types/similarity';

export class SimilarityService {
  /**
   * 類似加工検索メイン処理 (指示書第6節〜第18節)
   */
  async findSimilarQuotes(quoteId: number, limit = 10): Promise<SimilarQuoteSearchResponse> {
    const target = await similarityRepository.getQuoteComparisonData(quoteId);
    if (!target) {
      return { quoteId, results: [] };
    }

    const candidates = await similarityRepository.getCandidateQuotes(quoteId);
    const scoredResults: SimilarQuoteResult[] = [];

    for (const cand of candidates) {
      const breakdown = this.calculateSimilarityScore(target, cand);
      const score = breakdown.totalScore;

      let level: SimilarityLevel = 'LOW';
      if (score >= 80) level = 'HIGH';
      else if (score >= 60) level = 'MEDIUM';
      else if (score >= 40) level = 'REFERENCE';

      // Feature概要文字列作成 (例: "OD(2), ID(1), GROOVE(1)")
      const featureCounts = new Map<string, number>();
      for (const f of cand.features) {
        featureCounts.set(f, (featureCounts.get(f) || 0) + 1);
      }
      const featureSummary = cand.features.length > 0
        ? Array.from(featureCounts.entries())
            .map(([f, count]) => `${f}(${count})`)
            .join(', ')
        : 'Feature未登録';

      // 予測誤差率の計算 (もし両方存在する場合)
      let errorRate: number | null = null;
      if (cand.predictedCycleTime && cand.actualCycleTime && cand.predictedCycleTime > 0) {
        errorRate = Number(
          ((cand.actualCycleTime - cand.predictedCycleTime) / cand.predictedCycleTime).toFixed(4)
        );
      }

      scoredResults.push({
        targetQuoteId: cand.quoteId,
        quoteNo: cand.quoteNo,
        partNo: cand.partNo,
        partName: cand.partName,
        customerName: cand.customerName,
        similarityScore: score,
        similarityLevel: level,
        material: cand.material,
        diameter: cand.diameter,
        machine: cand.machineName,
        featureSummary,
        predictedCycleTime: cand.predictedCycleTime,
        actualCycleTime: cand.actualCycleTime,
        errorRate,
        processedAt: cand.processedAt,
        breakdown,
      });
    }

    // スコア降順ソート
    scoredResults.sort((a, b) => b.similarityScore - a.similarityScore);

    // スコア40未満は原則除外（ただし候補が少なければ参考として含めるため、40以上を優先して上位limit件抽出）
    const qualified = scoredResults.filter((r) => r.similarityScore >= 40);
    const finalResults = (qualified.length > 0 ? qualified : scoredResults).slice(0, limit);

    // 検索結果を監査・再現用テーブルへ非同期保存 (Section 19)
    try {
      await similarityRepository.saveSimilarityResults(quoteId, finalResults);
    } catch (saveErr) {
      console.warn('[SimilarityService] Failed to save similarity_results audit log:', saveErr);
    }

    return {
      quoteId,
      results: finalResults,
    };
  }

  /**
   * ルールベーススコアリング計算 (100点満点)
   */
  calculateSimilarityScore(
    target: {
      material: string | null;
      machineName: string | null;
      diameter: number | null;
      features: string[];
      maxDiameter: number | null;
      minDiameter: number | null;
      overallLength: number | null;
    },
    cand: {
      material: string | null;
      machineName: string | null;
      diameter: number | null;
      features: string[];
      maxDiameter: number | null;
      minDiameter: number | null;
      overallLength: number | null;
    }
  ): SimilarityScoreBreakdown {
    // 1. 材料一致: 20点 (完全一致のみ、曖昧判定なし)
    let materialScore = 0;
    if (target.material && cand.material) {
      const mat1 = target.material.trim().toUpperCase();
      const mat2 = cand.material.trim().toUpperCase();
      if (mat1 === mat2) {
        materialScore = 20;
      }
    }

    // 2. 設備一致: 15点 (L20, M16, M32など完全一致)
    let machineScore = 0;
    if (target.machineName && cand.machineName) {
      const mac1 = this.normalizeMachineName(target.machineName);
      const mac2 = this.normalizeMachineName(cand.machineName);
      if (mac1 === mac2) {
        machineScore = 15;
      }
    }

    // 3. 素材径近似: 15点
    let diameterScore = 0;
    const d1 = target.diameter;
    const d2 = cand.diameter;
    if (d1 !== null && d2 !== null && d1 > 0 && d2 > 0) {
      const diffRate = Math.abs(d1 - d2) / d1;
      if (diffRate <= 0.05) {
        diameterScore = 15;
      } else if (diffRate <= 0.10) {
        diameterScore = 12;
      } else if (diffRate <= 0.20) {
        diameterScore = 8;
      } else if (diffRate <= 0.30) {
        diameterScore = 4;
      } else {
        diameterScore = 0;
      }
    }

    // 4. Feature構成一致: 35点 (Jaccard係数)
    let featureScore = 0;
    const set1 = new Set(target.features.map((f) => f.toUpperCase()));
    const set2 = new Set(cand.features.map((f) => f.toUpperCase()));

    if (set1.size > 0 && set2.size > 0) {
      let intersectionCount = 0;
      for (const item of set1) {
        if (set2.has(item)) intersectionCount++;
      }
      const unionSet = new Set([...set1, ...set2]);
      const jaccard = intersectionCount / unionSet.size;
      featureScore = Number((jaccard * 35).toFixed(2));
    }

    // 5. 寸法近似: 15点 (最大径, 最小径, 全長)
    let dimensionScore = 0;
    const dimensionComparisons: number[] = [];

    // 最大径比較
    if (target.maxDiameter && cand.maxDiameter && target.maxDiameter > 0) {
      const rate = Math.abs(target.maxDiameter - cand.maxDiameter) / target.maxDiameter;
      dimensionComparisons.push(this.scoreDimensionDifference(rate));
    }
    // 最小径比較
    if (target.minDiameter && cand.minDiameter && target.minDiameter > 0) {
      const rate = Math.abs(target.minDiameter - cand.minDiameter) / target.minDiameter;
      dimensionComparisons.push(this.scoreDimensionDifference(rate));
    }
    // 全長比較
    if (target.overallLength && cand.overallLength && target.overallLength > 0) {
      const rate = Math.abs(target.overallLength - cand.overallLength) / target.overallLength;
      dimensionComparisons.push(this.scoreDimensionDifference(rate));
    }

    if (dimensionComparisons.length > 0) {
      const avgDimensionRatio = dimensionComparisons.reduce((a, b) => a + b, 0) / dimensionComparisons.length;
      dimensionScore = Number((avgDimensionRatio * 15).toFixed(2));
    }

    const totalScore = Number(
      (materialScore + machineScore + diameterScore + featureScore + dimensionScore).toFixed(1)
    );

    return {
      materialScore,
      machineScore,
      diameterScore,
      featureScore,
      dimensionScore,
      totalScore,
    };
  }

  /**
   * 設備名の正規化比較 (L20, M16, M32を厳密区別)
   */
  private normalizeMachineName(name: string): string {
    const upper = name.toUpperCase().replace(/\s+/g, '');
    if (upper.includes('L20')) return 'L20';
    if (upper.includes('M16')) return 'M16';
    if (upper.includes('M32')) return 'M32';
    return upper;
  }

  /**
   * 寸法差率に応じたスコア比率 (0.0〜1.0)
   */
  private scoreDimensionDifference(rate: number): number {
    if (rate <= 0.05) return 1.0;
    if (rate <= 0.15) return 0.8;
    if (rate <= 0.30) return 0.5;
    return 0.0;
  }
}

export const similarityService = new SimilarityService();
