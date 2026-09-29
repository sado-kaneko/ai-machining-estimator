import { z } from 'zod';

/**
 * 加工Featureタイプ
 */
export const FeatureTypeEnum = z.enum([
  'OD',
  'ID',
  'DRILL',
  'BORE',
  'THREAD',
  'GROOVE',
  'CHAMFER',
  'UNKNOWN',
]);

export type FeatureType = z.infer<typeof FeatureTypeEnum>;

/**
 * 加工Feature抽出項目
 */
export const DrawingFeatureSchema = z.object({
  type: FeatureTypeEnum,
  description: z.string().nullable(),
  diameter: z.number().nullable(),
  length: z.number().nullable(),
  depth: z.number().nullable(),
});

export type DrawingFeature = z.infer<typeof DrawingFeatureSchema>;

/**
 * 全体完成寸法
 */
export const OverallDimensionsSchema = z.object({
  length: z.number().nullable(),
  diameter: z.number().nullable(),
});

export type OverallDimensions = z.infer<typeof OverallDimensionsSchema>;

/**
 * 公差項目
 */
export const ToleranceItemSchema = z.object({
  dimension: z.string(),
  tolerance: z.string(),
  notes: z.string().nullable(),
});

export type ToleranceItem = z.infer<typeof ToleranceItemSchema>;

/**
 * 表面粗さ項目
 */
export const SurfaceRequirementItemSchema = z.object({
  target: z.string(),
  roughness: z.string(),
});

export type SurfaceRequirementItem = z.infer<typeof SurfaceRequirementItemSchema>;

/**
 * AI図面解析レスポンススキーマ
 * ※ OpenAI Structured Outputs 準拠
 */
export const DrawingAnalysisSchema = z.object({
  partType: z.string().nullable(),
  material: z.string().nullable(),
  overallDimensions: OverallDimensionsSchema,
  features: z.array(DrawingFeatureSchema),
  tolerances: z.array(ToleranceItemSchema),
  surfaceRequirements: z.array(SurfaceRequirementItemSchema),
  warnings: z.array(z.string()),
});

export type DrawingAnalysisData = z.infer<typeof DrawingAnalysisSchema>;
