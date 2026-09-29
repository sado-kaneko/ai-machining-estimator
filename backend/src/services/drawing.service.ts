import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { envConfig } from '../config/env';
import { drawingRepository } from '../repositories/drawing.repository';
import { quoteRepository } from '../repositories/quote.repository';
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
        originalName: path.basename(file.originalname),
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
   * 図面削除 (DB削除 + 物理ファイル削除)
   */
  async deleteDrawing(id: number): Promise<boolean> {
    const row = await drawingRepository.findById(id);
    if (!row) {
      return false;
    }

    // 1. DBレコード削除
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
      // 物理ファイル削除失敗時もDB削除は完了しているためログ出力のみ
      console.warn(`Failed to delete physical file: ${row.file_path}`);
    }

    return true;
  }
}

export const drawingService = new DrawingService();
