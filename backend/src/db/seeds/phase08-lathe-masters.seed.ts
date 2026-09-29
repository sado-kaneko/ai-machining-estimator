import { pool } from '../../config/database';
import { RowDataPacket } from 'mysql2/promise';

export async function seedPhase08Masters(): Promise<void> {
  // 1. machine_master
  const [machines] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) as count FROM machine_master'
  );
  if (machines[0].count === 0) {
    const machineList = [
      { type: 'NC_AUTOMATIC_LATHE', name: 'Cincom L20', maker: 'CITIZEN', model: 'Cincom L20 Type VIII', maxRpm: 10000 },
      { type: 'NC_AUTOMATIC_LATHE', name: 'Cincom M16', maker: 'CITIZEN', model: 'Cincom M16 Type III', maxRpm: 12000 },
      { type: 'NC_AUTOMATIC_LATHE', name: 'Cincom M32', maker: 'CITIZEN', model: 'Cincom M32 Type VIII', maxRpm: 8000 },
    ];
    for (const m of machineList) {
      await pool.query(
        'INSERT INTO machine_master (machine_type, machine_name, maker, model, max_rpm) VALUES (?, ?, ?, ?, ?)',
        [m.type, m.name, m.maker, m.model, m.maxRpm]
      );
    }
    console.log('Seeded machine_master: 3件');
  }

  // 2. lathe_process_master
  const [processes] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) as count FROM lathe_process_master'
  );
  if (processes[0].count === 0) {
    const processList = [
      { category: 'TURNING', name: '外径加工', calcType: 'FEED_TURNING', defaultTime: 0 },
      { category: 'TURNING', name: '内径加工', calcType: 'FEED_TURNING', defaultTime: 0 },
      { category: 'TURNING', name: '端面加工', calcType: 'FEED_FACE', defaultTime: 0 },
      { category: 'DRILLING', name: '穴加工', calcType: 'FEED_DRILL', defaultTime: 0 },
      { category: 'THREADING', name: 'タップ', calcType: 'FEED_TAP', defaultTime: 0 },
      { category: 'REAMING', name: 'リーマ', calcType: 'FEED_REAMER', defaultTime: 0 },
      { category: 'GROOVING', name: '溝加工', calcType: 'GROOVE', defaultTime: 3.0 },
      { category: 'THREADING', name: 'ねじ加工', calcType: 'THREAD', defaultTime: 2.0 },
      { category: 'PARTING', name: '突切り', calcType: 'CUTOFF', defaultTime: 4.0 },
      { category: 'BACK_MACHINING', name: '背面加工', calcType: 'BACK_MACHINING', defaultTime: 5.0 },
      { category: 'MILLING', name: 'ミーリング', calcType: 'MILLING', defaultTime: 6.0 },
      { category: 'CHAMFERING', name: '面取り', calcType: 'CHAMFER', defaultTime: 2.0 },
    ];
    for (const p of processList) {
      await pool.query(
        'INSERT INTO lathe_process_master (process_category, process_name, calculation_type, default_time_sec, enabled) VALUES (?, ?, ?, ?, 1)',
        [p.category, p.name, p.calcType, p.defaultTime]
      );
    }
    console.log('Seeded lathe_process_master: 12件');
  }

  // 3. machine_time_master (非切削時間)
  const [mtimes] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) as count FROM machine_time_master'
  );
  if (mtimes[0].count === 0) {
    const timeList = [
      { type: 'NC_AUTOMATIC_LATHE', param: 'TOOL_CHANGE', time: 1.5 },
      { type: 'NC_AUTOMATIC_LATHE', param: 'IDLING', time: 2.0 },
      { type: 'NC_AUTOMATIC_LATHE', param: 'MATERIAL_FEED', time: 2.5 },
      { type: 'NC_AUTOMATIC_LATHE', param: 'BACK_MACHINING', time: 5.0 },
      { type: 'NC_AUTOMATIC_LATHE', param: 'PART_PICKUP', time: 2.0 },
    ];
    for (const t of timeList) {
      await pool.query(
        'INSERT INTO machine_time_master (machine_type, parameter_name, time_sec) VALUES (?, ?, ?)',
        [t.type, t.param, t.time]
      );
    }
    console.log('Seeded machine_time_master: 5件');
  }

  // 4. lathe_condition_master (主要材質: S45C, SUS304, SS400, A6061, DEFAULT)
  const [conditions] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) as count FROM lathe_condition_master'
  );
  if (conditions[0].count === 0) {
    const [procRows] = await pool.query<RowDataPacket[]>(
      'SELECT id, process_name FROM lathe_process_master'
    );
    const procMap = new Map<string, number>();
    procRows.forEach(r => procMap.set(r.process_name, r.id));

    const materials = [
      {
        mat: 'S45C',
        rates: [
          { proc: '外径加工', vc: 160, feed: 0.22, ap: 2.0 },
          { proc: '内径加工', vc: 140, feed: 0.16, ap: 1.5 },
          { proc: '端面加工', vc: 150, feed: 0.18, ap: 1.5 },
          { proc: '穴加工', vc: 80, feed: 0.14, ap: 0 },
          { proc: 'タップ', vc: 20, feed: 1.25, ap: 0 },
          { proc: 'リーマ', vc: 30, feed: 0.15, ap: 0 },
          { proc: '溝加工', vc: 90, feed: 0.08, ap: 2.0 },
          { proc: 'ねじ加工', vc: 100, feed: 1.5, ap: 1.0 },
          { proc: '突切り', vc: 90, feed: 0.06, ap: 2.0 },
          { proc: '背面加工', vc: 120, feed: 0.15, ap: 1.0 },
          { proc: 'ミーリング', vc: 100, feed: 0.10, ap: 1.0 },
          { proc: '面取り', vc: 120, feed: 0.10, ap: 1.0 },
        ],
      },
      {
        mat: 'SUS304',
        rates: [
          { proc: '外径加工', vc: 110, feed: 0.16, ap: 1.5 },
          { proc: '内径加工', vc: 95, feed: 0.12, ap: 1.2 },
          { proc: '端面加工', vc: 100, feed: 0.14, ap: 1.2 },
          { proc: '穴加工', vc: 50, feed: 0.10, ap: 0 },
          { proc: 'タップ', vc: 12, feed: 1.25, ap: 0 },
          { proc: 'リーマ', vc: 20, feed: 0.12, ap: 0 },
          { proc: '溝加工', vc: 60, feed: 0.05, ap: 1.5 },
          { proc: 'ねじ加工', vc: 70, feed: 1.5, ap: 0.8 },
          { proc: '突切り', vc: 60, feed: 0.04, ap: 1.5 },
          { proc: '背面加工', vc: 80, feed: 0.12, ap: 1.0 },
          { proc: 'ミーリング', vc: 70, feed: 0.08, ap: 1.0 },
          { proc: '面取り', vc: 90, feed: 0.08, ap: 1.0 },
        ],
      },
      {
        mat: 'A6061',
        rates: [
          { proc: '外径加工', vc: 320, feed: 0.28, ap: 3.0 },
          { proc: '内径加工', vc: 260, feed: 0.20, ap: 2.0 },
          { proc: '端面加工', vc: 280, feed: 0.22, ap: 2.0 },
          { proc: '穴加工', vc: 140, feed: 0.18, ap: 0 },
          { proc: 'タップ', vc: 30, feed: 1.25, ap: 0 },
          { proc: 'リーマ', vc: 50, feed: 0.20, ap: 0 },
          { proc: '溝加工', vc: 160, feed: 0.10, ap: 2.5 },
          { proc: 'ねじ加工', vc: 140, feed: 1.5, ap: 1.5 },
          { proc: '突切り', vc: 150, feed: 0.08, ap: 2.5 },
          { proc: '背面加工', vc: 200, feed: 0.20, ap: 1.5 },
          { proc: 'ミーリング', vc: 180, feed: 0.15, ap: 1.5 },
          { proc: '面取り', vc: 220, feed: 0.15, ap: 1.0 },
        ],
      },
      {
        mat: 'DEFAULT',
        rates: [
          { proc: '外径加工', vc: 130, feed: 0.18, ap: 2.0 },
          { proc: '内径加工', vc: 110, feed: 0.14, ap: 1.5 },
          { proc: '端面加工', vc: 120, feed: 0.15, ap: 1.5 },
          { proc: '穴加工', vc: 65, feed: 0.12, ap: 0 },
          { proc: 'タップ', vc: 15, feed: 1.25, ap: 0 },
          { proc: 'リーマ', vc: 25, feed: 0.12, ap: 0 },
          { proc: '溝加工', vc: 75, feed: 0.06, ap: 2.0 },
          { proc: 'ねじ加工', vc: 85, feed: 1.5, ap: 1.0 },
          { proc: '突切り', vc: 75, feed: 0.05, ap: 2.0 },
          { proc: '背面加工', vc: 100, feed: 0.14, ap: 1.0 },
          { proc: 'ミーリング', vc: 85, feed: 0.10, ap: 1.0 },
          { proc: '面取り', vc: 100, feed: 0.10, ap: 1.0 },
        ],
      },
    ];

    for (const m of materials) {
      for (const r of m.rates) {
        const pId = procMap.get(r.proc);
        if (pId) {
          await pool.query(
            'INSERT INTO lathe_condition_master (material_name, process_id, tool_type, vc, feed, ap, enabled) VALUES (?, ?, ?, ?, ?, ?, 1)',
            [m.mat, pId, 'STANDARD', r.vc, r.feed, r.ap]
          );
        }
      }
    }
    console.log('Seeded lathe_condition_master');
  }
}

if (require.main === module) {
  seedPhase08Masters()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      pool.end();
    });
}
