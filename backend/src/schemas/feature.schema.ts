import { z } from 'zod';

/**
 * Feature種別Enum
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
 * AIレスポンス内の個別Feature要素検証スキーマ
 */
export const AiFeatureItemSchema = z.object({
  type: FeatureTypeEnum,
  description: z.string().nullable(),
  diameter: z.number().nullable(),
  length: z.number().nullable(),
  depth: z.number().nullable(),
});

export type AiFeatureItem = z.infer<typeof AiFeatureItemSchema>;

/**
 * AIレスポンス内のfeatures配列検証スキーマ
 */
export const AiFeatureListSchema = z.array(AiFeatureItemSchema);

/**
 * drawing_analyses.raw_response の最小構造検証スキーマ
 */
export const RawResponseFeaturesSchema = z.object({
  features: z.array(AiFeatureItemSchema),
});

/**
 * Feature更新リクエスト検証スキーマ (PUT /api/features/:id)
 */
export const UpdateFeatureSchema = z.object({
  featureType: FeatureTypeEnum,
  description: z.string().nullable().optional().transform((val) => val ?? null),
  diameter: z.number().min(0, { message: '径は0以上を指定してください。' }).nullable(),
  length: z.number().min(0, { message: '長さは0以上を指定してください。' }).nullable(),
  depth: z.number().min(0, { message: '深さは0以上を指定してください。' }).nullable(),
  needsReview: z.boolean(),
});

export type UpdateFeatureInputData = z.infer<typeof UpdateFeatureSchema>;

