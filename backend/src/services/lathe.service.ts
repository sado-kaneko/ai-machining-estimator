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
        machiningSide: 'FRONT',
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

    const materialInfo = await materialRepository.findByQuoteId(quoteId);
    const stockDiameter = (materialInfo?.diameter ? Number(materialInfo.diameter) : null) || inputs[0]?.diameter || 20.0;

    // 自動旋盤特有の工程: 突切り（CUTOFF）を補完追加
    const cutoffProcId = procMap.get('突切り');
    const hasCutoff = inputs.some(i => i.processId === cutoffProcId);
    if (!hasCutoff && cutoffProcId) {
      inputs.push({
        quoteId,
        featureId: null,
        sequenceNo: seq++,
        processId: cutoffProcId,
        machiningSide: 'CUTOFF',
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

    // 自動旋盤特有の工程: 背面加工（BACK）を補完追加
    // 1. 背面端面加工
    const backFaceProcId = procMap.get('背面端面加工') || procMap.get('背面加工');
    if (backFaceProcId) {
      inputs.push({
        quoteId,
        featureId: null,
        sequenceNo: seq++,
        processId: backFaceProcId,
        machiningSide: 'BACK',
        machiningLength: 1.0,
        diameter: stockDiameter,
        depth: 0,
        repeatCount: 1,
        feed: 0,
        vc: 0,
        cuttingTimeSec: 0,
        nonCuttingTimeSec: 0,
        totalTimeSec: 0,
        status: 'GENERATED',
      });
    }

    // 2. 背面面取り
    const backChamferProcId = procMap.get('背面面取り');
    if (backChamferProcId) {
      inputs.push({
        quoteId,
        featureId: null,
        sequenceNo: seq++,
        processId: backChamferProcId,
        machiningSide: 'BACK',
        machiningLength: 0.5,
        diameter: stockDiameter,
        depth: 0,
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
   * 材質名をマスタ定義キー（S45C, SS400, SUS304, A6061, DEFAULT）に正規化
   */
  normalizeMaterialName(rawMaterial: string | null | undefined): string {
    if (!rawMaterial) return 'S45C';
    const mat = rawMaterial.trim().toUpperCase();

    // 1. ステンレス系 (低周速・低送り・耐熱)
    if (mat.includes('SUS') || mat.includes('STAINLESS') || mat.includes('ステンレス')) {
      return 'SUS304';
    }
    // 2. アルミニウム系 (超高速・高送り・高切り込み)
    if (
      mat.includes('A6061') ||
      mat.includes('A5052') ||
      mat.includes('A2017') ||
      mat.includes('A7075') ||
      mat.includes('AL') ||
      mat.includes('アルミ')
    ) {
      return 'A6061';
    }
    // 3. 黄銅・真鍮 (高速快削)
    if (mat.includes('C3604') || mat.includes('BRASS') || mat.includes('黄銅') || mat.includes('真鍮')) {
      return 'A6061';
    }
    // 4. SS400 (一般構造用鋼)
    if (mat.includes('SS400') || mat.includes('SS41')) {
      return 'SS400';
    }
    // 5. 炭素鋼 (S45C系)
    if (
      mat.includes('S45C') ||
      mat.includes('S50C') ||
      mat.includes('S35C') ||
      mat.includes('STEEL') ||
      mat.includes('鉄') ||
      mat.includes('鋼')
    ) {
      return 'S45C';
    }

    return 'DEFAULT';
  }

  /**
   * NC自動旋盤サイクルタイム計算
   * POST /api/quotes/:id/lathe-cycle-time/calculate
   */
  async calculateLatheCycleTime(
    quoteId: number,
    options?: { maxRpm?: number; machiningMode?: 'SIMULTANEOUS' | 'SEQUENTIAL' }
  ): Promise<LatheCycleTimeSummaryDto> {
    const quote = await quoteRepository.findById(quoteId);
    if (!quote) {
      throw new Error('QUOTE_NOT_FOUND');
    }

    const operations = await latheRepository.findOperationsByQuoteId(quoteId);
    if (operations.length === 0) {
      throw new Error('NO_OPERATION_DATA');
    }

    // モードの反映（指定があれば保存）
    if (options?.machiningMode) {
      await latheRepository.saveMachiningMode(quoteId, options.machiningMode);
    }
    const effectiveMachiningMode = options?.machiningMode || (await latheRepository.getMachiningMode(quoteId));

    // 1. 材質取得 & 正規化 (quote.materialを最優先、なければ図面解析結果)
    let rawMaterialName = quote.material && quote.material.trim().length > 0 ? quote.material.trim() : '';
    if (!rawMaterialName) {
      const drawings = await drawingRepository.findByQuoteId(quoteId);
      for (const d of drawings) {
        const a = await drawingAnalysisRepository.findLatestByDrawingId(d.id);
        if (a && a.material && a.material.trim().length > 0) {
          rawMaterialName = a.material.trim();
          break;
        }
      }
    }
    const normalizedMaterial = this.normalizeMaterialName(rawMaterialName || 'S45C');

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

    // 各加工面ごとの切削・非切削時間集計用
    let frontCuttingSec = 0;
    let frontNonCuttingSec = 0;
    let cutoffCuttingSec = 0;
    let cutoffNonCuttingSec = 0;
    let backCuttingSec = 0;
    let backNonCuttingSec = 0;

    // 各工程の切削時間・非切削時間計算
    for (const op of operations) {
      const cond = await latheRepository.findCondition(normalizedMaterial, op.process_id);
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
          let totalStockRadius = 0;
          if (stockDiameter && stockDiameter > diameter) {
            totalStockRadius = (stockDiameter - diameter) / 2;
          } else {
            totalStockRadius = Math.max(ap * 1.2, 1.0);
          }

          const finishAllowance = 0.2;
          const roughStockRadius = Math.max(0, totalStockRadius - finishAllowance);
          const roughPasses = Math.max(1, Math.ceil(roughStockRadius / ap));
          const finishPasses = 1;

          const roughTime = (length / feedRate) * 60 * roughPasses;
          const finishTime = (length / finishFeedRate) * 60 * finishPasses;
          const retractTime = (roughPasses - 1) * 0.6;

          cuttingTimeSec = (roughTime + finishTime + retractTime) * repeats;
          break;
        }

        case 'FEED_FACE': {
          const faceDiam = (stockDiameter && stockDiameter > 0) ? stockDiameter : diameter;
          const faceRadius = faceDiam / 2;
          const roughFaceTime = (faceRadius / feedRate) * 60;
          const finishFaceTime = (faceRadius / finishFeedRate) * 60;
          cuttingTimeSec = roughFaceTime + finishFaceTime;
          break;
        }

        case 'FEED_DRILL':
        case 'FEED_REAMER': {
          const drillDepth = Number(op.depth) > 0 ? Number(op.depth) : length;
          cuttingTimeSec = (drillDepth / feedRate) * 60;
          break;
        }

        case 'FEED_TAP': {
          const tapPitch = feed > 0 ? feed : 1.25;
          const tapDepth = Number(op.depth) > 0 ? Number(op.depth) : length;
          cuttingTimeSec = ((tapDepth / (rpm * tapPitch)) * 60) * 2 + 1.0;
          break;
        }

        case 'THREAD': {
          const pitch = feed > 0 ? feed : 1.5;
          cuttingTimeSec = ((length / (rpm * pitch)) * 60) * 6 + 2.0;
          break;
        }

        case 'GROOVE': {
          const grooveDepth = Number(op.depth) > 0 ? Number(op.depth) : 3.0;
          cuttingTimeSec = (grooveDepth / feedRate) * 60 + 2.0;
          break;
        }

        case 'CUTOFF': {
          cuttingTimeSec = ((diameter / 2) / feedRate) * 60 + 1.0;
          break;
        }

        case 'BACK_MACHINING': {
          cuttingTimeSec = 4.0;
          break;
        }

        case 'CHAMFER': {
          cuttingTimeSec = 1.5;
          break;
        }

        default: {
          cuttingTimeSec = (length / feedRate) * 60;
          break;
        }
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

      // 加工面（正面 / 突切り / 背面）別に時間を集計
      const side = (op.machining_side as 'FRONT' | 'CUTOFF' | 'BACK') || 'FRONT';
      if (side === 'CUTOFF' || op.process_name === '突切り') {
        cutoffCuttingSec += cuttingTimeSec;
        cutoffNonCuttingSec += opNonCuttingSec;
      } else if (side === 'BACK' || op.process_name.includes('背面')) {
        backCuttingSec += cuttingTimeSec;
        backNonCuttingSec += opNonCuttingSec;
      } else {
        frontCuttingSec += cuttingTimeSec;
        frontNonCuttingSec += opNonCuttingSec;
      }
    }

    // 機械全体の固定非切削時間（材料送り＋回収＋アイドル）
    const globalFixedNonCutting = materialFeedTime + partPickupTime + idlingTime;

    const frontTotalSec = Math.round((frontCuttingSec + frontNonCuttingSec) * 1000) / 1000;
    const cutoffTotalSec = Math.round((cutoffCuttingSec + cutoffNonCuttingSec) * 1000) / 1000;
    const backTotalSec = Math.round((backCuttingSec + backNonCuttingSec) * 1000) / 1000;

    let dominantSide: 'FRONT' | 'BACK' | undefined = undefined;
    let savedTimeSec = 0;
    let totalCuttingSec = 0;
    let totalNonCuttingSec = 0;

    if (effectiveMachiningMode === 'SIMULTANEOUS') {
      // ⚡ 同時加工（並行/重畳加工）:
      // 正面と背面で長い方が支配工程（ボトルネック）となる
      dominantSide = frontTotalSec >= backTotalSec ? 'FRONT' : 'BACK';
      // 同時加工による短縮秒数（短い方の時間分が丸ごと短縮される）
      savedTimeSec = Math.round(Math.min(frontTotalSec, backTotalSec) * 1000) / 1000;

      totalCuttingSec = Math.max(frontCuttingSec, backCuttingSec) + cutoffCuttingSec;
      totalNonCuttingSec = Math.max(frontNonCuttingSec, backNonCuttingSec) + cutoffNonCuttingSec + globalFixedNonCutting;
    } else {
      // 順次加工（直列加工）
      dominantSide = undefined;
      savedTimeSec = 0;
      totalCuttingSec = frontCuttingSec + cutoffCuttingSec + backCuttingSec;
      totalNonCuttingSec = frontNonCuttingSec + cutoffNonCuttingSec + backNonCuttingSec + globalFixedNonCutting;
    }

    const cuttingTimeSec = Math.round(totalCuttingSec * 1000) / 1000;
    const nonCuttingTimeSec = Math.round(totalNonCuttingSec * 1000) / 1000;
    const totalCycleTimeSec = Math.round((cuttingTimeSec + nonCuttingTimeSec) * 1000) / 1000;
    const quantity = quote.quantity > 0 ? quote.quantity : 1;
    const totalLotTimeSec = Math.round(totalCycleTimeSec * quantity * 1000) / 1000;

    const updatedOps = await this.getLatheOperations(quoteId);

    return {
      quoteId,
      machineName,
      materialName: rawMaterialName,
      quantity,
      cuttingTimeSec,
      nonCuttingTimeSec,
      totalCycleTimeSec,
      totalLotTimeSec,
      machiningMode: effectiveMachiningMode,
      frontCuttingTimeSec: Math.round(frontCuttingSec * 1000) / 1000,
      backCuttingTimeSec: Math.round(backCuttingSec * 1000) / 1000,
      cutoffCuttingTimeSec: Math.round(cutoffCuttingSec * 1000) / 1000,
      frontTotalTimeSec: frontTotalSec,
      backTotalTimeSec: backTotalSec,
      cutoffTotalTimeSec: cutoffTotalSec,
      dominantSide,
      savedTimeSec,
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

    // 計算がまだ行われていないか判定
    const hasCalculated = operations.some(o => o.cuttingTimeSec > 0 || o.nonCuttingTimeSec > 0);
    if (!hasCalculated) {
      return null;
    }

    const effectiveMachiningMode = await latheRepository.getMachiningMode(quoteId);

    let frontCuttingSec = 0;
    let frontNonCuttingSec = 0;
    let cutoffCuttingSec = 0;
    let cutoffNonCuttingSec = 0;
    let backCuttingSec = 0;
    let backNonCuttingSec = 0;

    for (const op of operations) {
      const side = op.machiningSide || 'FRONT';
      if (side === 'CUTOFF' || op.processName === '突切り') {
        cutoffCuttingSec += op.cuttingTimeSec;
        cutoffNonCuttingSec += op.nonCuttingTimeSec;
      } else if (side === 'BACK' || op.processName.includes('背面')) {
        backCuttingSec += op.cuttingTimeSec;
        backNonCuttingSec += op.nonCuttingTimeSec;
      } else {
        frontCuttingSec += op.cuttingTimeSec;
        frontNonCuttingSec += op.nonCuttingTimeSec;
      }
    }

    const machineTimes = await latheRepository.findMachineTimes('NC_AUTOMATIC_LATHE');
    const timeMap = new Map<string, number>();
    machineTimes.forEach(t => timeMap.set(t.parameter_name, Number(t.time_sec)));
    const globalFixedNonCutting = (timeMap.get('MATERIAL_FEED') ?? 2.5) + (timeMap.get('PART_PICKUP') ?? 2.0) + (timeMap.get('IDLING') ?? 2.0);

    const frontTotalSec = Math.round((frontCuttingSec + frontNonCuttingSec) * 1000) / 1000;
    const cutoffTotalSec = Math.round((cutoffCuttingSec + cutoffNonCuttingSec) * 1000) / 1000;
    const backTotalSec = Math.round((backCuttingSec + backNonCuttingSec) * 1000) / 1000;

    let dominantSide: 'FRONT' | 'BACK' | undefined = undefined;
    let savedTimeSec = 0;
    let totalCuttingSec = 0;
    let totalNonCuttingSec = 0;

    if (effectiveMachiningMode === 'SIMULTANEOUS') {
      dominantSide = frontTotalSec >= backTotalSec ? 'FRONT' : 'BACK';
      savedTimeSec = Math.round(Math.min(frontTotalSec, backTotalSec) * 1000) / 1000;
      totalCuttingSec = Math.max(frontCuttingSec, backCuttingSec) + cutoffCuttingSec;
      totalNonCuttingSec = Math.max(frontNonCuttingSec, backNonCuttingSec) + cutoffNonCuttingSec + globalFixedNonCutting;
    } else {
      dominantSide = undefined;
      savedTimeSec = 0;
      totalCuttingSec = frontCuttingSec + cutoffCuttingSec + backCuttingSec;
      totalNonCuttingSec = frontNonCuttingSec + cutoffNonCuttingSec + backNonCuttingSec + globalFixedNonCutting;
    }

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
      machiningMode: effectiveMachiningMode,
      frontCuttingTimeSec: Math.round(frontCuttingSec * 1000) / 1000,
      backCuttingTimeSec: Math.round(backCuttingSec * 1000) / 1000,
      cutoffCuttingTimeSec: Math.round(cutoffCuttingSec * 1000) / 1000,
      frontTotalTimeSec: frontTotalSec,
      backTotalTimeSec: backTotalSec,
      cutoffTotalTimeSec: cutoffTotalSec,
      dominantSide,
      savedTimeSec,
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

  /**
   * 単一工程の切削条件（回転数、送り）の個別更新と再計算
   * PUT /api/quotes/:id/lathe-operations/:opId
   */
  async updateOperationCondition(
    quoteId: number,
    opId: number,
    data: { feed?: number; rpm?: number; vc?: number }
  ): Promise<LatheCycleTimeSummaryDto> {
    const op = await latheRepository.findOperationById(opId);
    if (!op || op.quote_id !== quoteId) {
      throw new Error('OPERATION_NOT_FOUND');
    }

    const diameter = Number(op.diameter) > 0 ? Number(op.diameter) : 20.0;
    const length = Number(op.machining_length) > 0 ? Number(op.machining_length) : 10.0;
    const repeats = op.repeat_count > 0 ? op.repeat_count : 1;

    // 素材情報取得
    const materialInfo = await materialRepository.findByQuoteId(quoteId);
    const stockDiameter = materialInfo?.diameter ? Number(materialInfo.diameter) : null;

    // 設備取得
    const machine = await latheRepository.findMachineByType('NC_AUTOMATIC_LATHE');
    const machineMaxRpm = machine ? Number(machine.max_rpm) : 10000;

    let feed = data.feed !== undefined && data.feed !== null ? Number(data.feed) : Number(op.feed);
    if (feed <= 0) feed = 0.05;

    let rpm = 0;
    let vc = 0;

    if (data.rpm !== undefined && data.rpm !== null && Number(data.rpm) > 0) {
      rpm = Number(data.rpm);
      if (rpm > machineMaxRpm) rpm = machineMaxRpm;
      vc = Math.round(((rpm * Math.PI * diameter) / 1000) * 100) / 100;
    } else if (data.vc !== undefined && data.vc !== null && Number(data.vc) > 0) {
      vc = Number(data.vc);
      rpm = Math.round((vc * 1000) / (Math.PI * diameter));
      if (rpm > machineMaxRpm) rpm = machineMaxRpm;
    } else {
      vc = Number(op.vc) > 0 ? Number(op.vc) : 100;
      rpm = Math.round((vc * 1000) / (Math.PI * diameter));
      if (rpm > machineMaxRpm) rpm = machineMaxRpm;
    }

    if (rpm < 100) rpm = 100;

    const feedRate = rpm * feed > 0 ? rpm * feed : 50.0;
    const finishFeed = feed * 0.6;
    const finishFeedRate = rpm * finishFeed > 0 ? rpm * finishFeed : 30.0;
    const ap = 1.5;

    let cuttingTimeSec = 0;

    switch (op.calculation_type) {
      case 'FEED_TURNING': {
        let totalStockRadius = 0;
        if (stockDiameter && stockDiameter > diameter) {
          totalStockRadius = (stockDiameter - diameter) / 2;
        } else {
          totalStockRadius = Math.max(ap * 1.2, 1.0);
        }
        const finishAllowance = 0.2;
        const roughStockRadius = Math.max(0, totalStockRadius - finishAllowance);
        const roughPasses = Math.max(1, Math.ceil(roughStockRadius / ap));
        const finishPasses = 1;
        const roughTime = (length / feedRate) * 60 * roughPasses;
        const finishTime = (length / finishFeedRate) * 60 * finishPasses;
        const retractTime = (roughPasses - 1) * 0.6;
        cuttingTimeSec = (roughTime + finishTime + retractTime) * repeats;
        break;
      }
      case 'FEED_FACE': {
        const faceDiam = stockDiameter && stockDiameter > 0 ? stockDiameter : diameter;
        const faceRadius = faceDiam / 2;
        const roughFaceTime = (faceRadius / feedRate) * 60;
        const finishFaceTime = (faceRadius / finishFeedRate) * 60;
        cuttingTimeSec = roughFaceTime + finishFaceTime;
        break;
      }
      case 'FEED_DRILL':
      case 'FEED_REAMER': {
        const drillDepth = Number(op.depth) > 0 ? Number(op.depth) : length;
        cuttingTimeSec = (drillDepth / feedRate) * 60;
        break;
      }
      case 'FEED_TAP': {
        const tapPitch = feed > 0 ? feed : 1.25;
        const tapDepth = Number(op.depth) > 0 ? Number(op.depth) : length;
        cuttingTimeSec = ((tapDepth / (rpm * tapPitch)) * 60) * 2 + 1.0;
        break;
      }
      case 'THREAD': {
        const pitch = feed > 0 ? feed : 1.5;
        cuttingTimeSec = ((length / (rpm * pitch)) * 60) * 6 + 2.0;
        break;
      }
      case 'GROOVE': {
        const grooveDepth = Number(op.depth) > 0 ? Number(op.depth) : 3.0;
        cuttingTimeSec = (grooveDepth / feedRate) * 60 + 2.0;
        break;
      }
      case 'CUTOFF': {
        cuttingTimeSec = ((diameter / 2) / feedRate) * 60 + 1.0;
        break;
      }
      case 'BACK_MACHINING': {
        cuttingTimeSec = 5.0;
        break;
      }
      case 'CHAMFER': {
        cuttingTimeSec = 1.0;
        break;
      }
      default: {
        cuttingTimeSec = (length / feedRate) * 60;
        break;
      }
    }

    cuttingTimeSec = Math.round(cuttingTimeSec * 1000) / 1000;
    const nonCuttingTimeSec = Number(op.non_cutting_time_sec) > 0 ? Number(op.non_cutting_time_sec) : 2.5;
    const totalTimeSec = Math.round((cuttingTimeSec + nonCuttingTimeSec) * 1000) / 1000;

    await latheRepository.updateOperationCalculation(opId, {
      feed,
      vc,
      cuttingTimeSec,
      nonCuttingTimeSec,
      totalTimeSec,
    });

    // 最新のサイクルタイム概要を再取得して返却
    const updatedSummary = await this.getLatheCycleTime(quoteId);
    if (!updatedSummary) {
      return await this.calculateLatheCycleTime(quoteId);
    }
    return updatedSummary;
  }
}

export const latheService = new LatheService();
