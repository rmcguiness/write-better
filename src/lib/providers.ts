import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

import { getGenre } from './genres';
import type { Feedback, Piece, ReviewTurn } from './types';

/**
 * Provider abstraction. The rest of the app talks to grade/review through one
 * interface; this module knows how to reach each vendor.
 *
 * - Anthropic uses its own SDK with structured outputs.
 * - OpenAI (ChatGPT) and xAI (Grok) share the OpenAI-compatible Chat
 *   Completions API — xAI is the same client pointed at a different base URL.
 *
 * The same logic runs in two places: directly from the client in BYOK mode,
 * and (a copy of it) on the backend in managed mode.
 */

export type ProviderId = 'anthropic' | 'openai' | 'xai';

export interface ModelOption {
  id: string;
  label: string;
  /** Rough relative cost, for the UI to hint "cheaper" / "best". */
  tier: 'fast' | 'balanced' | 'best';
}

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  /** Expected key prefix, shown as a hint in Settings. */
  keyHint: string;
  getKeyUrl: string;
  models: ModelOption[];
}

/**
 * Model IDs change often — verify the current list in each provider's docs and
 * edit here. These are deliberately a small, sensible default set.
 */
export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    keyHint: 'sk-ant-…',
    getKeyUrl: 'https://console.anthropic.com/settings/keys',
    models: [
      { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', tier: 'fast' },
      { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', tier: 'balanced' },
      { id: 'claude-opus-4-8', label: 'Claude Opus 4.8', tier: 'best' },
    ],
  },
  {
    id: 'openai',
    label: 'OpenAI (ChatGPT)',
    keyHint: 'sk-…',
    getKeyUrl: 'https://platform.openai.com/api-keys',
    models: [
      { id: 'gpt-4o-mini', label: 'GPT-4o mini', tier: 'fast' },
      { id: 'gpt-4o', label: 'GPT-4o', tier: 'balanced' },
    ],
  },
  {
    id: 'xai',
    label: 'xAI (Grok)',
    keyHint: 'xai-…',
    getKeyUrl: 'https://console.x.ai',
    models: [
      { id: 'grok-2-latest', label: 'Grok 2', tier: 'balanced' },
    ],
  },
];

export function getProvider(id: ProviderId): ProviderInfo {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}

export function defaultModel(id: ProviderId): string {
  return getProvider(id).models[0].id;
}

// ----- Shared schemas --------------------------------------------------------

export type RawFeedback = Omit<Feedback, 'grade' | 'model' | 'createdAt'>;

/** Shape of an AI-generated prompt. */
export interface GeneratedPrompt {
  text: string;
  tip: string;
}

export const PROMPT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    text: { type: 'string', description: 'The writing prompt itself.' },
    tip: { type: 'string', description: 'One short craft tip for tackling it.' },
  },
  required: ['text', 'tip'],
} as const;

export function promptSystemPrompt(genreLabel: string, blurb: string, wordTarget: number): string {
  return [
    `You generate a single, original writing prompt for the genre: ${genreLabel} (${blurb}).`,
    'Make it concrete, evocative, and specific — never generic or list-like. One to three sentences.',
    wordTarget > 0 ? `It should be a good fit for roughly ${wordTarget} words.` : '',
    'Also give one short, actionable craft tip. Respond with ONLY the JSON object in the schema.',
  ]
    .filter(Boolean)
    .join('\n');
}

export const GRADE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    overall: { type: 'integer', description: 'Overall score from 0 to 100.' },
    scores: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          label: { type: 'string' },
          score: { type: 'integer' },
          max: { type: 'integer' },
        },
        required: ['label', 'score', 'max'],
      },
    },
    summary: { type: 'string' },
    strengths: { type: 'array', items: { type: 'string' } },
    improvements: { type: 'array', items: { type: 'string' } },
    lineNotes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          quote: { type: 'string' },
          note: { type: 'string' },
        },
        required: ['quote', 'note'],
      },
    },
  },
  required: ['overall', 'scores', 'summary', 'strengths', 'improvements', 'lineNotes'],
} as const;

export function letterGrade(overall: number): string {
  if (overall >= 97) return 'A+';
  if (overall >= 93) return 'A';
  if (overall >= 90) return 'A-';
  if (overall >= 87) return 'B+';
  if (overall >= 83) return 'B';
  if (overall >= 80) return 'B-';
  if (overall >= 77) return 'C+';
  if (overall >= 73) return 'C';
  if (overall >= 70) return 'C-';
  if (overall >= 60) return 'D';
  return 'F';
}

export function gradeSystemPrompt(piece: Piece): string {
  const genre = getGenre(piece.prompt.genre);
  return [
    `You are an encouraging but honest writing coach grading a piece of ${genre.label.toLowerCase()} writing.`,
    `The writer responded to this prompt: "${piece.prompt.text}"`,
    'Grade on four criteria, each out of 25: Craft & Language, Structure & Pacing, Originality & Voice, and Prompt Response.',
    'Set "overall" to the sum of the four (0–100). Be specific and constructive.',
    'In lineNotes, quote 2–4 short phrases verbatim from the writing and explain what works or how to sharpen each.',
    'Respond with ONLY the JSON object described by the schema — no prose around it.',
  ].join('\n');
}

export function reviewSystemPrompt(piece: Piece): string {
  const genre = getGenre(piece.prompt.genre);
  return [
    `You are a thoughtful writing peer in a workshop, discussing a piece of ${genre.label.toLowerCase()} writing.`,
    `The prompt was: "${piece.prompt.text}"`,
    'Here is the full piece:',
    '---',
    piece.body,
    '---',
    'Respond like a perceptive fellow writer: warm, specific, and curious. Ask questions, point to exact moments, and suggest concrete experiments rather than rewriting it for them.',
    'Keep replies to a few short paragraphs. This is a back-and-forth, not a lecture.',
  ].join('\n');
}

/** Parse the provider JSON as returned; validation is delegated to its schema. */
export function parseFeedback(text: string): RawFeedback {
  return JSON.parse(text) as RawFeedback;
}

export function finalizeFeedback(raw: RawFeedback, model: string): Feedback {
  return { ...raw, grade: letterGrade(raw.overall), model, createdAt: Date.now() };
}

export function seedHistory(history: ReviewTurn[]): ReviewTurn[] {
  return history.length > 0
    ? history
    : [{ role: 'writer', text: 'Can you give me your first impressions?', createdAt: Date.now() }];
}

// These clients are used only for explicit BYOK: browser access sends the user’s key
// directly to their chosen provider, never to our managed backend.
// ----- Provider calls --------------------------------------------------------

function openAICompatibleClient(provider: ProviderId, apiKey: string): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL: provider === 'xai' ? 'https://api.x.ai/v1' : undefined,
    dangerouslyAllowBrowser: true,
  });
}

export async function gradeWithProvider(
  provider: ProviderId,
  model: string,
  apiKey: string,
  piece: Piece,
): Promise<Feedback> {
  if (provider === 'anthropic') {
    const message = await new Anthropic({ apiKey, dangerouslyAllowBrowser: true }).messages.create({
      model,
      max_tokens: 4000,
      thinking: { type: 'adaptive' },
      system: gradeSystemPrompt(piece),
      output_config: { format: { type: 'json_schema', schema: GRADE_SCHEMA as Record<string, unknown> } },
      messages: [{ role: 'user', content: piece.body }],
    });
    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');
    return finalizeFeedback(parseFeedback(text), model);
  }

  // OpenAI + xAI
  const client = openAICompatibleClient(provider, apiKey);
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: gradeSystemPrompt(piece) },
      { role: 'user', content: piece.body },
    ],
    response_format:
      provider === 'openai'
        ? { type: 'json_schema', json_schema: { name: 'grade', strict: true, schema: GRADE_SCHEMA as Record<string, unknown> } }
        : { type: 'json_object' },
  });
  const text = completion.choices[0]?.message?.content ?? '{}';
  return finalizeFeedback(parseFeedback(text), model);
}

export async function reviewWithProvider(
  provider: ProviderId,
  model: string,
  apiKey: string,
  piece: Piece,
  history: ReviewTurn[],
): Promise<string> {
  const turns = seedHistory(history);

  if (provider === 'anthropic') {
    const message = await new Anthropic({ apiKey, dangerouslyAllowBrowser: true }).messages.create({
      model,
      max_tokens: 1024,
      system: reviewSystemPrompt(piece),
      messages: turns.map((t) => ({
        role: t.role === 'writer' ? ('user' as const) : ('assistant' as const),
        content: t.text,
      })),
    });
    return message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
  }

  const client = openAICompatibleClient(provider, apiKey);
  const completion = await client.chat.completions.create({
    model,
    max_tokens: 1024,
    messages: [
      { role: 'system', content: reviewSystemPrompt(piece) },
      ...turns.map((t) => ({
        role: t.role === 'writer' ? ('user' as const) : ('assistant' as const),
        content: t.text,
      })),
    ],
  });
  return (completion.choices[0]?.message?.content ?? '').trim();
}

export async function generatePromptWithProvider(
  provider: ProviderId,
  model: string,
  apiKey: string,
  genreLabel: string,
  blurb: string,
  wordTarget: number,
): Promise<GeneratedPrompt> {
  const system = promptSystemPrompt(genreLabel, blurb, wordTarget);
  const user = 'Generate the prompt now.';

  if (provider === 'anthropic') {
    const message = await new Anthropic({ apiKey, dangerouslyAllowBrowser: true }).messages.create({
      model,
      max_tokens: 600,
      system,
      output_config: { format: { type: 'json_schema', schema: PROMPT_SCHEMA as Record<string, unknown> } },
      messages: [{ role: 'user', content: user }],
    });
    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');
    return JSON.parse(text) as GeneratedPrompt;
  }

  const client = openAICompatibleClient(provider, apiKey);
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    response_format:
      provider === 'openai'
        ? { type: 'json_schema', json_schema: { name: 'prompt', strict: true, schema: PROMPT_SCHEMA as Record<string, unknown> } }
        : { type: 'json_object' },
  });
  return JSON.parse(completion.choices[0]?.message?.content ?? '{}') as GeneratedPrompt;
}

/** Map any provider SDK error to a short, user-facing message. */
export function friendlyProviderError(err: unknown): Error {
  if (err instanceof Anthropic.AuthenticationError || err instanceof OpenAI.AuthenticationError) {
    return new Error('That API key was rejected. Check it in Settings.');
  }
  if (err instanceof Anthropic.RateLimitError || err instanceof OpenAI.RateLimitError) {
    return new Error('Rate limited — give it a moment and try again.');
  }
  if (err instanceof Anthropic.APIError || err instanceof OpenAI.APIError) {
    return new Error(err.status ? `The AI provider could not complete the request (${err.status}). Try again later.` : 'Could not connect to the AI provider. Check your connection; the provider may block browser requests (CORS).');
  }
  return new Error('Could not reach the AI service.');
}
