import { z } from 'zod';

// IDパラメータ検証スキーマ
export const quoteIdParamSchema = z.object({
  id: z.coerce.number().int().positive({ message: 'IDは1以上の整数である必要があります' }),
});

// 見積新規作成スキーマ
export const createQuoteSchema = z.object({
  quoteNo: z.string().max(100, { message: '見積番号は100文字以内である必要があります' }).nullable().optional(),
  customerName: z.string().min(1, { message: '顧客名は必須です' }).max(191, { message: '顧客名は191文字以内である必要があります' }),
  partNo: z.string().max(191, { message: '図番は191文字以内である必要があります' }).default(''),
  partName: z.string().max(191, { message: '品名は191文字以内である必要があります' }).default(''),
  quantity: z.number().int({ message: '数量は整数である必要があります' }).min(1, { message: '数量は1以上である必要があります' }),
  status: z.string().max(50, { message: 'ステータスは50文字以内である必要があります' }).default('DRAFT'),
  notes: z.string().nullable().optional(),
});

// 見積更新スキーマ
export const updateQuoteSchema = z.object({
  quoteNo: z.string().max(100, { message: '見積番号は100文字以内である必要があります' }).nullable().optional(),
  customerName: z.string().min(1, { message: '顧客名は1文字以上である必要があります' }).max(191, { message: '顧客名は191文字以内である必要があります' }).optional(),
  partNo: z.string().max(191, { message: '図番は191文字以内である必要があります' }).optional(),
  partName: z.string().max(191, { message: '品名は191文字以内である必要があります' }).optional(),
  quantity: z.number().int({ message: '数量は整数である必要があります' }).min(1, { message: '数量は1以上である必要があります' }).optional(),
  status: z.string().max(50, { message: 'ステータスは50文字以内である必要があります' }).optional(),
  notes: z.string().nullable().optional(),
});
