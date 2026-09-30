import { pool } from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { CompleteQuoteInput, QuoteResultDto } from '../types/quote-management';

export class QuoteResultRepository {
  /**
   * 見積確定結果の作成または更新
   */
  async saveOrUpdate(input: CompleteQuoteInput): Promise<QuoteResultDto> {
    await pool.query<ResultSetHeader>(
      `INSERT INTO quote_results 
       (quote_id, cycle_time, machine, correction_factor, final_time, quantity, total_lot_time,
        cutting_time, non_cutting_time, correction_source, confidence_level, notes, completed_by, completed_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         cycle_time = VALUES(cycle_time),
         machine = VALUES(machine),
         correction_factor = VALUES(correction_factor),
         final_time = VALUES(final_time),
         quantity = VALUES(quantity),
         total_lot_time = VALUES(total_lot_time),
         cutting_time = VALUES(cutting_time),
         non_cutting_time = VALUES(non_cutting_time),
         correction_source = VALUES(correction_source),
         confidence_level = VALUES(confidence_level),
         notes = VALUES(notes),
         completed_by = VALUES(completed_by),
         updated_at = NOW()`,
      [
        input.quoteId,
        input.cycleTime,
        input.machine,
        input.correctionFactor,
        input.finalTime,
        input.quantity,
        input.totalLotTime,
        input.cuttingTime ?? null,
        input.nonCuttingTime ?? null,
        input.correctionSource ?? null,
        input.confidenceLevel ?? null,
        input.notes ?? null,
        input.completedBy || '見積担当者',
      ]
    );

    const result = await this.findByQuoteId(input.quoteId);
    if (!result) {
      throw new Error('FAILED_TO_SAVE_QUOTE_RESULT');
    }
    return result;
  }

  /**
   * 見積確定結果の取得
   */
  async findByQuoteId(quoteId: number): Promise<QuoteResultDto | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM quote_results WHERE quote_id = ?`,
      [quoteId]
    );

    if (rows.length === 0) return null;

    const r = rows[0];
    return {
      id: Number(r.id),
      quoteId: Number(r.quote_id),
      cycleTime: Number(r.cycle_time),
      machine: String(r.machine),
      correctionFactor: Number(r.correction_factor),
      finalTime: Number(r.final_time),
      quantity: Number(r.quantity),
      totalLotTime: Number(r.total_lot_time),
      cuttingTime: r.cutting_time !== null ? Number(r.cutting_time) : null,
      nonCuttingTime: r.non_cutting_time !== null ? Number(r.non_cutting_time) : null,
      correctionSource: r.correction_source ? String(r.correction_source) : null,
      confidenceLevel: r.confidence_level ? String(r.confidence_level) : null,
      notes: r.notes ? String(r.notes) : null,
      completedBy: String(r.completed_by),
      completedAt: r.completed_at instanceof Date ? r.completed_at.toISOString() : String(r.completed_at),
    };
  }
}

export const quoteResultRepository = new QuoteResultRepository();
