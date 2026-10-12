import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { envConfig } from '../config/env';
import { pool } from '../config/database';
import { drawingRepository } from '../repositories/drawing.repository';
import { quoteRepository } from '../repositories/quote.repository';
import { quoteHistoryRepository } from '../repositories/quote-history.repository';
import { DrawingDto, DrawingListItemDto, toDrawingDto, toDrawingListItemDto } from '../types/drawing';

export class DrawingService {
  /**
   * 図面PDFアップロードとDB登録
   */
  async uploadDrawing(
    quoteId: number,
    file: Express.Multer.File
  ): Promise<DrawingDto> {
    // 1. 対象の見積案件が存在するか確認
    const quote = await quoteRepository.findById(quoteId);
    if (!quote) {
      throw new Error('QUOTE_NOT_FOUND');
    }

    // 2. MIMEタイプの厳格検証
    if (file.mimetype !== 'application/pdf') {
      throw new Error('INVALID_FILE_TYPE');
    }

    // 日本語ファイル名の文字化け防止 (multerのlatin1パースをUTF-8へ復元)
    let originalName = file.originalname;
    try {
      const decoded = Buffer.from(file.originalname, 'latin1').toString('utf8');
      if (!decoded.includes('\uFFFD')) {
        originalName = decoded;
      }
    } catch {
      originalName = file.originalname;
    }
    originalName = path.basename(originalName);

    // 3. 安全な保存ファイル名の生成 (UUID + .pdf)
    const storedName = `${crypto.randomUUID()}.pdf`;
    const targetDir = envConfig.upload.dir;

    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(targetDir)) {
      await fs.promises.mkdir(targetDir, { recursive: true });
    }

    const targetFilePath = path.join(targetDir, storedName);

    // 4. SHA-256ハッシュの計算
    const sha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');

    // 5. 物理ファイル保存
    await fs.promises.writeFile(targetFilePath, file.buffer);

    try {
      // 6. DB登録
      const insertId = await drawingRepository.create({
        quoteId,
        originalName,
        storedName,
        mimeType: 'application/pdf',
        fileSize: file.size,
        filePath: targetFilePath,
        sha256,
      });

      const row = await drawingRepository.findById(insertId);
      if (!row) {
        throw new Error('DRAWING_CREATE_FAILED');
      }

      return toDrawingDto(row);
    } catch (err) {
      // DB登録に失敗した場合は保存した物理ファイルをロールバック削除
      if (fs.existsSync(targetFilePath)) {
        await fs.promises.unlink(targetFilePath).catch(() => {});
      }
      throw err;
    }
  }

  /**
   * 見積案件に紐づく図面一覧取得
   */
  async getDrawingsByQuoteId(quoteId: number): Promise<DrawingListItemDto[]> {
    const quote = await quoteRepository.findById(quoteId);
    if (!quote) {
      throw new Error('QUOTE_NOT_FOUND');
    }

    const rows = await drawingRepository.findByQuoteId(quoteId);
    return rows.map(toDrawingListItemDto);
  }

  /**
   * 図面削除 (DB削除 + 物理ファイル削除 + 下流計算・見積確定情報の整合クリア)
   */
  async deleteDrawing(id: number): Promise<boolean> {
    const row = await drawingRepository.findById(id);
    if (!row) {
      return false;
    }

    const quoteId = row.quote_id;

    // 1. DBレコード削除 (drawing_analyses, features は CASCADE 削除)
    const success = await drawingRepository.delete(id);
    if (!success) {
      return false;
    }

    // 2. 物理PDFファイルの削除
    try {
      if (fs.existsSync(row.file_path)) {
        await fs.promises.unlink(row.file_path);
      }
    } catch {
      console.warn(`Failed to delete physical file: ${row.file_path}`);
    }

    // 3. この案件の図面が全て削除された場合、下流の工程・サイクルタイム計算・見積確定情報をクリアして初期化
    const remainingDrawings = await drawingRepository.findByQuoteId(quoteId);
    if (remainingDrawings.length === 0) {
      await pool.query('DELETE FROM operations WHERE quote_id = ?', [quoteId]);
      await pool.query('DELETE FROM automatic_lathe_operations WHERE quote_id = ?', [quoteId]);
      await pool.query('DELETE FROM cycle_time_results WHERE quote_id = ?', [quoteId]);
      await pool.query('DELETE FROM quote_results WHERE quote_id = ?', [quoteId]);
      await pool.query('DELETE FROM quote_machine_selection WHERE quote_id = ?', [quoteId]);
      await pool.query('DELETE FROM actual_cycle_times WHERE quote_id = ?', [quoteId]);
      await pool.query('DELETE FROM cycle_time_evaluations WHERE quote_id = ?', [quoteId]);
      await pool.query('DELETE FROM similarity_results WHERE quote_id = ?', [quoteId]);
      await pool.query('DELETE FROM prediction_accuracy WHERE quote_id = ?', [quoteId]);
      await pool.query('DELETE FROM material_information WHERE quote_id = ?', [quoteId]);
      await pool.query('UPDATE quotes SET status = ?, updated_at = NOW() WHERE id = ?', ['DRAFT', quoteId]);

      try {
        await quoteHistoryRepository.recordHistory(
          quoteId,
          'STATUS_CHANGE',
          null,
          { status: 'DRAFT', note: '図面削除に伴い下流の工程・サイクルタイム計算・見積確定情報を初期化' },
          'システム'
        );
      } catch (hErr) {
        console.warn('Failed to record history for drawing deletion cleanup:', hErr);
      }
    }

    return true;
  }

  /**
   * 図面の第1ページをPNG画像として取得（オンデマンド変換・キャッシュ）
   */
  async getDrawingImage(drawingId: number): Promise<{ buffer: Buffer; mimeType: string }> {
    const drawing = await drawingRepository.findById(drawingId);
    if (!drawing) {
      throw new Error('DRAWING_NOT_FOUND');
    }

    if (!fs.existsSync(drawing.file_path)) {
      throw new Error('PDF_FILE_NOT_FOUND');
    }

    // キャッシュ画像ファイルパス (.png)
    const pngPath = `${drawing.file_path}.page1.png`;
    if (fs.existsSync(pngPath)) {
      const buffer = await fs.promises.readFile(pngPath);
      return { buffer, mimeType: 'image/png' };
    }

    // pdf-to-img で1ページ目をPNG化
    const { pdf } = await import('pdf-to-img');
    const document = await pdf(drawing.file_path, { scale: 2.0, format: 'png' });
    let firstPageBuffer: Buffer | null = null;
    for await (const pageBuffer of document) {
      firstPageBuffer = pageBuffer;
      break; // 1ページ目のみ取得
    }

    if (!firstPageBuffer) {
      throw new Error('NO_PAGES_FOUND');
    }

    // キャッシュ保存
    await fs.promises.writeFile(pngPath, firstPageBuffer).catch(() => {});

    return { buffer: firstPageBuffer, mimeType: 'image/png' };
  }
}

export const drawingService = new DrawingService();
