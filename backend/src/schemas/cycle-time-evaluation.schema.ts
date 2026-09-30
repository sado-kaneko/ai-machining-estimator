import { z } from 'zod';

export const DifferenceCategoryEnum = z.enum([
  'CUTTING_CONDITION',
  'PROCESS_RULE',
  'NON_CUTTING_TIME',
  'SETUP_TIME',
  'OTHER',
]);

export const CreateCycleTimeEvaluationSchema = z.object({
  machineId: z.number().nullable().optional(),
  calculatedCycleTimeSec: z.number().nullable().optional(),
  excelCycleTimeSec: z.number().nullable().optional(),
  actualCycleTimeSec: z.number().nullable().optional(),
  differenceCategory: DifferenceCategoryEnum.optional().default('OTHER'),
  notes: z.string().nullable().optional(),
});
