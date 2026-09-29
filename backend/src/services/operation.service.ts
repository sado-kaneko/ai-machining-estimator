import { quoteRepository } from '../repositories/quote.repository';
import { drawingRepository } from '../repositories/drawing.repository';
import { drawingAnalysisRepository } from '../repositories/drawing-analysis.repository';
import { featureRepository } from '../repositories/feature.repository';
import { operationRepository } from '../repositories/operation.repository';
import { UpdateOperationSchema } from '../schemas/operation.schema';
import {
  CreateOperationInput,
  GenerateOperationsResponseDto,
  OperationDto,
  OperationListResponseDto,
  toOperationDto,
} from '../types/operation';

export class OperationService {
  /**
   * 見積案件のFeatureから加工工程候補を生成する
   */
  async generateOperations(quoteId: number, force = false): Promise<GenerateOperationsResponseDto> {
    // 1. 案件存在確認
    const quote = await quoteRepository.findById(quoteId);
    if (!quote) {
      throw new Error('QUOTE_NOT_FOUND');
    }

    // 2. 重複生成防止
    const existingCount = await operationRepository.countByQuoteId(quoteId);
    if (existingCount > 0) {
      if (!force) {
        throw new Error('OPERATIONS_ALREADY_EXIST');
      }
      // force=true の場合は既存工程を削除して再生成
      await operationRepository.deleteByQuoteId(quoteId);
    }

    // 3. 案件に紐づく確定Featureを取得
    const drawings = await drawingRepository.findByQuoteId(quoteId);
    if (drawings.length === 0) {
      throw new Error('NO_CONFIRMED_FEATURES');
    }

    let targetFeatures: import('../types/feature').FeatureRow[] = [];
    for (const drawing of drawings) {
      const latestAnalysis = await drawingAnalysisRepository.findLatestByDrawingId(drawing.id);
      if (latestAnalysis) {
        const feats = await featureRepository.findByAnalysisId(latestAnalysis.id);
        targetFeatures = targetFeatures.concat(feats);
      }
    }

    if (targetFeatures.length === 0) {
      throw new Error('NO_CONFIRMED_FEATURES');
    }

    // 4. Featureから工程候補への変換 (UNKNOWNは除外)
    const validOperations: CreateOperationInput[] = [];
    let seq = 1;

    for (const feature of targetFeatures) {
      const opType = feature.feature_type.toUpperCase();
      const mapped = this.mapFeatureToOperation(opType, feature);
      if (mapped) {
        validOperations.push({
          quoteId,
          featureId: feature.id,
          sequenceNo: seq++,
          operationType: mapped.operationType,
          description: mapped.description,
          machineType: 'CNC_LATHE',
          status: 'GENERATED',
          workDiameter: feature.diameter !== null ? Number(feature.diameter) : 0,
          cuttingLength: feature.length !== null ? Number(feature.length) : (feature.depth !== null ? Number(feature.depth) : 0),
        });
      }
    }

    if (validOperations.length === 0) {
      throw new Error('NO_VALID_OPERATIONS_GENERATED');
    }

    // 5. operations 登録
    const insertedCount = await operationRepository.createMany(validOperations);

    return {
      quoteId,
      operationCount: insertedCount,
    };
  }

  /**
   * quote_id に紐づく工程一覧を取得
   */
  async getOperationsByQuoteId(quoteId: number): Promise<OperationListResponseDto> {
    const quote = await quoteRepository.findById(quoteId);
    if (!quote) {
      throw new Error('QUOTE_NOT_FOUND');
    }

    const rows = await operationRepository.findByQuoteId(quoteId);
    return {
      items: rows.map(toOperationDto),
    };
  }

  /**
   * 工程の更新
   */
  async updateOperation(id: number, data: unknown): Promise<OperationDto> {
    const existing = await operationRepository.findById(id);
    if (!existing) {
      throw new Error('OPERATION_NOT_FOUND');
    }

    const validationResult = UpdateOperationSchema.safeParse(data);
    if (!validationResult.success) {
      throw new Error('VALIDATION_ERROR');
    }

    const validData = validationResult.data;
    const success = await operationRepository.update(id, validData);
    if (!success) {
      throw new Error('OPERATION_UPDATE_FAILED');
    }

    const updated = await operationRepository.findById(id);
    if (!updated) {
      throw new Error('OPERATION_NOT_FOUND');
    }

    return toOperationDto(updated);
  }

  /**
   * 工程の削除
   */
  async deleteOperation(id: number): Promise<boolean> {
    const existing = await operationRepository.findById(id);
    if (!existing) {
      throw new Error('OPERATION_NOT_FOUND');
    }

    return await operationRepository.delete(id);
  }

  /**
   * Feature種別から工程種別と説明へのマッピング
   */
  private mapFeatureToOperation(
    featureType: string,
    feature: import('../types/feature').FeatureRow
  ): { operationType: string; description: string } | null {
    switch (featureType) {
      case 'FACE':
        return { operationType: 'FACE', description: '端面加工' };
      case 'OD':
        return {
          operationType: 'OD',
          description: feature.description ? `外径加工 (${feature.description})` : '外径加工',
        };
      case 'ID':
        return {
          operationType: 'ID',
          description: feature.description ? `内径加工 (${feature.description})` : '内径加工',
        };
      case 'DRILL':
        return {
          operationType: 'DRILL',
          description: feature.description ? `穴加工 (${feature.description})` : '穴加工',
        };
      case 'THREAD':
        return {
          operationType: 'THREAD',
          description: feature.description ? `ねじ加工 (${feature.description})` : 'ねじ加工',
        };
      case 'GROOVE':
        return {
          operationType: 'GROOVE',
          description: feature.description ? `溝加工 (${feature.description})` : '溝加工',
        };
      case 'CHAMFER':
        return {
          operationType: 'CHAMFER',
          description: feature.description ? `面取り加工 (${feature.description})` : '面取り加工',
        };
      case 'UNKNOWN':
      default:
        // UNKNOWNは自動生成しない
        return null;
    }
  }
}

export const operationService = new OperationService();
