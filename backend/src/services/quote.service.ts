import { quoteRepository } from '../repositories/quote.repository';
import { CreateQuoteInput, QuoteDto, toQuoteDto, UpdateQuoteInput } from '../types/quote';

export class QuoteService {
  /**
   * 一覧取得
   */
  async getAllQuotes(limit?: number): Promise<QuoteDto[]> {
    const rows = await quoteRepository.findAll(limit);
    return rows.map(toQuoteDto);
  }

  /**
   * 1件取得
   */
  async getQuoteById(id: number): Promise<QuoteDto | null> {
    const row = await quoteRepository.findById(id);
    if (!row) {
      return null;
    }
    return toQuoteDto(row);
  }

  /**
   * 新規作成
   */
  async createQuote(input: CreateQuoteInput): Promise<QuoteDto> {
    const insertId = await quoteRepository.create(input);
    const created = await quoteRepository.findById(insertId);
    if (!created) {
      throw new Error('見積案件の作成後にレコードの取得に失敗しました');
    }
    return toQuoteDto(created);
  }

  /**
   * 更新
   */
  async updateQuote(id: number, input: UpdateQuoteInput): Promise<QuoteDto | null> {
    const updated = await quoteRepository.update(id, input);
    if (!updated) {
      return null;
    }
    const row = await quoteRepository.findById(id);
    return row ? toQuoteDto(row) : null;
  }

  /**
   * 削除
   */
  async deleteQuote(id: number): Promise<boolean> {
    return await quoteRepository.delete(id);
  }
}

export const quoteService = new QuoteService();
