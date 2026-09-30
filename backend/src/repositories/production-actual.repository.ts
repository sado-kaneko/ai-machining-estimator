import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { pool } from '../config/database';
import { sadoaPool } from '../config/sadoa-db';
import {
  SadoaSourceRow,
  ProductionActualRecord,
  DrawingNumberMapping,
  ProductionActualFilter,
} from '../types/production-actual';

export class ProductionActualRepository {
  /**
   * sadoa DB から加工実績データを取得（参照専用）
   * @param sinceRecno 差分同期用: この recno より大きいレコードを取得 (null の場合は初回同期)
   * @param targetMachines 対象設備 (例: ['L20', 'M16', 'M32'])
   */
  async fetchFromSadoa(
    sinceRecno: number | null = null,
    targetMachines: string[] = ['L20', 'M16', 'M32']
  ): Promise<SadoaSourceRow[]> {
    // 指示書6節のベースSQL
    let sql = `
      SELECT
        t1.recno AS source_recno,
        t1.buban,
        t2.hd_hinmei,
        t3.to_ryaku,
        t1.kimei,
        t1.komei,
        t1.ins_tamei,
        t1.zai_renban,
        t1.zai_mei,
        t1.zai_kei,
        t1.zai_kosa,
        t4.first_hiduke,
        t4.last_hiduke,
        t1.cycle_time,
        t4.kakosu
      FROM sadoa.d_nkoutei t1
      LEFT JOIN sadoa.hdata t2
        ON t1.hno = t2.hd_hno
        AND t2.hd_tacd = 1
      LEFT JOIN sadoa.tokui t3
        ON t1.tcd = t3.to_tcd
      LEFT JOIN (
        SELECT
          seqno,
          MIN(hiduke) AS first_hiduke,
          MAX(hiduke) AS last_hiduke,
          SUM(ryosu) AS kakosu
        FROM sadoa.d_nkakou
        WHERE del_flg = 0
        GROUP BY seqno
      ) t4
        ON t1.recno = t4.seqno
      WHERE t1.del_flg = 0
        AND t1.ka = 1
    `;

    const params: any[] = [];

    // 差分同期条件
    if (sinceRecno !== null && sinceRecno > 0) {
      sql += ` AND t1.recno > ? `;
      params.push(sinceRecno);
    } else {
      // 初回同期: 2025年6月以降（指示書15節）
      sql += ` AND (t4.first_hiduke >= '2025-06-01' OR t1.recno >= 1) `;
    }

    // 対象機械フィルタ (L20, M16, M32 等)
    if (targetMachines.length > 0) {
      const machineConds = targetMachines.map(() => `t1.kimei LIKE ?`).join(' OR ');
      sql += ` AND (${machineConds}) `;
      targetMachines.forEach((m) => params.push(`%${m}%`));
    }

    sql += `
      GROUP BY t1.recno
      ORDER BY t1.recno ASC
    `;

    const [rows] = await sadoaPool.execute<RowDataPacket[]>(sql, params);
    return rows as SadoaSourceRow[];
  }

  /**
   * 自DBの最新 source_recno を取得（差分同期起点用）
   */
  async getMaxSourceRecno(): Promise<number | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT MAX(source_recno) AS max_recno FROM production_actual_records'
    );
    return rows[0]?.max_recno ? Number(rows[0].max_recno) : null;
  }

  /**
   * sadoaから取得した実績を自DBへ一括UPSERT保存
   */
  async upsertProductionRecord(record: {
    sourceRecno: number;
    buban: string | null;
    hinmei: string | null;
    customer: string | null;
    machineName: string | null;
    processName: string | null;
    operatorName: string | null;
    materialName: string | null;
    materialDiameter: number | null;
    materialTolerance: string | null;
    startDatetime: Date | string | null;
    endDatetime: Date | string | null;
    cycleTimeSec: number | null;
    quantity: number;
    totalTimeSec: number;
  }): Promise<void> {
    const sql = `
      INSERT INTO production_actual_records (
        source_recno,
        buban,
        hinmei,
        customer,
        machine_name,
        process_name,
        operator_name,
        material_name,
        material_diameter,
        material_tolerance,
        start_datetime,
        end_datetime,
        cycle_time_sec,
        quantity,
        total_time_sec,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        buban = VALUES(buban),
        hinmei = VALUES(hinmei),
        customer = VALUES(customer),
        machine_name = VALUES(machine_name),
        process_name = VALUES(process_name),
        operator_name = VALUES(operator_name),
        material_name = VALUES(material_name),
        material_diameter = VALUES(material_diameter),
        material_tolerance = VALUES(material_tolerance),
        start_datetime = VALUES(start_datetime),
        end_datetime = VALUES(end_datetime),
        cycle_time_sec = VALUES(cycle_time_sec),
        quantity = VALUES(quantity),
        total_time_sec = VALUES(total_time_sec),
        updated_at = NOW()
    `;

    await pool.execute(sql, [
      record.sourceRecno,
      record.buban,
      record.hinmei,
      record.customer,
      record.machineName,
      record.processName,
      record.operatorName,
      record.materialName,
      record.materialDiameter,
      record.materialTolerance,
      record.startDatetime,
      record.endDatetime,
      record.cycleTimeSec,
      record.quantity,
      record.totalTimeSec,
    ]);
  }

  /**
   * 自DBの実績レコード一覧取得
   */
  async findRecords(filter: ProductionActualFilter = {}): Promise<ProductionActualRecord[]> {
    let sql = 'SELECT * FROM production_actual_records WHERE 1=1';
    const params: any[] = [];

    if (filter.buban) {
      sql += ' AND buban LIKE ?';
      params.push(`%${filter.buban}%`);
    }

    if (filter.machineName) {
      sql += ' AND machine_name LIKE ?';
      params.push(`%${filter.machineName}%`);
    }

    sql += ' ORDER BY id DESC';

    const limit = filter.limit && filter.limit > 0 ? filter.limit : 100;
    sql += ' LIMIT ?';
    params.push(limit);

    if (filter.offset && filter.offset > 0) {
      sql += ' OFFSET ?';
      params.push(filter.offset);
    }

    const [rows] = await pool.execute<RowDataPacket[]>(sql, params);
    return rows.map((r) => this.mapRowToRecord(r));
  }

  /**
   * 図番で自DBの実績レコードを取得
   */
  async findByBuban(buban: string): Promise<ProductionActualRecord[]> {
    const sql = `
      SELECT * FROM production_actual_records
      WHERE buban = ? OR buban LIKE ?
      ORDER BY id DESC
    `;
    const [rows] = await pool.execute<RowDataPacket[]>(sql, [buban, `%${buban}%`]);
    return rows.map((r) => this.mapRowToRecord(r));
  }

  /**
   * 図番マッピングを登録または取得
   */
  async upsertDrawingMapping(buban: string, quoteId: number): Promise<void> {
    const sql = `
      INSERT INTO drawing_number_mapping (buban, quote_id, created_at)
      VALUES (?, ?, NOW())
      ON DUPLICATE KEY UPDATE created_at = created_at
    `;
    await pool.execute(sql, [buban, quoteId]);
  }

  /**
   * 案件IDに関連する図番マッピング一覧を取得
   */
  async findMappingsByQuoteId(quoteId: number): Promise<DrawingNumberMapping[]> {
    const sql = 'SELECT * FROM drawing_number_mapping WHERE quote_id = ? ORDER BY id ASC';
    const [rows] = await pool.execute<RowDataPacket[]>(sql, [quoteId]);
    return rows.map((r) => ({
      id: Number(r.id),
      buban: String(r.buban),
      quoteId: Number(r.quote_id),
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : '',
    }));
  }

  private mapRowToRecord(r: RowDataPacket): ProductionActualRecord {
    return {
      id: Number(r.id),
      sourceRecno: Number(r.source_recno),
      buban: r.buban ? String(r.buban) : null,
      hinmei: r.hinmei ? String(r.hinmei) : null,
      customer: r.customer ? String(r.customer) : null,
      machineName: r.machine_name ? String(r.machine_name) : null,
      processName: r.process_name ? String(r.process_name) : null,
      operatorName: r.operator_name ? String(r.operator_name) : null,
      materialName: r.material_name ? String(r.material_name) : null,
      materialDiameter: r.material_diameter !== null ? Number(r.material_diameter) : null,
      materialTolerance: r.material_tolerance ? String(r.material_tolerance) : null,
      startDatetime: r.start_datetime ? new Date(r.start_datetime).toISOString() : null,
      endDatetime: r.end_datetime ? new Date(r.end_datetime).toISOString() : null,
      cycleTimeSec: r.cycle_time_sec !== null ? Number(r.cycle_time_sec) : null,
      quantity: Number(r.quantity || 0),
      totalTimeSec: Number(r.total_time_sec || 0),
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : '',
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : null,
    };
  }
}

export const productionActualRepository = new ProductionActualRepository();
