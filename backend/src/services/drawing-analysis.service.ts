import fs from 'fs';
import { zodResponseFormat } from 'openai/helpers/zod';
import { envConfig } from '../config/env';
import { openaiClient } from '../config/openai';
import { PROMPT_VERSION, SYSTEM_PROMPT, USER_PROMPT } from '../prompts/drawing-analysis.prompt';
import { drawingAnalysisRepository } from '../repositories/drawing-analysis.repository';
import { drawingRepository } from '../repositories/drawing.repository';
import { DrawingAnalysisData, DrawingAnalysisSchema } from '../schemas/drawing-analysis.schema';
import {
  DrawingAnalysisDetailDto,
  DrawingAnalysisDto,
  toDrawingAnalysisDetailDto,
  toDrawingAnalysisDto,
} from '../types/drawing-analysis';

export class DrawingAnalysisService {
  /**
   * PDF図面を画像化し、OpenAI Visionで解析してDBへ保存する
   */
  async analyzeDrawing(drawingId: number): Promise<DrawingAnalysisDto> {
    // 1. drawing_id から drawings レコードを取得
    const drawing = await drawingRepository.findById(drawingId);
    if (!drawing) {
      throw new Error('DRAWING_NOT_FOUND');
    }

    // 2. PDF存在確認
    if (!fs.existsSync(drawing.file_path)) {
      throw new Error('PDF_FILE_NOT_FOUND');
    }

    let parsedData: DrawingAnalysisData;
    let rawResponseContent: string = '';

    try {
      // 3. PDFページ画像化 (pdf-to-img を動的インポート)
      const { pdf } = await import('pdf-to-img');
      const document = await pdf(drawing.file_path, { scale: 2.0, format: 'png' });

      const imageBuffers: Buffer[] = [];
      for await (const pageBuffer of document) {
        imageBuffers.push(pageBuffer);
      }

      if (imageBuffers.length === 0) {
        throw new Error('NO_PAGES_FOUND');
      }

      // 4. OpenAI Vision API 呼び出し (Structured Outputs)
      const userContent: Array<
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string; detail?: 'auto' | 'low' | 'high' } }
      > = [{ type: 'text', text: USER_PROMPT }];

      for (const buffer of imageBuffers) {
        const base64Image = buffer.toString('base64');
        userContent.push({
          type: 'image_url',
          image_url: {
            url: `data:image/png;base64,${base64Image}`,
            detail: 'high',
          },
        });
      }

      const response = await openaiClient.chat.completions.parse({
        model: envConfig.openai.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        response_format: zodResponseFormat(DrawingAnalysisSchema, 'drawing_analysis'),
      });

      const message = response.choices[0]?.message;
      if (!message) {
        throw new Error('NO_RESPONSE_MESSAGE');
      }

      if (message.refusal) {
        throw new Error(`AI_REFUSAL: ${message.refusal}`);
      }

      if (!message.parsed) {
        throw new Error('FAILED_TO_PARSE_RESPONSE');
      }

      // 5. Zod検証
      const validationResult = DrawingAnalysisSchema.safeParse(message.parsed);
      if (!validationResult.success) {
        throw new Error(`VALIDATION_FAILED: ${validationResult.error.message}`);
      }

      parsedData = validationResult.data;
      rawResponseContent = message.content || JSON.stringify(parsedData);
    } catch (err: unknown) {
      // OpenAI関連エラーや画像変換エラーの際は内部情報を伏せてANALYSIS_FAILEDとする
      console.error('Drawing analysis failed with error:', err instanceof Error ? err.message : String(err));
      throw new Error('ANALYSIS_FAILED');
    }

    // 6. drawing_analyses テーブルへ保存
    const insertId = await drawingAnalysisRepository.create({
      drawingId: drawing.id,
      modelName: envConfig.openai.model,
      promptVersion: PROMPT_VERSION,
      analysisStatus: 'SUCCESS',
      partType: parsedData.partType,
      material: parsedData.material,
      stockType: parsedData.partType ? 'ROUND_BAR' : null,
      stockDiameter: parsedData.overallDimensions?.diameter ?? null,
      stockWidth: null,
      stockHeight: null,
      stockLength: parsedData.overallDimensions?.length ?? null,
      overallLength: parsedData.overallDimensions?.length ?? null,
      rawResponse: rawResponseContent,
      warnings: JSON.stringify(parsedData.warnings ?? []),
    });

    const createdRow = await drawingAnalysisRepository.findById(insertId);
    if (!createdRow) {
      throw new Error('ANALYSIS_RECORD_NOT_FOUND');
    }

    return toDrawingAnalysisDto(createdRow);
  }

  /**
   * 図面IDから最新の解析結果を取得
   */
  async getLatestAnalysisByDrawingId(drawingId: number): Promise<DrawingAnalysisDetailDto | null> {
    const drawing = await drawingRepository.findById(drawingId);
    if (!drawing) {
      throw new Error('DRAWING_NOT_FOUND');
    }

    const row = await drawingAnalysisRepository.findLatestByDrawingId(drawingId);
    if (!row) {
      return null;
    }

    return toDrawingAnalysisDetailDto(row);
  }
}

export const drawingAnalysisService = new DrawingAnalysisService();
