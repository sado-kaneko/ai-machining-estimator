import OpenAI from 'openai';
import { envConfig } from './env';

/**
 * OpenAI クライアント設定
 * APIキーは環境変数から取得し、ログ等へは一切出力しない。
 */
export function getOpenAIClient(): OpenAI {
  if (!envConfig.openai.apiKey) {
    throw new Error('OPENAI_API_KEY が設定されていません。');
  }

  return new OpenAI({
    apiKey: envConfig.openai.apiKey,
  });
}

export const openaiClient = getOpenAIClient();
