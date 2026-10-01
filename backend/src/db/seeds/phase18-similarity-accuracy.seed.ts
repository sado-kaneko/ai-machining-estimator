import { pool } from '../../config/database';
import { RowDataPacket } from 'mysql2/promise';

/**
 * PHASE18 類似加工検索および予測精度分析の検証用シードデータ投入スクリプト
 */
export async function seedPhase18Data(): Promise<void> {
  const [qCount] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM quotes');
  console.log(`Current quote count: ${qCount[0].count}`);

  if (Number(qCount[0].count) < 5) {
    console.log('Seeding sample quote cases for similarity search and accuracy analysis...');

    const sampleQuotes = [
      {
        quoteNo: 'EST-2026-0001',
        customerName: '株式会社ホムズ技研',
        partNo: 'H116-A900040',
        partName: 'IPTネイル：ディスタルスクリュー',
        material: 'SUS304',
        diameter: 8.0,
        machine: 'Citizen Cincom M16',
        machineId: 2,
        theoreticalCt: 1320.0,
        factor: 1.025,
        finalCt: 1353.0,
        actualCt: 1351.0,
        features: ['OD', 'DRILL', 'THREAD', 'CUTOFF'],
        date: '2026-06-15 10:00:00',
      },
      {
        quoteNo: 'EST-2026-0002',
        customerName: 'FFHCM花巻株式会社',
        partNo: '319F4588B',
        partName: '段付きピン軸 (ブランク)',
        material: 'SUS303',
        diameter: 5.0,
        machine: 'Citizen Cincom M16',
        machineId: 2,
        theoreticalCt: 32.5,
        factor: 1.000,
        finalCt: 32.5,
        actualCt: 33.8,
        features: ['OD', 'CHAMFER', 'CUTOFF'],
        date: '2026-07-20 14:00:00',
      },
      {
        quoteNo: 'EST-2026-0003',
        customerName: 'スライドウェイ精密',
        partNo: 'K212-4303-05_NV3175',
        partName: 'NV3 MIM用軌道台サポート',
        material: 'SUJ2',
        diameter: 12.0,
        machine: 'Citizen Cincom L20',
        machineId: 1,
        theoreticalCt: 360.0,
        factor: 1.040,
        finalCt: 374.4,
        actualCt: 373.0,
        features: ['OD', 'ID', 'GROOVE', 'CHAMFER', 'CUTOFF'],
        date: '2026-08-10 11:30:00',
      },
      {
        quoteNo: 'EST-2026-0004',
        customerName: 'カネコシステムクリエイト',
        partNo: 'KSC-526116',
        partName: 'カラーシャフト (S45C同等品)',
        material: 'S45C',
        diameter: 5.2,
        machine: 'Citizen Cincom L20',
        machineId: 1,
        theoreticalCt: 23.0,
        factor: 1.050,
        finalCt: 24.15,
        actualCt: 24.5,
        features: ['OD', 'ID', 'GROOVE', 'CHAMFER'],
        date: '2026-09-05 09:15:00',
      },
      {
        quoteNo: 'EST-2026-0005',
        customerName: 'メディカルデバイス工研',
        partNo: 'MD-8820-T',
        partName: 'チタンインプラントコア',
        material: 'SUS304',
        diameter: 10.0,
        machine: 'Citizen Cincom L20',
        machineId: 1,
        theoreticalCt: 82.0,
        factor: 1.035,
        finalCt: 84.87,
        actualCt: 85.5,
        features: ['OD', 'DRILL', 'THREAD', 'GROOVE', 'CUTOFF'],
        date: '2026-09-18 16:40:00',
      },
      {
        quoteNo: 'EST-2026-0006',
        customerName: '三葉精機株式会社',
        partNo: 'MB-P-302',
        partName: '高精度ピボットピン',
        material: 'SUS304',
        diameter: 6.0,
        machine: 'Citizen Cincom L20',
        machineId: 1,
        theoreticalCt: 45.0,
        factor: 1.030,
        finalCt: 46.35,
        actualCt: 47.1,
        features: ['OD', 'CHAMFER', 'CUTOFF'],
        date: '2026-09-25 13:00:00',
      },
      {
        quoteNo: 'EST-2026-0007',
        customerName: '大東メカトロニクス',
        partNo: 'DT-FLG-25',
        partName: 'ガイドフランジ',
        material: 'S45C',
        diameter: 25.0,
        machine: 'Citizen Cincom M32',
        machineId: 3,
        theoreticalCt: 110.0,
        factor: 1.060,
        finalCt: 116.6,
        actualCt: 118.0,
        features: ['OD', 'ID', 'DRILL', 'GROOVE', 'CHAMFER', 'CUTOFF'],
        date: '2026-10-01 10:20:00',
      },
    ];

    for (const sq of sampleQuotes) {
      // 1. quotes
      const [qRes] = await pool.query<any>(
        `INSERT INTO quotes (quote_no, customer_name, part_no, part_name, quantity, material, status, created_at)
         VALUES (?, ?, ?, ?, 100, ?, 'COMPLETED', ?)`,
        [sq.quoteNo, sq.customerName, sq.partNo, sq.partName, sq.material, sq.date]
      );
      const newQuoteId = qRes.insertId;

      // 2. drawings
      const [dRes] = await pool.query<any>(
        `INSERT INTO drawings (quote_id, original_name, stored_name, mime_type, file_size, file_path, sha256, created_at)
         VALUES (?, ?, ?, 'application/pdf', 102400, ?, ?, ?)`,
        [newQuoteId, `${sq.partNo}.pdf`, `${newQuoteId}_${sq.partNo}.pdf`, `uploads/${sq.partNo}.pdf`, `sha_${newQuoteId}`, sq.date]
      );
      const newDrawingId = dRes.insertId;

      // 3. drawing_analyses
      const [daRes] = await pool.query<any>(
        `INSERT INTO drawing_analyses (drawing_id, model_name, prompt_version, analysis_status, part_type, material, stock_diameter, overall_length, created_at)
         VALUES (?, 'gpt-4o', 'v2.0', 'COMPLETED', 'ROTATIONAL', ?, ?, 35.0, ?)`,
        [newDrawingId, sq.material, sq.diameter, sq.date]
      );
      const newAnalysisId = daRes.insertId;

      // 4. features
      for (let i = 0; i < sq.features.length; i++) {
        const ft = sq.features[i];
        await pool.query(
          `INSERT INTO features (analysis_id, sequence_no, feature_type, description, diameter, length, created_at)
           VALUES (?, ?, ?, ?, ?, 5.0, ?)`,
          [newAnalysisId, i + 1, ft, `${ft}加工`, sq.diameter, sq.date]
        );
      }

      // 5. material_information
      await pool.query(
        `INSERT INTO material_information (quote_id, material_name, shape_type, diameter, length, created_at)
         VALUES (?, ?, 'ROUND_BAR', ?, 2500.0, ?)`,
        [newQuoteId, sq.material, sq.diameter, sq.date]
      );

      // 6. quote_machine_selection
      await pool.query(
        `INSERT INTO quote_machine_selection (quote_id, machine_id, priority, selected, created_at)
         VALUES (?, ?, 1, 1, ?)`,
        [newQuoteId, sq.machineId, sq.date]
      );

      // 7. cycle_time_results
      const [ctrRes] = await pool.query<any>(
        `INSERT INTO cycle_time_results (quote_id, total_cycle_time_sec, theoretical_cycle_time, correction_factor, corrected_cycle_time, correction_source, correction_applied, quantity, total_lot_time_sec, cutting_time_sec, non_cutting_time_sec, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, 100, ?, ?, ?, ?)`,
        [
          newQuoteId,
          sq.finalCt,
          sq.theoreticalCt,
          sq.factor,
          sq.finalCt,
          `${sq.machine} × ${sq.material}`,
          sq.finalCt * 100,
          sq.finalCt * 0.75,
          sq.finalCt * 0.25,
          sq.date,
        ]
      );

      // 8. quote_results
      await pool.query(
        `INSERT INTO quote_results (quote_id, cycle_time, machine, correction_factor, final_time, quantity, total_lot_time, cutting_time, non_cutting_time, correction_source, confidence_level, completed_by, completed_at)
         VALUES (?, ?, ?, ?, ?, 100, ?, ?, ?, ?, 'HIGH', '営業部 田中', ?)`,
        [
          newQuoteId,
          sq.theoreticalCt,
          sq.machine,
          sq.factor,
          sq.finalCt,
          sq.finalCt * 100,
          sq.finalCt * 0.75,
          sq.finalCt * 0.25,
          `${sq.machine} × ${sq.material}`,
          sq.date,
        ]
      );

      // 9. actual_cycle_times
      await pool.query(
        `INSERT INTO actual_cycle_times (quote_id, machine_id, production_date, quantity, cycle_time_result_id, actual_cycle_time_sec, setup_time_sec, operator_name, status, source, created_at)
         VALUES (?, ?, ?, 100, ?, ?, 600.0, '現場加工担当', 'COMPLETED', 'MANUAL', ?)`,
        [newQuoteId, sq.machineId, sq.date.split(' ')[0], ctrRes.insertId, sq.actualCt, sq.date]
      );

      // 10. prediction_accuracy
      const errSec = Number((sq.actualCt - sq.finalCt).toFixed(3));
      const errRate = Number(((sq.actualCt - sq.finalCt) / sq.finalCt).toFixed(4));
      const absErrRate = Number((Math.abs(sq.actualCt - sq.finalCt) / sq.actualCt).toFixed(4));
      await pool.query(
        `INSERT INTO prediction_accuracy (quote_id, cycle_time_result_id, prediction_ct, theoretical_ct, actual_ct, error_seconds, error_rate, absolute_error_rate, machine_name, material_name, evaluated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE prediction_ct = VALUES(prediction_ct)`,
        [newQuoteId, ctrRes.insertId, sq.finalCt, sq.theoreticalCt, sq.actualCt, errSec, errRate, absErrRate, sq.machine, sq.material, sq.date]
      );

      console.log(`Seeded quote ${sq.quoteNo} (${sq.partNo})`);
    }
  }

  // 既存の quote_id: 5 も prediction_accuracy に評価登録
  const [q5] = await pool.query<RowDataPacket[]>(
    `SELECT qr.final_time, qr.cycle_time, qr.machine, q.material, m.material_name
     FROM quotes q
     LEFT JOIN quote_results qr ON qr.quote_id = q.id
     LEFT JOIN material_information m ON m.quote_id = q.id
     WHERE q.id = 5`
  );
  if (q5.length > 0 && q5[0].final_time) {
    const finalCt = Number(q5[0].final_time);
    const theoCt = Number(q5[0].cycle_time);
    const actualCt = 24.5;
    const errSec = Number((actualCt - finalCt).toFixed(3));
    const errRate = Number(((actualCt - finalCt) / finalCt).toFixed(4));
    const absErrRate = Number((Math.abs(actualCt - finalCt) / actualCt).toFixed(4));
    await pool.query(
      `INSERT INTO prediction_accuracy (quote_id, prediction_ct, theoretical_ct, actual_ct, error_seconds, error_rate, absolute_error_rate, machine_name, material_name, evaluated_at)
       VALUES (5, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE prediction_ct = VALUES(prediction_ct)`,
      [finalCt, theoCt, actualCt, errSec, errRate, absErrRate, q5[0].machine || 'Citizen Cincom L20', q5[0].material_name || q5[0].material || 'S45C']
    );
  }

  const [paCount] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM prediction_accuracy');
  console.log(`prediction_accuracy record count: ${paCount[0].count}`);
}

if (require.main === module) {
  seedPhase18Data()
    .then(() => {
      console.log('Phase 18 seed completed successfully.');
      pool.end();
    })
    .catch((err) => {
      console.error('Seed failed:', err);
      pool.end();
      process.exit(1);
    });
}
