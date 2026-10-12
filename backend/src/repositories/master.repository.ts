import { pool } from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import {
  MachineMasterItem,
  SaveMachineMasterRequest,
  ToolMasterItem,
  SaveToolMasterRequest,
} from '../types/master';

export class MasterRepository {
  /**
   * 加工設備マスタ一覧の取得 (全件または有効なもの)
   */
  async getAllMachines(onlyActive = false): Promise<MachineMasterItem[]> {
    const sql = `
      SELECT 
        id, machine_type, machine_name, maker, model, max_rpm,
        max_bar_diameter, guide_bush_type, bar_feeder_enabled,
        max_machining_length, has_sub_spindle, max_tools,
        special_options, calculation_engine_type, is_active,
        created_at, updated_at
      FROM machine_master
      ${onlyActive ? 'WHERE is_active = 1' : ''}
      ORDER BY id ASC
    `;
    const [rows] = await pool.query<RowDataPacket[]>(sql);
    return rows.map(r => ({
      id: r.id,
      machineType: r.machine_type,
      machineName: r.machine_name,
      maker: r.maker,
      model: r.model,
      maxRpm: Number(r.max_rpm),
      maxBarDiameter: Number(r.max_bar_diameter || 20),
      guideBushType: r.guide_bush_type || 'GUIDE_BUSH',
      barFeederEnabled: Boolean(r.bar_feeder_enabled),
      maxMachiningLength: Number(r.max_machining_length || 200),
      hasSubSpindle: Boolean(r.has_sub_spindle),
      maxTools: Number(r.max_tools || 12),
      specialOptions: r.special_options || null,
      calculationEngineType: r.calculation_engine_type || 'AUTOMATIC_LATHE',
      isActive: Boolean(r.is_active !== undefined ? r.is_active : 1),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  /**
   * 加工設備マスタの新規登録
   */
  async createMachine(req: SaveMachineMasterRequest): Promise<number> {
    const sql = `
      INSERT INTO machine_master (
        machine_type, machine_name, maker, model, max_rpm,
        max_bar_diameter, guide_bush_type, bar_feeder_enabled,
        max_machining_length, has_sub_spindle, max_tools,
        special_options, calculation_engine_type, is_active,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    const [result] = await pool.query<ResultSetHeader>(sql, [
      req.machineType,
      req.machineName,
      req.maker || null,
      req.model || null,
      req.maxRpm,
      req.maxBarDiameter,
      req.guideBushType,
      req.barFeederEnabled ? 1 : 0,
      req.maxMachiningLength,
      req.hasSubSpindle ? 1 : 0,
      req.maxTools,
      req.specialOptions || null,
      req.calculationEngineType || 'AUTOMATIC_LATHE',
      req.isActive !== false ? 1 : 0,
    ]);
    return result.insertId;
  }

  /**
   * 加工設備マスタの更新
   */
  async updateMachine(id: number, req: SaveMachineMasterRequest): Promise<boolean> {
    const sql = `
      UPDATE machine_master SET
        machine_type = ?,
        machine_name = ?,
        maker = ?,
        model = ?,
        max_rpm = ?,
        max_bar_diameter = ?,
        guide_bush_type = ?,
        bar_feeder_enabled = ?,
        max_machining_length = ?,
        has_sub_spindle = ?,
        max_tools = ?,
        special_options = ?,
        calculation_engine_type = ?,
        is_active = ?,
        updated_at = NOW()
      WHERE id = ?
    `;
    const [result] = await pool.query<ResultSetHeader>(sql, [
      req.machineType,
      req.machineName,
      req.maker || null,
      req.model || null,
      req.maxRpm,
      req.maxBarDiameter,
      req.guideBushType,
      req.barFeederEnabled ? 1 : 0,
      req.maxMachiningLength,
      req.hasSubSpindle ? 1 : 0,
      req.maxTools,
      req.specialOptions || null,
      req.calculationEngineType || 'AUTOMATIC_LATHE',
      req.isActive !== false ? 1 : 0,
      id,
    ]);
    return result.affectedRows > 0;
  }

  /**
   * 加工設備マスタの削除 (論理削除/非活性化)
   */
  async deleteMachine(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE machine_master SET is_active = 0, updated_at = NOW() WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  /**
   * 工具マスタ一覧の取得
   */
  async getAllTools(onlyActive = false): Promise<ToolMasterItem[]> {
    const sql = `
      SELECT 
        id, tool_code, tool_name, tool_category, material_compatibility,
        blade_width, nose_radius, max_depth, default_feed, default_vc,
        notes, is_active, created_at, updated_at
      FROM tool_master
      ${onlyActive ? 'WHERE is_active = 1' : ''}
      ORDER BY id ASC
    `;
    const [rows] = await pool.query<RowDataPacket[]>(sql);
    return rows.map(r => ({
      id: r.id,
      toolCode: r.tool_code,
      toolName: r.tool_name,
      toolCategory: r.tool_category,
      materialCompatibility: r.material_compatibility,
      bladeWidth: r.blade_width !== null ? Number(r.blade_width) : null,
      noseRadius: r.nose_radius !== null ? Number(r.nose_radius) : null,
      maxDepth: r.max_depth !== null ? Number(r.max_depth) : null,
      defaultFeed: r.default_feed !== null ? Number(r.default_feed) : null,
      defaultVc: r.default_vc !== null ? Number(r.default_vc) : null,
      notes: r.notes,
      isActive: Boolean(r.is_active),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  /**
   * 工具マスタの新規登録
   */
  async createTool(req: SaveToolMasterRequest): Promise<number> {
    const sql = `
      INSERT INTO tool_master (
        tool_code, tool_name, tool_category, material_compatibility,
        blade_width, nose_radius, max_depth, default_feed, default_vc,
        notes, is_active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    const [result] = await pool.query<ResultSetHeader>(sql, [
      req.toolCode,
      req.toolName,
      req.toolCategory,
      req.materialCompatibility || null,
      req.bladeWidth !== undefined ? req.bladeWidth : null,
      req.noseRadius !== undefined ? req.noseRadius : null,
      req.maxDepth !== undefined ? req.maxDepth : null,
      req.defaultFeed !== undefined ? req.defaultFeed : null,
      req.defaultVc !== undefined ? req.defaultVc : null,
      req.notes || null,
      req.isActive !== false ? 1 : 0,
    ]);
    return result.insertId;
  }

  /**
   * 工具マスタの更新
   */
  async updateTool(id: number, req: SaveToolMasterRequest): Promise<boolean> {
    const sql = `
      UPDATE tool_master SET
        tool_code = ?,
        tool_name = ?,
        tool_category = ?,
        material_compatibility = ?,
        blade_width = ?,
        nose_radius = ?,
        max_depth = ?,
        default_feed = ?,
        default_vc = ?,
        notes = ?,
        is_active = ?,
        updated_at = NOW()
      WHERE id = ?
    `;
    const [result] = await pool.query<ResultSetHeader>(sql, [
      req.toolCode,
      req.toolName,
      req.toolCategory,
      req.materialCompatibility || null,
      req.bladeWidth !== undefined ? req.bladeWidth : null,
      req.noseRadius !== undefined ? req.noseRadius : null,
      req.maxDepth !== undefined ? req.maxDepth : null,
      req.defaultFeed !== undefined ? req.defaultFeed : null,
      req.defaultVc !== undefined ? req.defaultVc : null,
      req.notes || null,
      req.isActive !== false ? 1 : 0,
      id,
    ]);
    return result.affectedRows > 0;
  }

  /**
   * 工具マスタの削除 (論理削除/非活性化)
   */
  async deleteTool(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE tool_master SET is_active = 0, updated_at = NOW() WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }
}

export const masterRepository = new MasterRepository();
