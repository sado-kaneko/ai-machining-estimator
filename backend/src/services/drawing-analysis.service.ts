import fs from 'fs';
import { zodResponseFormat } from 'openai/helpers/zod';
import { envConfig } from '../config/env';
import { openaiClient } from '../config/openai';
import { PROMPT_VERSION, SYSTEM_PROMPT, USER_PROMPT } from '../prompts/drawing-analysis.prompt';
import { drawingAnalysisRepository } from '../repositories/drawing-analysis.repository';
import { drawingRepository } from '../repositories/drawing.repository';
import { materialRepository } from '../repositories/material.repository';
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
  async analyzeDrawing(drawingId: number, signal?: AbortSignal): Promise<DrawingAnalysisDto> {
    // 1. drawing_id から drawings レコードを取得
    const drawing = await drawingRepository.findById(drawingId);
    if (!drawing) {
      throw new Error('DRAWING_NOT_FOUND');
    }

    // 2. PDF存在確認
    if (!fs.existsSync(drawing.file_path)) {
      throw new Error('PDF_FILE_NOT_FOUND');
    }

    if (signal?.aborted) {
      throw new Error('ANALYSIS_ABORTED');
    }

    let parsedData: DrawingAnalysisData;
    let rawResponseContent: string = '';

    try {
      // 3. PDFページ画像化 (pdf-to-img を動的インポート)
      const { pdf } = await import('pdf-to-img');
      const document = await pdf(drawing.file_path, { scale: 2.0, format: 'png' });

      const imageBuffers: Buffer[] = [];
      for await (const pageBuffer of document) {
        if (signal?.aborted) {
          throw new Error('ANALYSIS_ABORTED');
        }
        imageBuffers.push(pageBuffer);
      }

      if (imageBuffers.length === 0) {
        throw new Error('NO_PAGES_FOUND');
      }

      if (signal?.aborted) {
        throw new Error('ANALYSIS_ABORTED');
      }

      // 3.5. PDFベクターテキストの直接抽出（OCRブレ・数字読み違いの防止）
      let pdfExtractedTextSection = '';
      try {
        const { extractTextFromPdf } = await import('../utils/pdf-text-extractor');
        const textResult = await extractTextFromPdf(drawing.file_path);
        if (textResult.fullText && textResult.fullText.trim().length > 0) {
          pdfExtractedTextSection = `\n\n【PDF内部から直接抽出された確定テキスト・寸法一覧】\n以下はPDF内部のベクター情報から直接抽出されたテキストです。図面中の寸法値、公差、図番、材質名、注記の照合に最優先で活用し、読み取りの絶対的な根拠としてください。\n---\n${textResult.fullText}\n---`;
        }
      } catch (extractErr) {
        console.warn('PDF vector text extraction skipped:', extractErr);
      }

      // 3.6. 自社保有加工機一覧（特注オプション・仕様）の動的注入
      let machineSpecsPromptSection = '';
      try {
        const { masterRepository } = await import('../repositories/master.repository');
        const machines = await masterRepository.getAllMachines(true);
        if (machines.length > 0) {
          machineSpecsPromptSection = `\n\n【自社保有加工機一覧（特注オプション・仕様）】\n当社が保有する加工設備の一覧です。図面の素材径、全長、加工工程（背面複合加工、深穴、特殊ミーリングなど）を照合し、加工可能な推奨加工機名(recommendedMachine)およびその判定理由(machineFeasibilityReason)を出力してください。\n`;
          for (const m of machines) {
            machineSpecsPromptSection += `- ${m.machineName} (${m.model || m.machineType}): 最大バー材径=φ${m.maxBarDiameter}mm, 最大加工長=${m.maxMachiningLength}mm, 背面サブ主軸=${m.hasSubSpindle ? '有' : '無'}, 工具本数=${m.maxTools}本, 特注仕様・オプション: ${m.specialOptions || '標準仕様'}\n`;
          }
        }
      } catch (mErr) {
        console.warn('Machine master injection skipped:', mErr);
      }

      // 4. OpenAI Vision API 呼び出し (Structured Outputs)
      const userContent: Array<
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string; detail?: 'auto' | 'low' | 'high' } }
      > = [{ type: 'text', text: USER_PROMPT + pdfExtractedTextSection + machineSpecsPromptSection }];

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

      const response = await openaiClient.chat.completions.parse(
        {
          model: envConfig.openai.model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userContent },
          ],
          response_format: zodResponseFormat(DrawingAnalysisSchema, 'drawing_analysis'),
        },
        { signal }
      );

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
      if (
        (err instanceof Error && (err.name === 'AbortError' || err.message === 'ANALYSIS_ABORTED')) ||
        signal?.aborted
      ) {
        console.log(`[AI Analysis] Safely aborted for drawingId=${drawingId}`);
        throw new Error('ANALYSIS_ABORTED');
      }
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
      stockType: (parsedData.stockDetail?.shape as string) || (parsedData.partType ? 'ROUND_BAR' : null),
      stockDiameter: parsedData.stockDetail?.diameter ?? parsedData.overallDimensions?.diameter ?? null,
      stockWidth: parsedData.stockDetail?.width ?? null,
      stockHeight: parsedData.stockDetail?.height ?? null,
      stockLength: parsedData.stockDetail?.length ?? parsedData.overallDimensions?.length ?? null,
      overallLength: parsedData.overallDimensions?.length ?? null,
      rawResponse: rawResponseContent,
      warnings: JSON.stringify(parsedData.warnings ?? []),
    });

    // 7. material_information テーブルへ自動連携 (PHASE11)
    try {
      const materialName = parsedData.materialDetail?.name || parsedData.material || null;
      const materialStandard = parsedData.materialDetail?.standard || null;
      const shapeType = parsedData.stockDetail?.shape || 'ROUND_BAR';
      const diameter = parsedData.stockDetail?.diameter ?? parsedData.overallDimensions?.diameter ?? null;
      const width = parsedData.stockDetail?.width ?? null;
      const height = parsedData.stockDetail?.height ?? null;
      const length = parsedData.stockDetail?.length ?? null; // 推測禁止: 図面指示がある場合のみ

      await materialRepository.upsertByQuoteId(drawing.quote_id, {
        materialName,
        materialStandard,
        shapeType: shapeType as any,
        diameter,
        width,
        height,
        length,
        source: 'AI',
      });
    } catch (matErr) {
      console.warn('Failed to upsert material_information during AI analysis:', matErr);
    }

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
