import { z } from 'zod';

export const ShapeTypeEnum = z.enum([
  'ROUND_BAR',
  'PLATE',
  'PIPE',
  'BLOCK',
  'OTHER',
]);

export const SaveMaterialSchema = z.object({
  materialName: z.string().nullable().optional(),
  materialStandard: z.string().nullable().optional(),
  shapeType: ShapeTypeEnum.optional().default('ROUND_BAR'),
  diameter: z.number().nullable().optional(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  length: z.number().nullable().optional(),
  weight: z.number().nullable().optional(),
  source: z.string().optional().default('MANUAL'),
});

export const UpdateMaterialSchema = z.object({
  materialName: z.string().nullable().optional(),
  materialStandard: z.string().nullable().optional(),
  shapeType: ShapeTypeEnum.optional(),
  diameter: z.number().nullable().optional(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  length: z.number().nullable().optional(),
  weight: z.number().nullable().optional(),
  source: z.string().optional(),
});
