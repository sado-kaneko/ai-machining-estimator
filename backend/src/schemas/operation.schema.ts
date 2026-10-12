import { z } from 'zod';

export const OperationStatusEnum = z.enum(['GENERATED', 'CONFIRMED', 'MANUAL']);

export const UpdateOperationSchema = z.object({
  sequenceNo: z.number().int().positive({ message: '順番は正の整数を指定してください。' }).optional(),
  machiningSide: z.enum(['FRONT', 'CUTOFF', 'BACK']).optional(),
  description: z.string().min(1, { message: '説明を入力してください。' }).max(50, { message: '説明は50文字以内で入力してください。' }).optional(),
  machineType: z.string().min(1, { message: '設備分類を入力してください。' }).max(50, { message: '設備分類は50文字以内で入力してください。' }).optional(),
  status: OperationStatusEnum.optional(),
});

export type UpdateOperationInputData = z.infer<typeof UpdateOperationSchema>;
