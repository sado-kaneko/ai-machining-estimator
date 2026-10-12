import { pool } from './database';
import { RowDataPacket } from 'mysql2/promise';

export async function runPhase09Migration(): Promise<void> {
  const [cols] = await pool.query<RowDataPacket[]>(
    "SHOW COLUMNS FROM machine_master LIKE 'calculation_engine_type'"
  );
  if (cols.length === 0) {
    await pool.query(
      "ALTER TABLE machine_master ADD COLUMN calculation_engine_type VARCHAR(50) NOT NULL DEFAULT 'AUTOMATIC_LATHE' AFTER machine_type"
    );
    console.log('Added calculation_engine_type column to machine_master');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS quote_machine_selection (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      quote_id BIGINT UNSIGNED NOT NULL,
      machine_id BIGINT UNSIGNED NOT NULL,
      priority INT UNSIGNED NOT NULL DEFAULT 1,
      selected TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NULL,
      PRIMARY KEY (id),
      INDEX idx_qms_quote_id (quote_id),
      INDEX idx_qms_machine_id (machine_id),
      CONSTRAINT fk_qms_quote_id
        FOREIGN KEY (quote_id) REFERENCES quotes (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_qms_machine_id
        FOREIGN KEY (machine_id) REFERENCES machine_master (id)
        ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('quote_machine_selection table ready');

  // ※ NLX2500はNC自動旋盤仕様に限定するため登録を停止
  // const [nlx] = await pool.query<RowDataPacket[]>(
  //   "SELECT id FROM machine_master WHERE machine_name = 'NLX2500'"
  // );
  // if (nlx.length === 0) {
  //   await pool.query(
  //     'INSERT INTO machine_master (machine_type, calculation_engine_type, machine_name, maker, model, max_rpm) VALUES (?, ?, ?, ?, ?, ?)',
  //     ['NC_LATHE', 'NC_LATHE', 'NLX2500', 'DMG MORI', 'NLX 2500 | 700', 4000]
  //   );
  //   console.log('Seeded NLX2500 (NC_LATHE)');
  // }
}

if (require.main === module) {
  runPhase09Migration()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      pool.end();
    });
}
