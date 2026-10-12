import fs from 'fs';
import path from 'path';

export interface ExtractedPdfText {
  fullText: string;
  items: Array<{
    str: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  lines: string[];
}

/**
 * PDFファイルから直接ベクターテキスト情報を抽出するユーティリティ
 */
export async function extractTextFromPdf(pdfPath: string): Promise<ExtractedPdfText> {
  const data = new Uint8Array(await fs.promises.readFile(pdfPath));
  
  // pdfjs-dist の動的インポート (ESM)
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const pdfDocument = await pdfjs.getDocument({
    data,
    useSystemFonts: true,
  }).promise;

  const items: Array<{ str: string; x: number; y: number; width: number; height: number }> = [];
  const linesMap = new Map<number, string[]>();

  for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const content = await page.getTextContent();

    for (const item of content.items as any[]) {
      const str = (item.str || '').trim();
      if (!str) continue;

      const tx = item.transform; // [scaleX, skewY, skewX, scaleY, transX, transY]
      const x = Math.round(tx[4] * 10) / 10;
      const y = Math.round(tx[5] * 10) / 10;
      const width = Math.round((item.width || 0) * 10) / 10;
      const height = Math.round((item.height || 0) * 10) / 10;

      items.push({ str, x, y, width, height });

      // 近接する Y 座標（行）ごとにグルーピング (誤差 ±3)
      const roundedY = Math.round(y / 4) * 4;
      if (!linesMap.has(roundedY)) {
        linesMap.set(roundedY, []);
      }
      linesMap.get(roundedY)!.push(str);
    }
  }

  // Y座標順（上から下）にソートして行テキスト化
  const sortedY = Array.from(linesMap.keys()).sort((a, b) => b - a);
  const lines = sortedY.map(y => linesMap.get(y)!.join(' '));
  const fullText = lines.join('\n');

  return {
    fullText,
    items,
    lines,
  };
}
