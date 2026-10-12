import { pool } from './database';
import { RowDataPacket } from 'mysql2/promise';

/**
 * PHASE19 DBマイグレーション実行関数 (MySQL 5.6 互換)
 * 正面加工・背面加工、同時加工モード、材質別切削条件拡張
 */
export async function runPhase19Migration(): Promise<void> {
  console.log('[Migration] Starting PHASE19 migration...');

  // 1. lathe_process_master への machining_side カラム追加
  try {
    const [cols] = await pool.query<RowDataPacket[]>(
      "SHOW COLUMNS FROM `lathe_process_master` LIKE 'machining_side'"
    );
    if (cols.length === 0) {
      await pool.query(
        "ALTER TABLE `lathe_process_master` ADD COLUMN `machining_side` VARCHAR(20) NOT NULL DEFAULT 'FRONT' AFTER `process_category`"
      );
      console.log('[Migration] Added machining_side to lathe_process_master');
    }
  } catch (err: any) {
    console.warn('[Migration] Note on lathe_process_master machining_side:', err.message);
  }

  // 2. automatic_lathe_operations への machining_side カラム追加
  try {
    const [cols] = await pool.query<RowDataPacket[]>(
      "SHOW COLUMNS FROM `automatic_lathe_operations` LIKE 'machining_side'"
    );
    if (cols.length === 0) {
      await pool.query(
        "ALTER TABLE `automatic_lathe_operations` ADD COLUMN `machining_side` VARCHAR(20) NOT NULL DEFAULT 'FRONT' AFTER `process_id`"
      );
      console.log('[Migration] Added machining_side to automatic_lathe_operations');
    }
  } catch (err: any) {
    console.warn('[Migration] Note on automatic_lathe_operations machining_side:', err.message);
  }

  // 3. operations への machining_side カラム追加
  try {
    const [cols] = await pool.query<RowDataPacket[]>(
      "SHOW COLUMNS FROM `operations` LIKE 'machining_side'"
    );
    if (cols.length === 0) {
      await pool.query(
        "ALTER TABLE `operations` ADD COLUMN `machining_side` VARCHAR(20) NOT NULL DEFAULT 'FRONT' AFTER `operation_type`"
      );
      console.log('[Migration] Added machining_side to operations');
    }
  } catch (err: any) {
    console.warn('[Migration] Note on operations machining_side:', err.message);
  }

  // 4. quote_machine_selection への machining_mode カラム追加
  try {
    const [cols] = await pool.query<RowDataPacket[]>(
      "SHOW COLUMNS FROM `quote_machine_selection` LIKE 'machining_mode'"
    );
    if (cols.length === 0) {
      await pool.query(
        "ALTER TABLE `quote_machine_selection` ADD COLUMN `machining_mode` VARCHAR(30) NOT NULL DEFAULT 'SIMULTANEOUS' AFTER `selected`"
      );
      console.log('[Migration] Added machining_mode to quote_machine_selection');
    }
  } catch (err: any) {
    console.warn('[Migration] Note on quote_machine_selection machining_mode:', err.message);
  }

  // 5. automatic_lathe_process_master への machining_side カラム追加
  try {
    const [cols] = await pool.query<RowDataPacket[]>(
      "SHOW COLUMNS FROM `automatic_lathe_process_master` LIKE 'machining_side'"
    );
    if (cols.length === 0) {
      await pool.query(
        "ALTER TABLE `automatic_lathe_process_master` ADD COLUMN `machining_side` VARCHAR(20) NOT NULL DEFAULT 'FRONT' AFTER `calculation_type`"
      );
      console.log('[Migration] Added machining_side to automatic_lathe_process_master');
    }
  } catch (err: any) {
    console.warn('[Migration] Note on automatic_lathe_process_master machining_side:', err.message);
  }

  // 6. lathe_process_master の machining_side 既存値更新
  await pool.query("UPDATE `lathe_process_master` SET `machining_side` = 'CUTOFF' WHERE `process_name` = '突切り'");
  await pool.query("UPDATE `lathe_process_master` SET `machining_side` = 'BACK' WHERE `process_name` LIKE '%背面%'");

  // 7. lathe_process_master へ背面加工の詳細工程を追加（背面端面、背面穴、背面面取りなど）
  const backProcesses = [
    { category: 'BACK_MACHINING', name: '背面端面加工', calcType: 'FEED_FACE', side: 'BACK', defaultTime: 0 },
    { category: 'BACK_MACHINING', name: '背面穴加工', calcType: 'FEED_DRILL', side: 'BACK', defaultTime: 0 },
    { category: 'BACK_MACHINING', name: '背面面取り', calcType: 'CHAMFER', side: 'BACK', defaultTime: 2.0 },
  ];
  for (const bp of backProcesses) {
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM lathe_process_master WHERE process_name = ?',
      [bp.name]
    );
    if (existing.length === 0) {
      await pool.query(
        'INSERT INTO lathe_process_master (process_category, machining_side, process_name, calculation_type, default_time_sec, enabled) VALUES (?, ?, ?, ?, ?, 1)',
        [bp.category, bp.side, bp.name, bp.calcType, bp.defaultTime]
      );
      console.log(`[Migration] Added process master: ${bp.name}`);
    }
  }

  // 8. standard_cutting_conditions への材質別切削条件の拡充
  // S45C, SS400, SUS304, A6061, SUM24L, C3604 等
  const cuttingConditions = [
    // S45C (STEEL)
    { group: 'STEEL', name: 'S45C', type: 'CUTOFF', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 100, feed: 0.06, ap: 2.0 },
    { group: 'STEEL', name: 'S45C', type: 'BACK_FACE', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 150, feed: 0.18, ap: 2.0 },
    { group: 'STEEL', name: 'S45C', type: 'BACK', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 140, feed: 0.18, ap: 1.5 },

    // SS400 (STEEL)
    { group: 'STEEL', name: 'SS400', type: 'CUTOFF', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 100, feed: 0.06, ap: 2.0 },
    { group: 'STEEL', name: 'SS400', type: 'BACK_FACE', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 150, feed: 0.18, ap: 2.0 },
    { group: 'STEEL', name: 'SS400', type: 'BACK', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 140, feed: 0.18, ap: 1.5 },

    // SUS304 (STAINLESS)
    { group: 'STAINLESS', name: 'SUS304', type: 'CUTOFF', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 70, feed: 0.04, ap: 1.5 },
    { group: 'STAINLESS', name: 'SUS304', type: 'BACK_FACE', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 95, feed: 0.12, ap: 1.2 },
    { group: 'STAINLESS', name: 'SUS304', type: 'BACK', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 90, feed: 0.12, ap: 1.2 },

    // SUS303 (STAINLESS - 快削)
    { group: 'STAINLESS', name: 'SUS303', type: 'FACE', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 140, feed: 0.18, ap: 1.8 },
    { group: 'STAINLESS', name: 'SUS303', type: 'OD', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 150, feed: 0.20, ap: 2.0 },
    { group: 'STAINLESS', name: 'SUS303', type: 'ID', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 130, feed: 0.16, ap: 1.5 },
    { group: 'STAINLESS', name: 'SUS303', type: 'DRILL', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 70, feed: 0.12, ap: 0.0 },
    { group: 'STAINLESS', name: 'SUS303', type: 'THREAD', mode: 'FINISH', tool: 'CNC_LATHE', vc: 90, feed: 1.50, ap: 1.0 },
    { group: 'STAINLESS', name: 'SUS303', type: 'GROOVE', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 80, feed: 0.07, ap: 1.8 },
    { group: 'STAINLESS', name: 'SUS303', type: 'CHAMFER', mode: 'FINISH', tool: 'CNC_LATHE', vc: 110, feed: 0.10, ap: 1.0 },
    { group: 'STAINLESS', name: 'SUS303', type: 'CUTOFF', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 85, feed: 0.05, ap: 1.8 },
    { group: 'STAINLESS', name: 'SUS303', type: 'BACK_FACE', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 140, feed: 0.18, ap: 1.8 },
    { group: 'STAINLESS', name: 'SUS303', type: 'BACK', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 130, feed: 0.16, ap: 1.5 },

    // A6061 (ALUMINUM)
    { group: 'ALUMINUM', name: 'A6061', type: 'CUTOFF', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 200, feed: 0.08, ap: 2.5 },
    { group: 'ALUMINUM', name: 'A6061', type: 'BACK_FACE', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 300, feed: 0.22, ap: 2.5 },
    { group: 'ALUMINUM', name: 'A6061', type: 'BACK', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 280, feed: 0.22, ap: 2.0 },

    // A5052 (ALUMINUM)
    { group: 'ALUMINUM', name: 'A5052', type: 'FACE', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 280, feed: 0.22, ap: 2.5 },
    { group: 'ALUMINUM', name: 'A5052', type: 'OD', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 320, feed: 0.28, ap: 2.5 },
    { group: 'ALUMINUM', name: 'A5052', type: 'ID', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 260, feed: 0.20, ap: 1.8 },
    { group: 'ALUMINUM', name: 'A5052', type: 'DRILL', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 140, feed: 0.18, ap: 0.0 },
    { group: 'ALUMINUM', name: 'A5052', type: 'THREAD', mode: 'FINISH', tool: 'CNC_LATHE', vc: 140, feed: 1.50, ap: 1.0 },
    { group: 'ALUMINUM', name: 'A5052', type: 'GROOVE', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 160, feed: 0.10, ap: 2.0 },
    { group: 'ALUMINUM', name: 'A5052', type: 'CHAMFER', mode: 'FINISH', tool: 'CNC_LATHE', vc: 220, feed: 0.12, ap: 1.0 },
    { group: 'ALUMINUM', name: 'A5052', type: 'CUTOFF', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 180, feed: 0.08, ap: 2.0 },
    { group: 'ALUMINUM', name: 'A5052', type: 'BACK_FACE', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 280, feed: 0.22, ap: 2.5 },
    { group: 'ALUMINUM', name: 'A5052', type: 'BACK', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 260, feed: 0.20, ap: 1.8 },

    // C3604 (BRASS / 黄銅)
    { group: 'BRASS', name: 'C3604', type: 'FACE', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 220, feed: 0.22, ap: 2.5 },
    { group: 'BRASS', name: 'C3604', type: 'OD', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 250, feed: 0.25, ap: 2.5 },
    { group: 'BRASS', name: 'C3604', type: 'ID', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 200, feed: 0.18, ap: 2.0 },
    { group: 'BRASS', name: 'C3604', type: 'DRILL', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 120, feed: 0.18, ap: 0.0 },
    { group: 'BRASS', name: 'C3604', type: 'THREAD', mode: 'FINISH', tool: 'CNC_LATHE', vc: 120, feed: 1.50, ap: 1.0 },
    { group: 'BRASS', name: 'C3604', type: 'GROOVE', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 140, feed: 0.10, ap: 2.0 },
    { group: 'BRASS', name: 'C3604', type: 'CHAMFER', mode: 'FINISH', tool: 'CNC_LATHE', vc: 180, feed: 0.12, ap: 1.0 },
    { group: 'BRASS', name: 'C3604', type: 'CUTOFF', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 150, feed: 0.08, ap: 2.0 },
    { group: 'BRASS', name: 'C3604', type: 'BACK_FACE', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 220, feed: 0.22, ap: 2.5 },
    { group: 'BRASS', name: 'C3604', type: 'BACK', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 200, feed: 0.18, ap: 2.0 },

    // DEFAULT
    { group: 'DEFAULT', name: 'DEFAULT', type: 'CUTOFF', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 80, feed: 0.05, ap: 2.0 },
    { group: 'DEFAULT', name: 'DEFAULT', type: 'BACK_FACE', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 120, feed: 0.16, ap: 1.8 },
    { group: 'DEFAULT', name: 'DEFAULT', type: 'BACK', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 110, feed: 0.15, ap: 1.5 },
  ];

  for (const c of cuttingConditions) {
    const [exist] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM standard_cutting_conditions WHERE material_name = ? AND operation_type = ? LIMIT 1',
      [c.name, c.type]
    );
    if (exist.length === 0) {
      await pool.query(
        `INSERT INTO standard_cutting_conditions 
         (material_group, material_name, operation_type, mode, tool_category, vc, feed_per_rev, ap, enabled)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [c.group, c.name, c.type, c.mode, c.tool, c.vc, c.feed, c.ap]
      );
    }
  }

  // 9. lathe_condition_master への背面加工・各材質条件の追加
  const [procRows] = await pool.query<RowDataPacket[]>('SELECT id, process_name FROM lathe_process_master');
  const procMap = new Map<string, number>();
  procRows.forEach(r => procMap.set(r.process_name, r.id));

  const latheConds = [
    // S45C
    { mat: 'S45C', proc: '背面端面加工', vc: 150, feed: 0.18, ap: 1.5 },
    { mat: 'S45C', proc: '背面穴加工', vc: 80, feed: 0.14, ap: 0 },
    { mat: 'S45C', proc: '背面面取り', vc: 120, feed: 0.10, ap: 1.0 },

    // SS400
    { mat: 'SS400', proc: '背面端面加工', vc: 150, feed: 0.18, ap: 1.5 },
    { mat: 'SS400', proc: '背面穴加工', vc: 80, feed: 0.14, ap: 0 },
    { mat: 'SS400', proc: '背面面取り', vc: 120, feed: 0.10, ap: 1.0 },

    // SUS304
    { mat: 'SUS304', proc: '背面端面加工', vc: 100, feed: 0.14, ap: 1.2 },
    { mat: 'SUS304', proc: '背面穴加工', vc: 50, feed: 0.10, ap: 0 },
    { mat: 'SUS304', proc: '背面面取り', vc: 90, feed: 0.08, ap: 1.0 },

    // A6061
    { mat: 'A6061', proc: '背面端面加工', vc: 280, feed: 0.22, ap: 2.0 },
    { mat: 'A6061', proc: '背面穴加工', vc: 140, feed: 0.18, ap: 0 },
    { mat: 'A6061', proc: '背面面取り', vc: 220, feed: 0.15, ap: 1.0 },

    // DEFAULT
    { mat: 'DEFAULT', proc: '背面端面加工', vc: 120, feed: 0.16, ap: 1.5 },
    { mat: 'DEFAULT', proc: '背面穴加工', vc: 70, feed: 0.12, ap: 0 },
    { mat: 'DEFAULT', proc: '背面面取り', vc: 100, feed: 0.10, ap: 1.0 },
  ];

  for (const lc of latheConds) {
    const processId = procMap.get(lc.proc);
    if (processId) {
      const [exist] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM lathe_condition_master WHERE material_name = ? AND process_id = ? LIMIT 1',
        [lc.mat, processId]
      );
      if (exist.length === 0) {
        await pool.query(
          `INSERT INTO lathe_condition_master (material_name, process_id, tool_type, vc, feed, ap, enabled)
           VALUES (?, ?, 'CARBIDE', ?, ?, ?, 1)`,
          [lc.mat, processId, lc.vc, lc.feed, lc.ap]
        );
      }
    }
  }

  console.log('[Migration] PHASE19 migration completed successfully.');
}

if (require.main === module) {
  runPhase19Migration()
    .then(() => {
      console.log('Migration process exited cleanly.');
      pool.end();
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      pool.end();
      process.exit(1);
    });
}
