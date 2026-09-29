import { pool } from '../../config/database';
import { RowDataPacket } from 'mysql2/promise';

export async function seedStandardCuttingConditions(): Promise<void> {
  const [existing] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) as count FROM standard_cutting_conditions'
  );
  if (existing[0].count > 0) {
    console.log('standard_cutting_conditions already seeded:', existing[0].count);
    return;
  }

  const conditions = [
    // S45C (炭素鋼 / STEEL)
    { group: 'STEEL', name: 'S45C', type: 'FACE', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 150, feed: 0.20, ap: 2.0 },
    { group: 'STEEL', name: 'S45C', type: 'OD', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 160, feed: 0.25, ap: 2.5 },
    { group: 'STEEL', name: 'S45C', type: 'ID', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 140, feed: 0.18, ap: 1.5 },
    { group: 'STEEL', name: 'S45C', type: 'DRILL', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 80, feed: 0.15, ap: 0.0 },
    { group: 'STEEL', name: 'S45C', type: 'THREAD', mode: 'FINISH', tool: 'CNC_LATHE', vc: 100, feed: 1.50, ap: 1.0 },
    { group: 'STEEL', name: 'S45C', type: 'GROOVE', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 90, feed: 0.08, ap: 2.0 },
    { group: 'STEEL', name: 'S45C', type: 'CHAMFER', mode: 'FINISH', tool: 'CNC_LATHE', vc: 120, feed: 0.10, ap: 1.0 },

    // SUS304 (ステンレス / STAINLESS)
    { group: 'STAINLESS', name: 'SUS304', type: 'FACE', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 100, feed: 0.15, ap: 1.5 },
    { group: 'STAINLESS', name: 'SUS304', type: 'OD', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 110, feed: 0.18, ap: 2.0 },
    { group: 'STAINLESS', name: 'SUS304', type: 'ID', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 95, feed: 0.14, ap: 1.2 },
    { group: 'STAINLESS', name: 'SUS304', type: 'DRILL', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 50, feed: 0.10, ap: 0.0 },
    { group: 'STAINLESS', name: 'SUS304', type: 'THREAD', mode: 'FINISH', tool: 'CNC_LATHE', vc: 70, feed: 1.50, ap: 1.0 },
    { group: 'STAINLESS', name: 'SUS304', type: 'GROOVE', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 60, feed: 0.06, ap: 1.5 },
    { group: 'STAINLESS', name: 'SUS304', type: 'CHAMFER', mode: 'FINISH', tool: 'CNC_LATHE', vc: 90, feed: 0.08, ap: 1.0 },

    // SS400 (一般構造用鋼 / STEEL)
    { group: 'STEEL', name: 'SS400', type: 'FACE', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 150, feed: 0.20, ap: 2.0 },
    { group: 'STEEL', name: 'SS400', type: 'OD', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 160, feed: 0.25, ap: 2.5 },
    { group: 'STEEL', name: 'SS400', type: 'ID', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 140, feed: 0.18, ap: 1.5 },
    { group: 'STEEL', name: 'SS400', type: 'DRILL', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 80, feed: 0.15, ap: 0.0 },
    { group: 'STEEL', name: 'SS400', type: 'THREAD', mode: 'FINISH', tool: 'CNC_LATHE', vc: 100, feed: 1.50, ap: 1.0 },
    { group: 'STEEL', name: 'SS400', type: 'GROOVE', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 90, feed: 0.08, ap: 2.0 },
    { group: 'STEEL', name: 'SS400', type: 'CHAMFER', mode: 'FINISH', tool: 'CNC_LATHE', vc: 120, feed: 0.10, ap: 1.0 },

    // A6061 (アルミ合金 / ALUMINUM)
    { group: 'ALUMINUM', name: 'A6061', type: 'FACE', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 300, feed: 0.25, ap: 3.0 },
    { group: 'ALUMINUM', name: 'A6061', type: 'OD', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 350, feed: 0.30, ap: 3.0 },
    { group: 'ALUMINUM', name: 'A6061', type: 'ID', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 280, feed: 0.22, ap: 2.0 },
    { group: 'ALUMINUM', name: 'A6061', type: 'DRILL', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 150, feed: 0.20, ap: 0.0 },
    { group: 'ALUMINUM', name: 'A6061', type: 'THREAD', mode: 'FINISH', tool: 'CNC_LATHE', vc: 150, feed: 1.50, ap: 1.0 },
    { group: 'ALUMINUM', name: 'A6061', type: 'GROOVE', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 180, feed: 0.12, ap: 2.5 },
    { group: 'ALUMINUM', name: 'A6061', type: 'CHAMFER', mode: 'FINISH', tool: 'CNC_LATHE', vc: 250, feed: 0.15, ap: 1.0 },

    // DEFAULT / 汎用鋼
    { group: 'DEFAULT', name: 'DEFAULT', type: 'FACE', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 120, feed: 0.18, ap: 2.0 },
    { group: 'DEFAULT', name: 'DEFAULT', type: 'OD', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 140, feed: 0.20, ap: 2.0 },
    { group: 'DEFAULT', name: 'DEFAULT', type: 'ID', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 120, feed: 0.15, ap: 1.5 },
    { group: 'DEFAULT', name: 'DEFAULT', type: 'DRILL', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 70, feed: 0.12, ap: 0.0 },
    { group: 'DEFAULT', name: 'DEFAULT', type: 'THREAD', mode: 'FINISH', tool: 'CNC_LATHE', vc: 80, feed: 1.50, ap: 1.0 },
    { group: 'DEFAULT', name: 'DEFAULT', type: 'GROOVE', mode: 'ROUGH', tool: 'CNC_LATHE', vc: 80, feed: 0.07, ap: 2.0 },
    { group: 'DEFAULT', name: 'DEFAULT', type: 'CHAMFER', mode: 'FINISH', tool: 'CNC_LATHE', vc: 100, feed: 0.10, ap: 1.0 },
  ];

  for (const c of conditions) {
    await pool.query(
      `INSERT INTO standard_cutting_conditions 
       (material_group, material_name, operation_type, mode, tool_category, vc, feed_per_rev, ap, enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [c.group, c.name, c.type, c.mode, c.tool, c.vc, c.feed, c.ap]
    );
  }

  const [count] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) as count FROM standard_cutting_conditions'
  );
  console.log('Seeded standard_cutting_conditions count:', count[0].count);
}

if (require.main === module) {
  seedStandardCuttingConditions()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      pool.end();
    });
}
