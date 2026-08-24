import type { LanguageModel } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { getSecret } from '#airo/secrets';

export function getChatModel(): LanguageModel {
  const apiKey = getSecret('OPENAI_API_KEY');
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('OPENAI_API_KEY is not set.');
  }
  return createOpenAI({ apiKey })('gpt-5-mini');
}

export const SYSTEM_PROMPT = `You are Wander's expert trip planner. Create practical, enjoyable day-by-day itineraries using only the trip details supplied by the user. Respect the confirmed dates and include every saved activity exactly once when possible. Group nearby activities into sensible days, avoid overpacking, and include realistic time windows. Return valid JSON only, with this exact shape: {"days":[{"date":"YYYY-MM-DD","entries":[{"time":"09:00","title":"Activity name","cost":null,"status":"planned"}]}]}. Do not invent booking confirmations, opening hours, prices, or activities that were not supplied.`;
