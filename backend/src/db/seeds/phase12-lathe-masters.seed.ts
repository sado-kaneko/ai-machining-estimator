import { RowDataPacket } from 'mysql2/promise';
import { pool } from '../../config/database';

export async function seedPhase12Masters(): Promise<void> {
  // 1. automatic_lathe_process_master
  const [procRows] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) as count FROM automatic_lathe_process_master'
  );
  if (procRows[0].count === 0) {
    const list = [
      { featureType: 'FACE', name: '端面加工', calcType: 'FEED_FACE', seq: 10, desc: '素材端面の基準面切削' },
      { featureType: 'OD', name: '外径加工', calcType: 'FEED_TURNING', seq: 20, desc: '外径前挽き・仕上げ旋削' },
      { featureType: 'DRILL', name: '穴加工', calcType: 'FEED_DRILL', seq: 30, desc: 'センタ穴・ドリル下穴加工' },
      { featureType: 'BORE', name: '内径加工', calcType: 'FEED_TURNING', seq: 40, desc: 'ボーリングバーによる内径旋削' },
      { featureType: 'ID', name: '内径加工', calcType: 'FEED_TURNING', seq: 40, desc: '荒内径旋削' },
      { featureType: 'GROOVE', name: '溝加工', calcType: 'GROOVE', seq: 50, desc: '外径・内径溝入れ加工' },
      { featureType: 'THREAD', name: 'ねじ加工', calcType: 'THREAD', seq: 60, desc: 'おねじ・めねじチェーシング' },
      { featureType: 'CHAMFER', name: '面取り', calcType: 'CHAMFER', seq: 70, desc: '端面・角部C面/R面取り' },
      { featureType: 'CUTOFF', name: '突切り', calcType: 'CUTOFF', seq: 80, desc: '完成品切り落とし' },
      { featureType: 'BACK', name: '背面加工', calcType: 'BACK_MACHINING', seq: 90, desc: 'サブスピンドル受渡し背面切削' },
    ];
    for (const item of list) {
      await pool.query(
        `INSERT INTO automatic_lathe_process_master 
         (feature_type, process_name, calculation_type, sequence_rule, machine_type, description, enabled) 
         VALUES (?, ?, ?, ?, 'NC_AUTOMATIC_LATHE', ?, 1)`,
        [item.featureType, item.name, item.calcType, item.seq, item.desc]
      );
    }
    console.log('Seeded automatic_lathe_process_master:', list.length, '件');
  }

  // 2. automatic_lathe_time_master
  const [timeRows] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) as count FROM automatic_lathe_time_master'
  );
  if (timeRows[0].count === 0) {
    await pool.query(
      `INSERT INTO automatic_lathe_time_master 
       (machine_type, material_feed_time_sec, tool_change_time_sec, pickup_time_sec, idle_time_sec, spindle_acc_dec_time_sec, description)
       VALUES ('NC_AUTOMATIC_LATHE', 2.500, 1.500, 2.000, 2.000, 1.000, 'NC自動旋盤標準非切削動作基準時間')`
    );
    console.log('Seeded automatic_lathe_time_master: 1件');
  }
}
