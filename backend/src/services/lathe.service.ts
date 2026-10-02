import { quoteRepository } from '../repositories/quote.repository';
import { drawingRepository } from '../repositories/drawing.repository';
import { drawingAnalysisRepository } from '../repositories/drawing-analysis.repository';
import { featureRepository } from '../repositories/feature.repository';
import { latheRepository } from '../repositories/lathe.repository';
import { materialRepository } from '../repositories/material.repository';
import {
  AutomaticLatheOperationDto,
  CreateLatheOperationInput,
  LatheCycleTimeSummaryDto,
  LatheMastersDto,
  toAutomaticLatheOperationDto,
} from '../types/lathe';

export class LatheService {
  /**
   * FeatureからNC自動旋盤用の工程候補を生成
   * POST /api/quotes/:id/lathe-operations/generate
   */
  async generateLatheOperations(quoteId: number, force = false): Promise<{ quoteId: number; operationCount: number }> {
    const quote = await quoteRepository.findById(quoteId);
    if (!quote) {
      throw new Error('QUOTE_NOT_FOUND');
    }

    // 重複防止
    const existingCount = await latheRepository.countByQuoteId(quoteId);
    if (existingCount > 0) {
      if (!force) {
        throw new Error('OPERATIONS_ALREADY_EXIST');
      }
      await latheRepository.deleteByQuoteId(quoteId);
    }

    // 案件の図面・解析に紐づくFeatureを取得
    const drawings = await drawingRepository.findByQuoteId(quoteId);
    let targetFeatures: import('../types/feature').FeatureRow[] = [];
    for (const d of drawings) {
      const analysis = await drawingAnalysisRepository.findLatestByDrawingId(d.id);
      if (analysis) {
        const feats = await featureRepository.findByAnalysisId(analysis.id);
        targetFeatures = targetFeatures.concat(feats);
      }
    }

    if (targetFeatures.length === 0) {
      throw new Error('NO_CONFIRMED_FEATURES');
    }

    // 全工程マスタを取得してマッピング準備
    const processMasters = await latheRepository.findAllProcesses();
    const procMap = new Map<string, number>();
    processMasters.forEach(p => procMap.set(p.process_name, p.id));

    const inputs: CreateLatheOperationInput[] = [];
    let seq = 1;

    // FeatureをNC自動旋盤工程へ変換
    for (const feat of targetFeatures) {
      const type = feat.feature_type.toUpperCase();
      if (type === 'UNKNOWN') {
        continue;
      }

      let procName = '';
      switch (type) {
        case 'OD':
          procName = '外径加工';
          break;
        case 'ID':
          procName = '内径加工';
          break;
        case 'FACE':
          procName = '端面加工';
          break;
        case 'DRILL':
          procName = '穴加工';
          break;
        case 'TAP':
          procName = 'タップ';
          break;
        case 'BORE':
          procName = 'リーマ';
          break;
        case 'THREAD':
          procName = 'ねじ加工';
          break;
        case 'GROOVE':
          procName = '溝加工';
          break;
        case 'CUTOFF':
          procName = '突切り';
          break;
        case 'CHAMFER':
          procName = '面取り';
          break;
        default:
          procName = '外径加工';
          break;
      }

      const processId = procMap.get(procName);
      if (!processId) {
        continue;
      }

      inputs.push({
        quoteId,
        featureId: feat.id,
        sequenceNo: seq++,
        processId,
        machiningLength: Number(feat.length ?? 10.0),
        diameter: Number(feat.diameter ?? (feat.start_diameter ?? 20.0)),
        depth: Number(feat.depth ?? 0),
        repeatCount: Number(feat.count ?? 1),
        feed: 0,
        vc: 0,
        cuttingTimeSec: 0,
        nonCuttingTimeSec: 0,
        totalTimeSec: 0,
        status: 'GENERATED',
      });
    }

    if (inputs.length === 0) {
      throw new Error('NO_VALID_OPERATIONS_GENERATED');
    }

    // 自動旋盤特有の工程（突切りや背面加工）を末尾に補完追加（存在しない場合）
    const hasCutoff = inputs.some(i => i.processId === procMap.get('突切り'));
    if (!hasCutoff && procMap.has('突切り')) {
      const materialInfo = await materialRepository.findByQuoteId(quoteId);
      const stockDiameter = (materialInfo?.diameter ? Number(materialInfo.diameter) : null) || inputs[0]?.diameter || 20.0;
      inputs.push({
        quoteId,
        featureId: null,
        sequenceNo: seq++,
        processId: procMap.get('突切り')!,
        machiningLength: 3.0,
        diameter: stockDiameter,
        depth: stockDiameter / 2,
        repeatCount: 1,
        feed: 0,
        vc: 0,
        cuttingTimeSec: 0,
        nonCuttingTimeSec: 0,
        totalTimeSec: 0,
        status: 'GENERATED',
      });
    }

    await latheRepository.createOperations(inputs);

    return {
      quoteId,
      operationCount: inputs.length,
    };
  }

  /**
   * quote_id に紐づく自動旋盤工程一覧を取得
   * GET /api/quotes/:id/lathe-operations
   */
  async getLatheOperations(quoteId: number): Promise<AutomaticLatheOperationDto[]> {
    const quote = await quoteRepository.findById(quoteId);
    if (!quote) {
      throw new Error('QUOTE_NOT_FOUND');
    }

    const rows = await latheRepository.findOperationsByQuoteId(quoteId);
    return rows.map((r) => {
      // RPMの逆算 (vcとdiameterから)
      let rpm = 0;
      if (Number(r.vc) > 0 && Number(r.diameter) > 0) {
        rpm = Math.round((Number(r.vc) * 1000) / (Math.PI * Number(r.diameter)));
      }
      return toAutomaticLatheOperationDto(r, r.process_name, r.process_category, rpm);
    });
  }

  /**
   * NC自動旋盤サイクルタイム計算
   * POST /api/quotes/:id/lathe-cycle-time/calculate
   */
  async calculateLatheCycleTime(
    quoteId: number,
    options?: { maxRpm?: number }
  ): Promise<LatheCycleTimeSummaryDto> {
    const quote = await quoteRepository.findById(quoteId);
    if (!quote) {
      throw new Error('QUOTE_NOT_FOUND');
    }

    const operations = await latheRepository.findOperationsByQuoteId(quoteId);
    if (operations.length === 0) {
      throw new Error('NO_OPERATION_DATA');
    }

    // 1. 材質取得
    let materialName = 'DEFAULT';
    const drawings = await drawingRepository.findByQuoteId(quoteId);
    for (const d of drawings) {
      const a = await drawingAnalysisRepository.findLatestByDrawingId(d.id);
      if (a && a.material) {
        materialName = a.material;
        break;
      }
    }

    // 2. 素材情報取得
    const materialInfo = await materialRepository.findByQuoteId(quoteId);
    const stockDiameter = materialInfo?.diameter ? Number(materialInfo.diameter) : null;

    // 3. 設備マスタ取得
    const machine = await latheRepository.findMachineByType('NC_AUTOMATIC_LATHE');
    const machineMaxRpm =
      options?.maxRpm && options.maxRpm > 0
        ? options.maxRpm
        : machine
        ? Number(machine.max_rpm)
        : 10000;
    const machineName = machine ? machine.machine_name : 'Cincom L20';

    // 4. 非切削時間マスタ取得
    const machineTimes = await latheRepository.findMachineTimes('NC_AUTOMATIC_LATHE');
    const timeMap = new Map<string, number>();
    machineTimes.forEach(t => timeMap.set(t.parameter_name, Number(t.time_sec)));

    const toolChangeTime = timeMap.get('TOOL_CHANGE') ?? 1.5;
    const idlingTime = timeMap.get('IDLING') ?? 2.0;
    const materialFeedTime = timeMap.get('MATERIAL_FEED') ?? 2.5;
    const partPickupTime = timeMap.get('PART_PICKUP') ?? 2.0;

    let totalCuttingSec = 0;
    let totalNonCuttingSec = 0;

    // 各工程の切削時間・非切削時間計算
    for (const op of operations) {
      const cond = await latheRepository.findCondition(materialName, op.process_id);
      if (!cond) {
        throw new Error('CONDITION_NOT_FOUND');
      }

      const vc = Number(cond.vc);
      const feed = Number(cond.feed);
      const diameter = Number(op.diameter) > 0 ? Number(op.diameter) : 20.0;
      const length = Number(op.machining_length) > 0 ? Number(op.machining_length) : 10.0;
      const repeats = op.repeat_count > 0 ? op.repeat_count : 1;

      // 回転数 N = Vc * 1000 / (π * D)
      let rpm = (vc * 1000) / (Math.PI * diameter);
      if (rpm > machineMaxRpm) rpm = machineMaxRpm;
      if (rpm < 100) rpm = 100;
      rpm = Math.round(rpm);

      // 送り速度 F = N * f (粗加工送り)
      let feedRate = rpm * feed;
      if (feedRate <= 0) feedRate = 50.0;

      // 仕上げ送りの設定 (粗加工送りの約60%で面粗さ・精度を確保)
      const finishFeed = feed * 0.6;
      let finishFeedRate = rpm * finishFeed;
      if (finishFeedRate <= 0) finishFeedRate = 30.0;

      // 切込み深さ ap (マスタ設定値、無ければデフォルト1.5mm)
      const ap = cond.ap && Number(cond.ap) > 0 ? Number(cond.ap) : 1.5;

      let cuttingTimeSec = 0;
      // 工程非切削時間（工具交換＋アプローチ）
      const opNonCuttingSec = toolChangeTime + 1.0;

      switch (op.calculation_type) {
        case 'FEED_TURNING': {
          // 外径・内径加工: 粗加工（荒挽き）＋仕上げ加工（仕上げ挽き）
          let totalStockRadius = 0;
          if (stockDiameter && stockDiameter > diameter) {
            totalStockRadius = (stockDiameter - diameter) / 2;
          } else {
            totalStockRadius = Math.max(ap * 1.2, 1.0);
          }

          // 仕上げ代 (半径 0.2mm)
          const finishAllowance = 0.2;
          const roughStockRadius = Math.max(0, totalStockRadius - finishAllowance);

          // 粗加工パス数 (切り込み量 ap に応じて算出、最低1パス)
          const roughPasses = Math.max(1, Math.ceil(roughStockRadius / ap));
          const finishPasses = 1;

          // 粗加工時間・仕上げ加工時間・戻り時間
          const roughTime = (length / feedRate) * 60 * roughPasses;
          const finishTime = (length / finishFeedRate) * 60 * finishPasses;
          const retractTime = (roughPasses - 1) * 0.6;

          cuttingTimeSec = (roughTime + finishTime + retractTime) * repeats;
          break;
        }

        case 'FEED_FACE': {
          // 端面加工: 端面粗削り（1パス）＋端面仕上げ削り（1パス）
          const faceDiam = (stockDiameter && stockDiameter > 0) ? stockDiameter : diameter;
          const faceRadius = faceDiam / 2;
          const roughFaceTime = (faceRadius / feedRate) * 60;
          const finishFaceTime = (faceRadius / finishFeedRate) * 60;
          cuttingTimeSec = roughFaceTime + finishFaceTime;
          break;
        }

        case 'FEED_DRILL':
        case 'FEED_REAMER':
          // 穴・リーマ: 深さ / F * 60
          const drillDepth = Number(op.depth) > 0 ? Number(op.depth) : length;
          cuttingTimeSec = (drillDepth / feedRate) * 60;
          break;

        case 'FEED_TAP':
          // タップ: (深さ / (N * ピッチ)) * 60 * 2 (正転・逆転)
          const tapPitch = feed > 0 ? feed : 1.25;
          const tapDepth = Number(op.depth) > 0 ? Number(op.depth) : length;
          cuttingTimeSec = ((tapDepth / (rpm * tapPitch)) * 60) * 2 + 1.0;
          break;

        case 'THREAD':
          // ねじ: (L / (N * ピッチ)) * 60 * パス数(6) + 余裕
          const pitch = feed > 0 ? feed : 1.5;
          cuttingTimeSec = ((length / (rpm * pitch)) * 60) * 6 + 2.0;
          break;

        case 'GROOVE':
          // 溝: 深さ / F * 60 + ドウェル2秒
          const grooveDepth = Number(op.depth) > 0 ? Number(op.depth) : 3.0;
          cuttingTimeSec = (grooveDepth / feedRate) * 60 + 2.0;
          break;

        case 'CUTOFF':
          // 突切り: (D / 2) / F * 60 + 1秒
          cuttingTimeSec = ((diameter / 2) / feedRate) * 60 + 1.0;
          break;

        case 'BACK_MACHINING':
          // 背面加工: 固定5秒
          cuttingTimeSec = 5.0;
          break;

        case 'CHAMFER':
          // 面取り: 固定2秒
          cuttingTimeSec = 2.0;
          break;

        default:
          cuttingTimeSec = (length / feedRate) * 60;
          break;
      }

      cuttingTimeSec = Math.round(cuttingTimeSec * 1000) / 1000;
      const opTotalTimeSec = Math.round((cuttingTimeSec + opNonCuttingSec) * 1000) / 1000;

      // DBへ計算結果を保存
      await latheRepository.updateOperationCalculation(op.id, {
        feed,
        vc,
        cuttingTimeSec,
        nonCuttingTimeSec: opNonCuttingSec,
        totalTimeSec: opTotalTimeSec,
      });

      totalCuttingSec += cuttingTimeSec;
      totalNonCuttingSec += opNonCuttingSec;
    }

    // 機械全体の固定非切削時間（材料送り＋回収＋アイドル）を加算
    const globalFixedNonCutting = materialFeedTime + partPickupTime + idlingTime;
    totalNonCuttingSec += globalFixedNonCutting;

    const cuttingTimeSec = Math.round(totalCuttingSec * 1000) / 1000;
    const nonCuttingTimeSec = Math.round(totalNonCuttingSec * 1000) / 1000;
    const totalCycleTimeSec = Math.round((cuttingTimeSec + nonCuttingTimeSec) * 1000) / 1000;
    const quantity = quote.quantity > 0 ? quote.quantity : 1;
    const totalLotTimeSec = Math.round(totalCycleTimeSec * quantity * 1000) / 1000;

    const updatedOps = await this.getLatheOperations(quoteId);

    return {
      quoteId,
      machineName,
      materialName,
      quantity,
      cuttingTimeSec,
      nonCuttingTimeSec,
      totalCycleTimeSec,
      totalLotTimeSec,
      operations: updatedOps,
    };
  }

  /**
   * サイクルタイム計算結果の取得
   * GET /api/quotes/:id/lathe-cycle-time
   */
  async getLatheCycleTime(quoteId: number): Promise<LatheCycleTimeSummaryDto | null> {
    const quote = await quoteRepository.findById(quoteId);
    if (!quote) {
      throw new Error('QUOTE_NOT_FOUND');
    }

    const operations = await this.getLatheOperations(quoteId);
    if (operations.length === 0) {
      return null;
    }

    let totalCuttingSec = 0;
    let totalNonCuttingSec = 0;
    for (const op of operations) {
      totalCuttingSec += op.cuttingTimeSec;
      totalNonCuttingSec += op.nonCuttingTimeSec;
    }

    // 計算がまだ行われていない場合
    if (totalCuttingSec === 0 && totalNonCuttingSec === 0) {
      return null;
    }

    const machineTimes = await latheRepository.findMachineTimes('NC_AUTOMATIC_LATHE');
    const timeMap = new Map<string, number>();
    machineTimes.forEach(t => timeMap.set(t.parameter_name, Number(t.time_sec)));
    const globalFixedNonCutting = (timeMap.get('MATERIAL_FEED') ?? 2.5) + (timeMap.get('PART_PICKUP') ?? 2.0) + (timeMap.get('IDLING') ?? 2.0);
    totalNonCuttingSec += globalFixedNonCutting;

    const cuttingTimeSec = Math.round(totalCuttingSec * 1000) / 1000;
    const nonCuttingTimeSec = Math.round(totalNonCuttingSec * 1000) / 1000;
    const totalCycleTimeSec = Math.round((cuttingTimeSec + nonCuttingTimeSec) * 1000) / 1000;
    const quantity = quote.quantity > 0 ? quote.quantity : 1;
    const totalLotTimeSec = Math.round(totalCycleTimeSec * quantity * 1000) / 1000;

    let materialName = 'S45C';
    const drawings = await drawingRepository.findByQuoteId(quoteId);
    for (const d of drawings) {
      const a = await drawingAnalysisRepository.findLatestByDrawingId(d.id);
      if (a && a.material) {
        materialName = a.material;
        break;
      }
    }

    return {
      quoteId,
      machineName: 'Cincom L20',
      materialName,
      quantity,
      cuttingTimeSec,
      nonCuttingTimeSec,
      totalCycleTimeSec,
      totalLotTimeSec,
      operations,
    };
  }

  // ==============================================================
  // PHASE12: マスタ取得 & 工程再生成
  // ==============================================================

  /**
   * NC自動旋盤マスタ一覧取得
   * GET /api/lathe-masters
   */
  async getLatheMasters(): Promise<LatheMastersDto> {
    const processes = await latheRepository.findAutomaticLatheProcessMasters();
    const timeMaster = await latheRepository.findAutomaticLatheTimeMaster('NC_AUTOMATIC_LATHE');
    const machines = await latheRepository.findAllMachines();
    const conditionsCount = await latheRepository.countConditions();

    return {
      processes,
      timeMaster,
      machines,
      conditionsCount,
    };
  }

  /**
   * 工程再生成 (最新マスタに基づいて全再生成)
   * POST /api/quotes/:id/lathe-operations/regenerate
   */
  async regenerateLatheOperations(quoteId: number): Promise<{ quoteId: number; operationCount: number }> {
    return await this.generateLatheOperations(quoteId, true);
  }
}

export const latheService = new LatheService();
