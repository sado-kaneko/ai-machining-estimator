import { pool } from '../config/database';
import { RowDataPacket } from 'mysql2';
import { quoteRepository } from '../repositories/quote.repository';
import { quoteResultRepository } from './../repositories/quote-result.repository';
import { quoteHistoryRepository } from '../repositories/quote-history.repository';
import { cycleTimeRepository } from '../repositories/cycle-time.repository';
import { materialRepository } from '../repositories/material.repository';
import { latheRepository } from '../repositories/lathe.repository';
import {
  CompleteQuoteInput,
  QuoteBasisDto,
  QuoteHistoryDto,
  QuoteResultDto,
  QuoteStatus,
  SimilarQuoteItemDto,
  SimilarQuoteQuery,
} from '../types/quote-management';

export class QuoteManagementService {
  /**
   * 見積確定保存 (POST /api/quotes/:id/complete)
   */
  async completeQuote(quoteId: number, input: Partial<CompleteQuoteInput>, operatorName: string = '見積担当者'): Promise<QuoteResultDto> {
    const quote = await quoteRepository.findById(quoteId);
    if (!quote) {
      throw new Error('QUOTE_NOT_FOUND');
    }

    const previousStatus = quote.status;
    const latestCt = await cycleTimeRepository.findByQuoteId(quoteId);
    const selectedMachine = await latheRepository.getQuoteSelectedMachine(quoteId);

    const cycleTime = input.cycleTime ?? (latestCt ? Number(latestCt.theoretical_cycle_time) : 0);
    const finalTime = input.finalTime ?? (latestCt ? Number(latestCt.corrected_cycle_time) : 0);
    const correctionFactor = input.correctionFactor ?? (latestCt ? Number(latestCt.correction_factor) : 1.0);
    const quantity = input.quantity ?? quote.quantity ?? 1;
    const totalLotTime = input.totalLotTime ?? Math.round(finalTime * quantity * 1000) / 1000;
    const machine = input.machine || selectedMachine?.machine_name || 'Cincom L20';

    const completeData: CompleteQuoteInput = {
      quoteId,
      cycleTime,
      machine,
      correctionFactor,
      finalTime,
      quantity,
      totalLotTime,
      cuttingTime: input.cuttingTime ?? (latestCt ? Number(latestCt.cutting_time_sec) : undefined),
      nonCuttingTime: input.nonCuttingTime ?? (latestCt ? Number(latestCt.non_cutting_time_sec) : undefined),
      correctionSource: input.correctionSource ?? latestCt?.correction_source ?? undefined,
      confidenceLevel: input.confidenceLevel ?? undefined,
      notes: input.notes ?? quote.notes ?? undefined,
      completedBy: operatorName,
    };

    // 1. quote_results へ保存
    const savedResult = await quoteResultRepository.saveOrUpdate(completeData);

    // 2. quotes ステータスを COMPLETED に更新
    await pool.query('UPDATE quotes SET status = ?, updated_at = NOW() WHERE id = ?', ['COMPLETED', quoteId]);

    // 3. 履歴に記録
    await quoteHistoryRepository.recordHistory(
      quoteId,
      'COMPLETE_QUOTE',
      { status: previousStatus },
      { status: 'COMPLETED', result: savedResult },
      operatorName
    );

    return savedResult;
  }

  /**
   * 見積ステータス更新
   */
  async updateStatus(quoteId: number, status: QuoteStatus, operatorName: string = '担当者'): Promise<void> {
    const quote = await quoteRepository.findById(quoteId);
    if (!quote) throw new Error('QUOTE_NOT_FOUND');

    const prevStatus = quote.status;
    await pool.query('UPDATE quotes SET status = ?, updated_at = NOW() WHERE id = ?', [status, quoteId]);

    await quoteHistoryRepository.recordHistory(
      quoteId,
      'STATUS_CHANGE',
      { status: prevStatus },
      { status },
      operatorName
    );
  }

  /**
   * 見積根拠データ取得 (社内帳票・PDF出力用)
   */
  async getQuoteBasis(quoteId: number): Promise<QuoteBasisDto> {
    const quote = await quoteRepository.findById(quoteId);
    if (!quote) throw new Error('QUOTE_NOT_FOUND');

    const materialInfo = await materialRepository.findByQuoteId(quoteId);
    const selectedMachine = await latheRepository.getQuoteSelectedMachine(quoteId);
    const latestCt = await cycleTimeRepository.findByQuoteId(quoteId);
    const operations = await latheRepository.findOperationsByQuoteId(quoteId);
    const completedResult = await quoteResultRepository.findByQuoteId(quoteId);

    const theoreticalCycleTimeSec = latestCt ? Number(latestCt.theoretical_cycle_time) : 0;
    const correctionFactor = latestCt ? Number(latestCt.correction_factor) : 1.0;
    const correctedCycleTimeSec = latestCt ? Number(latestCt.corrected_cycle_time) : 0;
    const cuttingTimeSec = latestCt ? Number(latestCt.cutting_time_sec) : 0;
    const nonCuttingTimeSec = latestCt ? Number(latestCt.non_cutting_time_sec) : 0;
    const totalLotTimeSec = latestCt ? Number(latestCt.total_lot_time_sec) : 0;

    return {
      quote: {
        id: Number(quote.id),
        quoteNo: quote.quote_no || null,
        customerName: quote.customer_name,
        partNo: quote.part_no,
        partName: quote.part_name,
        quantity: quote.quantity,
        material: quote.material || materialInfo?.material_name || null,
        status: quote.status,
        createdBy: quote.created_by || '見積担当者',
        createdAt: quote.created_at ? quote.created_at.toISOString() : new Date().toISOString(),
      },
      materialInfo: materialInfo
        ? {
            shapeType: materialInfo.shape_type,
            diameter: materialInfo.diameter ? Number(materialInfo.diameter) : null,
            length: materialInfo.length ? Number(materialInfo.length) : null,
          }
        : null,
      machine: selectedMachine
        ? {
            name: selectedMachine.machine_name,
            type: selectedMachine.machine_type,
            maxRpm: Number(selectedMachine.max_rpm),
          }
        : {
            name: 'Citizen Cincom L20',
            type: 'NC_AUTOMATIC_LATHE',
            maxRpm: 10000,
          },
      timeSummary: {
        theoreticalCycleTimeSec,
        correctionFactor,
        correctedCycleTimeSec,
        cuttingTimeSec,
        nonCuttingTimeSec,
        totalLotTimeSec,
      },
      correctionInfo: {
        source: latestCt?.correction_source || null,
        confidence: latestCt?.correction_applied ? 'HIGH' : null,
        reason: latestCt?.correction_applied ? '承認済みの実績データに基づく補正' : '標準理論値適用',
        applied: latestCt ? Boolean(latestCt.correction_applied) : false,
      },
      operations: operations.map((op) => ({
        sequenceNo: op.sequence_no,
        processName: op.process_name || '加工工程',
        diameter: Number(op.diameter),
        length: Number(op.machining_length),
        cuttingSpeed: Number(op.vc),
        feedRate: Number(op.feed),
        rpm: Number(op.vc) > 0 && Number(op.diameter) > 0 ? Math.round((Number(op.vc) * 1000) / (Math.PI * Number(op.diameter))) : 0,
        cuttingTimeSec: Number(op.cutting_time_sec),
        nonCuttingTimeSec: Number(op.non_cutting_time_sec),
        totalTimeSec: Number(op.total_time_sec),
      })),
      completedResult,
    };
  }

  /**
   * 類似案件検索 (GET /api/quotes/search/similar)
   * 図番、材料、径、設備から類似する過去案件を探索
   */
  async searchSimilarQuotes(query: SimilarQuoteQuery): Promise<SimilarQuoteItemDto[]> {
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let similarityReason = '過去の見積・計算済み案件';

    if (query.partNo) {
      // 図番の前方一致または部分一致
      const prefix = query.partNo.substring(0, 4);
      conditions.push('(q.part_no LIKE ? OR q.part_name LIKE ?)');
      params.push(`%${prefix}%`, `%${prefix}%`);
      similarityReason = `図番類似 (${prefix})`;
    }

    if (query.material) {
      conditions.push('(q.material = ? OR m.material_name = ?)');
      params.push(query.material, query.material);
      similarityReason += ` / 同質材 (${query.material})`;
    }

    if (query.diameter && query.diameter > 0) {
      // 径の ±20% 範囲
      const minD = query.diameter * 0.8;
      const maxD = query.diameter * 1.2;
      conditions.push('m.diameter BETWEEN ? AND ?');
      params.push(minD, maxD);
      similarityReason += ` / 類似径 (φ${Math.round(minD)}-φ${Math.round(maxD)})`;
    }

    const limit = query.limit || 10;
    params.push(limit);

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT q.id, q.quote_no, q.customer_name, q.part_no, q.part_name, q.quantity,
              COALESCE(q.material, m.material_name) AS resolved_material,
              q.status, q.created_at,
              COALESCE(qr.machine, mac.machine_name) AS machine_name,
              COALESCE(qr.final_time, ctr.corrected_cycle_time) AS cycle_time_sec,
              COALESCE(qr.total_lot_time, ctr.total_lot_time_sec) AS total_lot_time_sec,
              COALESCE(qr.correction_factor, ctr.correction_factor) AS correction_factor
       FROM quotes q
       LEFT JOIN material_information m ON m.quote_id = q.id
       LEFT JOIN quote_results qr ON qr.quote_id = q.id
       LEFT JOIN cycle_time_results ctr ON ctr.quote_id = q.id
       LEFT JOIN quote_machine_selection qms ON qms.quote_id = q.id AND qms.selected = 1
       LEFT JOIN machine_master mac ON mac.id = qms.machine_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY q.id DESC
       LIMIT ?`,
      params
    );

    return rows.map((r) => ({
      id: Number(r.id),
      quoteNo: r.quote_no || null,
      customerName: String(r.customer_name),
      partNo: String(r.part_no),
      partName: String(r.part_name),
      quantity: Number(r.quantity),
      material: r.resolved_material ? String(r.resolved_material) : null,
      status: String(r.status),
      machineName: r.machine_name ? String(r.machine_name) : null,
      cycleTimeSec: r.cycle_time_sec !== null ? Number(r.cycle_time_sec) : null,
      totalLotTimeSec: r.total_lot_time_sec !== null ? Number(r.total_lot_time_sec) : null,
      correctionFactor: r.correction_factor !== null ? Number(r.correction_factor) : null,
      similarityReason,
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    }));
  }

  /**
   * 履歴取得
   */
  async getHistory(quoteId: number): Promise<QuoteHistoryDto[]> {
    return await quoteHistoryRepository.findByQuoteId(quoteId);
  }

  /**
   * 見積確定結果取得
   */
  async getResult(quoteId: number): Promise<QuoteResultDto | null> {
    return await quoteResultRepository.findByQuoteId(quoteId);
  }

  /**
   * PDF/印刷用HTMLドキュメント生成 (サーバー側レンダリング)
   */
  generatePdfHtml(basis: QuoteBasisDto): string {
    const q = basis.quote;
    const time = basis.timeSummary;
    const corr = basis.correctionInfo;
    const mat = basis.materialInfo;
    const ops = basis.operations;

    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>見積根拠資料 - ${q.partNo} (${q.customerName})</title>
  <style>
    body { font-family: "Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif; color: #2d3748; margin: 20px; font-size: 13px; line-height: 1.5; }
    .header { border-bottom: 2px solid #2b6cb0; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 22px; font-weight: bold; color: #2b6cb0; margin: 0; }
    .doc-meta { font-size: 11px; color: #718096; text-align: right; }
    .section-title { font-size: 14px; font-weight: bold; margin-top: 20px; margin-bottom: 8px; border-left: 4px solid #3182ce; padding-left: 8px; color: #2d3748; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    th, td { border: 1px solid #cbd5e0; padding: 6px 10px; }
    th { background: #edf2f7; font-weight: bold; text-align: left; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .kpi-container { display: flex; gap: 15px; margin-bottom: 15px; }
    .kpi-box { flex: 1; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; background: #f7fafc; }
    .kpi-box.main { border-color: #3182ce; background: #ebf8ff; }
    .kpi-title { font-size: 11px; color: #4a5568; font-weight: bold; }
    .kpi-value { font-size: 20px; font-weight: bold; color: #2d3748; margin-top: 4px; }
    .kpi-value.highlight { color: #2b6cb0; font-size: 24px; }
    .kpi-sub { font-size: 11px; color: #718096; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; background: #e2e8f0; }
    .badge-success { background: #c6f6d5; color: #22543d; }
    .badge-info { background: #bee3f8; color: #2b6cb0; }
    .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 10px; color: #a0aec0; text-align: center; }
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="title">AI切削加工サイクルタイム見積根拠書</h1>
      <div style="font-size: 12px; color: #4a5568; margin-top: 4px;">案件ID: #${q.id} / 見積番号: ${q.quoteNo || '未採番'}</div>
    </div>
    <div class="doc-meta">
      <div>作成日時: ${new Date(q.createdAt).toLocaleDateString('ja-JP')}</div>
      <div>出力者: ${q.createdBy || '見積担当者'}</div>
      <div>ステータス: <span class="badge badge-info">${q.status}</span></div>
    </div>
  </div>

  <div class="section-title">1. 基本案件情報</div>
  <table>
    <tr>
      <th style="width: 15%;">顧客名</th>
      <td style="width: 35%;">${q.customerName}</td>
      <th style="width: 15%;">図番</th>
      <td style="width: 35%; font-weight: bold;">${q.partNo}</td>
    </tr>
    <tr>
      <th>品名</th>
      <td>${q.partName || '-'}</td>
      <th>数量 (ロット)</th>
      <td style="font-weight: bold;">${q.quantity} 個</td>
    </tr>
    <tr>
      <th>材質</th>
      <td>${q.material || 'S45C'}</td>
      <th>素材寸法</th>
      <td>${mat?.diameter ? 'φ' + mat.diameter + ' mm' : '仕上径より補完'}${mat?.length ? ' × L' + mat.length + ' mm' : ''}</td>
    </tr>
    <tr>
      <th>選定設備</th>
      <td><strong>${basis.machine?.name || 'Citizen Cincom L20'}</strong></td>
      <th>設備最高回転数</th>
      <td>${basis.machine?.maxRpm ? basis.machine.maxRpm + ' rpm' : '-'}</td>
    </tr>
  </table>

  <div class="section-title">2. サイクルタイム見積・実績補正集計</div>
  <div class="kpi-container">
    <div class="kpi-box">
      <div class="kpi-title">① 理論サイクルタイム (計算値)</div>
      <div class="kpi-value">${time.theoreticalCycleTimeSec} <span style="font-size: 13px;">秒</span></div>
      <div class="kpi-sub">切削: ${time.cuttingTimeSec}秒 / 非切削: ${time.nonCuttingTimeSec}秒</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-title">② 実績フィードバック補正係数</div>
      <div class="kpi-value">&times;${time.correctionFactor}</div>
      <div class="kpi-sub">${corr.applied ? '<span class="badge badge-success">実績補正適用</span> ' + (corr.source || '') : '理論値適用'}</div>
    </div>
    <div class="kpi-box main">
      <div class="kpi-title">③ 最終予測サイクルタイム</div>
      <div class="kpi-value highlight">${time.correctedCycleTimeSec} <span style="font-size: 14px;">秒 / 個</span></div>
      <div class="kpi-sub">ロット総加工時間: <strong>${time.totalLotTimeSec} 秒</strong> (約 ${(time.totalLotTimeSec / 60).toFixed(1)}分)</div>
    </div>
  </div>

  <div class="section-title">3. 加工工程明細 (Calculation Engine算出根拠)</div>
  <table>
    <thead>
      <tr>
        <th style="width: 40px;" class="text-center">No</th>
        <th>工程名</th>
        <th style="width: 75px;" class="text-right">加工径 (mm)</th>
        <th style="width: 75px;" class="text-right">加工長 (mm)</th>
        <th style="width: 75px;" class="text-right">切削速度 (Vc)</th>
        <th style="width: 75px;" class="text-right">送り (F)</th>
        <th style="width: 75px;" class="text-right">回転数 (N)</th>
        <th style="width: 80px;" class="text-right">切削時間</th>
        <th style="width: 80px;" class="text-right">非切削時間</th>
        <th style="width: 85px;" class="text-right">工程合計</th>
      </tr>
    </thead>
    <tbody>
      ${ops.length > 0 ? ops.map(op => `
        <tr>
          <td class="text-center font-bold">${op.sequenceNo}</td>
          <td>${op.processName}</td>
          <td class="text-right">${op.diameter || '-'}</td>
          <td class="text-right">${op.length || '-'}</td>
          <td class="text-right">${op.cuttingSpeed || '-'}</td>
          <td class="text-right">${op.feedRate || '-'}</td>
          <td class="text-right">${op.rpm || '-'}</td>
          <td class="text-right">${op.cuttingTimeSec} 秒</td>
          <td class="text-right">${op.nonCuttingTimeSec} 秒</td>
          <td class="text-right" style="font-weight: bold;">${op.totalTimeSec} 秒</td>
        </tr>
      `).join('') : '<tr><td colspan="10" class="text-center">工程データがありません</td></tr>'}
    </tbody>
  </table>

  <div class="footer">
    本資料は AI 切削加工見積支援システム（ai-machining-estimator）により自動算出された根拠資料です。
  </div>
</body>
</html>`;
  }
}

export const quoteManagementService = new QuoteManagementService();
