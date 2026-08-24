import type { Request, Response } from 'express';
import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { getSecret } from '#airo/secrets';

type Provider = 'openai' | 'anthropic' | 'google';

type CheckResult = {
  provider: Provider;
  configured: boolean;
  valid: boolean;
  message: string;
};

async function checkProvider(provider: Provider): Promise<CheckResult> {
  const secretName = provider === 'openai' ? 'OPENAI_API_KEY' : provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'GOOGLE_GENERATIVE_AI_API_KEY';
  const apiKey = getSecret(secretName);
  if (!apiKey || typeof apiKey !== 'string') {
    return { provider, configured: false, valid: false, message: 'No key configured.' };
  }

  try {
    const model = provider === 'openai'
      ? createOpenAI({ apiKey })('gpt-5-mini')
      : provider === 'anthropic'
        ? createAnthropic({ apiKey })('claude-haiku-4-5-20251001')
        : createGoogleGenerativeAI({ apiKey })('gemini-2.5-flash');
    const result = await generateText({ model, prompt: 'Reply with exactly: OK', maxOutputTokens: 8, abortSignal: AbortSignal.timeout(8000) });
    return { provider, configured: true, valid: Boolean(result.text.trim()), message: 'Key accepted.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The provider rejected this key.';
    return { provider, configured: true, valid: false, message: message.slice(0, 180) };
  }
}

export default async function handler(_req: Request, res: Response) {
  const results = await Promise.all((['openai', 'anthropic', 'google'] as Provider[]).map(checkProvider));
  res.status(200).json({ results });
}
