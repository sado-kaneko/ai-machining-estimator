import { z } from 'zod';

export const createActualCycleTimeSchema = z.object({
  machineId: z.number().int().positive({ message: '設備IDは正の整数である必要があります' }).nullable().optional(),
  productionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: '日付はYYYY-MM-DD形式で指定してください' })
    .nullable()
    .optional(),
  quantity: z
    .number({ message: '数量は必須です' })
    .int({ message: '数量は整数である必要があります' })
    .min(1, { message: '数量は1以上である必要があります' }),
  actualCycleTimeSec: z
    .number({ message: '実績サイクルタイムは必須です' })
    .min(0, { message: '実績サイクルタイムは0以上である必要があります' }),
  setupTimeSec: z
    .number()
    .min(0, { message: '段取り時間は0以上である必要があります' })
    .optional()
    .default(0),
  operatorName: z
    .string()
    .max(100, { message: '作業者名は100文字以内で指定してください' })
    .nullable()
    .optional(),
  notes: z
    .string()
    .max(1000, { message: '備考は1000文字以内で指定してください' })
    .nullable()
    .optional(),
});

export type CreateActualCycleTimeDto = z.infer<typeof createActualCycleTimeSchema>;
