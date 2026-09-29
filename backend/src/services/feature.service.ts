import { drawingAnalysisRepository } from '../repositories/drawing-analysis.repository';
import { featureRepository } from '../repositories/feature.repository';
import { AiFeatureItem, RawResponseFeaturesSchema } from '../schemas/feature.schema';
import {
  CreateFeatureInput,
  FeatureListResponseDto,
  GenerateFeaturesResponseDto,
  toFeatureDto,
} from '../types/feature';

export class FeatureService {
  /**
   * AI解析結果から加工Featureを抽出し、featuresテーブルへ登録する
   */
  async generateFeaturesFromAnalysis(analysisId: number): Promise<GenerateFeaturesResponseDto> {
    // 1. drawing_analysis レコード取得
    const analysis = await drawingAnalysisRepository.findById(analysisId);
    if (!analysis) {
      throw new Error('ANALYSIS_NOT_FOUND');
    }

    // 重複登録防止: 既に登録済みの場合は新規登録せず既存件数を返却
    const existingCount = await featureRepository.countByAnalysisId(analysisId);
    if (existingCount > 0) {
      return {
        analysisId,
        featureCount: existingCount,
      };
    }

    // 2. raw_response 取得と JSON解析
    if (!analysis.raw_response) {
      throw new Error('NO_FEATURE_DATA');
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(analysis.raw_response);
    } catch {
      throw new Error('NO_FEATURE_DATA');
    }

    // 3. features 配列の検証
    const validationResult = RawResponseFeaturesSchema.safeParse(parsedJson);
    if (!validationResult.success || validationResult.data.features.length === 0) {
      throw new Error('NO_FEATURE_DATA');
    }

    const aiFeatures = validationResult.data.features;

    // 4. Feature変換と登録データの組み立て
    const createInputs: CreateFeatureInput[] = aiFeatures.map((item, index) => {
      return {
        analysisId,
        sequenceNo: index + 1,
        featureType: item.type,
        description: item.description,
        startDiameter: null,
        endDiameter: null,
        diameter: item.diameter,
        length: item.length,
        depth: item.depth,
        width: null,
        threadSpec: null,
        count: 1,
        toleranceText: null,
        surfaceRoughnessText: null,
        needsReview: this.determineNeedsReview(item.type),
        sourceText: this.buildSourceText(item),
      };
    });

    // 5. DB登録
    try {
      const insertedCount = await featureRepository.createMany(createInputs);
      return {
        analysisId,
        featureCount: insertedCount,
      };
    } catch (err: unknown) {
      console.error('Feature creation failed:', err instanceof Error ? err.message : String(err));
      throw new Error('FEATURE_CREATE_FAILED');
    }
  }

  /**
   * analysis_id に紐づく Feature 一覧を取得
   */
  async getFeaturesByAnalysisId(analysisId: number): Promise<FeatureListResponseDto> {
    const analysis = await drawingAnalysisRepository.findById(analysisId);
    if (!analysis) {
      throw new Error('ANALYSIS_NOT_FOUND');
    }

    const rows = await featureRepository.findByAnalysisId(analysisId);
    return {
      items: rows.map(toFeatureDto),
    };
  }

  /**
   * Feature種別に応じた needs_review の判定
   * - false: OD, ID, DRILL, BORE, GROOVE, CHAMFER
   * - true: THREAD, UNKNOWN
   */
  private determineNeedsReview(featureType: string): boolean {
    switch (featureType) {
      case 'THREAD':
      case 'UNKNOWN':
        return true;
      case 'OD':
      case 'ID':
      case 'DRILL':
      case 'BORE':
      case 'GROOVE':
      case 'CHAMFER':
      default:
        return false;
    }
  }

  /**
   * AI判断根拠 source_text の生成
   */
  private buildSourceText(item: AiFeatureItem): string {
    const parts: string[] = [];

    if (item.description) {
      parts.push(item.description);
    }

    const dims: string[] = [];
    if (item.diameter !== null) dims.push(`φ${item.diameter}`);
    if (item.length !== null) dims.push(`L=${item.length}`);
    if (item.depth !== null) dims.push(`深さ${item.depth}`);

    if (dims.length > 0) {
      parts.push(dims.join(' '));
    }

    return parts.length > 0 ? parts.join(' - ') : `${item.type}加工`;
  }
}

export const featureService = new FeatureService();
