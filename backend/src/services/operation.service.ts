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
          machiningSide: mapped.machiningSide,
          description: mapped.description,
          machineType: 'NC_AUTOMATIC_LATHE',
          status: 'GENERATED',
          workDiameter: feature.diameter !== null ? Number(feature.diameter) : 0,
          cuttingLength: feature.length !== null ? Number(feature.length) : (feature.depth !== null ? Number(feature.depth) : 0),
        });
      }
    }

    if (validOperations.length === 0) {
      throw new Error('NO_VALID_OPERATIONS_GENERATED');
    }

    // NC自動旋盤の必須工程: 突切り（CUTOFF）と背面加工（BACK）の自動追加
    const maxDia = Math.max(...validOperations.map(o => o.workDiameter), 20.0);

    // 突切り工程
    const hasCutoff = validOperations.some(o => o.operationType === 'CUTOFF' || o.machiningSide === 'CUTOFF');
    if (!hasCutoff) {
      validOperations.push({
        quoteId,
        featureId: null,
        sequenceNo: seq++,
        operationType: 'CUTOFF',
        machiningSide: 'CUTOFF',
        description: '突切り（製品切落し・サブ主軸受渡し）',
        machineType: 'NC_AUTOMATIC_LATHE',
        status: 'GENERATED',
        workDiameter: maxDia,
        cuttingLength: 3.0,
      });
    }

    // 背面加工工程（背面端面仕上げ・面取り）
    const hasBack = validOperations.some(o => o.machiningSide === 'BACK');
    if (!hasBack) {
      validOperations.push({
        quoteId,
        featureId: null,
        sequenceNo: seq++,
        operationType: 'BACK_FACE',
        machiningSide: 'BACK',
        description: '背面加工（端面仕上げ・面取り）',
        machineType: 'NC_AUTOMATIC_LATHE',
        status: 'GENERATED',
        workDiameter: maxDia,
        cuttingLength: 1.0,
      });
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

    // 要件2: 手動編集された場合は状態を自動的に MANUAL に変動
    if (!validData.status) {
      validData.status = 'MANUAL';
    }

    // 要件3: 工程順序が変更された場合、他工程の順序も自動で再配置・連番更新
    if (validData.sequenceNo !== undefined && validData.sequenceNo !== existing.sequence_no) {
      const allOps = await operationRepository.findByQuoteId(existing.quote_id);
      const otherOps = allOps.filter((o) => o.id !== id);
      // 1-indexed の sequenceNo を 0-indexed に変換し範囲制限
      const targetIndex = Math.max(0, Math.min(validData.sequenceNo - 1, otherOps.length));
      otherOps.splice(targetIndex, 0, existing);

      // 全工程の sequence_no を 1, 2, 3... にリナンバリング
      const sequenceUpdates = otherOps.map((op, idx) => ({
        id: op.id,
        sequenceNo: idx + 1,
      }));
      await operationRepository.updateSequences(sequenceUpdates);

      // 該当レコードの確定した新しい順序番号をセット
      validData.sequenceNo = targetIndex + 1;
    }

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
  ): { operationType: string; machiningSide: 'FRONT' | 'CUTOFF' | 'BACK'; description: string } | null {
    switch (featureType) {
      case 'FACE':
        return { operationType: 'FACE', machiningSide: 'FRONT', description: '端面加工' };
      case 'OD':
        return {
          operationType: 'OD',
          machiningSide: 'FRONT',
          description: feature.description ? `外径加工 (${feature.description})` : '外径加工',
        };
      case 'ID':
        return {
          operationType: 'ID',
          machiningSide: 'FRONT',
          description: feature.description ? `内径加工 (${feature.description})` : '内径加工',
        };
      case 'DRILL':
        return {
          operationType: 'DRILL',
          machiningSide: 'FRONT',
          description: feature.description ? `穴加工 (${feature.description})` : '穴加工',
        };
      case 'THREAD':
        return {
          operationType: 'THREAD',
          machiningSide: 'FRONT',
          description: feature.description ? `ねじ加工 (${feature.description})` : 'ねじ加工',
        };
      case 'GROOVE':
        return {
          operationType: 'GROOVE',
          machiningSide: 'FRONT',
          description: feature.description ? `溝加工 (${feature.description})` : '溝加工',
        };
      case 'CHAMFER':
        return {
          operationType: 'CHAMFER',
          machiningSide: 'FRONT',
          description: feature.description ? `面取り加工 (${feature.description})` : '面取り加工',
        };
      case 'CUTOFF':
        return {
          operationType: 'CUTOFF',
          machiningSide: 'CUTOFF',
          description: '突切り加工',
        };
      case 'BACK':
        return {
          operationType: 'BACK_FACE',
          machiningSide: 'BACK',
          description: '背面加工',
        };
      case 'UNKNOWN':
      default:
        // UNKNOWNは自動生成しない
        return null;
    }
  }
}

export const operationService = new OperationService();
