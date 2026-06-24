import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

import { env } from './env.js';

/**
 * Server-side provider layer (mirror of the client one). Uses the server's own
 * keys from the environment. The provider/model is fixed per deployment via
 * AI_PROVIDER / AI_MODEL so cost is predictable across all users.
 */

export interface ReviewTurn {
  role: 'writer' | 'reviewer';
  text: string;
}

export interface Piece {
  prompt: { genre: string; text: string };
  body: string;
}

export interface RawFeedback {
  overall: number;
  scores: { label: string; score: number; max: number }[];
  summary: string;
  strengths: string[];
  improvements: string[];
  lineNotes: { quote: string; note: string }[];
}

export interface Feedback extends RawFeedback {
  grade: string;
  model: string;
  createdAt: number;
}

const GENRE_LABELS: Record<string, string> = {
  flashfiction: 'flash fiction',
  literary: 'literary',
  scifi: 'science fiction',
  fantasy: 'fantasy',
  mystery: 'mystery',
  horror: 'horror',
  romance: 'romance',
  poetry: 'poetry',
  memoir: 'memoir',
  journaling: 'personal reflection',
  journalism: 'investigative journalism',
  persuasive: 'persuasive',
  essay: 'essay',
};

const GRADE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    overall: { type: 'integer' },
    scores: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: { label: { type: 'string' }, score: { type: 'integer' }, max: { type: 'integer' } },
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
        properties: { quote: { type: 'string' }, note: { type: 'string' } },
        required: ['quote', 'note'],
      },
    },
  },
  required: ['overall', 'scores', 'summary', 'strengths', 'improvements', 'lineNotes'],
} as const;

function letterGrade(overall: number): string {
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

function gradeSystemPrompt(piece: Piece): string {
  const label = GENRE_LABELS[piece.prompt.genre] ?? 'creative';
  return [
    `You are an encouraging but honest writing coach grading a piece of ${label} writing.`,
    `The writer responded to this prompt: "${piece.prompt.text}"`,
    'Grade on four criteria, each out of 25: Craft & Language, Structure & Pacing, Originality & Voice, and Prompt Response.',
    'Set "overall" to the sum of the four (0–100). Be specific and constructive.',
    'In lineNotes, quote 2–4 short phrases verbatim and explain what works or how to sharpen each.',
    'Respond with ONLY the JSON object described by the schema — no prose around it.',
  ].join('\n');
}

function reviewSystemPrompt(piece: Piece): string {
  const label = GENRE_LABELS[piece.prompt.genre] ?? 'creative';
  return [
    `You are a thoughtful writing peer in a workshop, discussing a piece of ${label} writing.`,
    `The prompt was: "${piece.prompt.text}"`,
    'Here is the full piece:',
    '---',
    piece.body,
    '---',
    'Respond like a perceptive fellow writer: warm, specific, and curious. Ask questions, point to exact moments, and suggest concrete experiments rather than rewriting it for them.',
    'Keep replies to a few short paragraphs. This is a back-and-forth, not a lecture.',
  ].join('\n');
}

function serverKey(): string {
  const key =
    env.aiProvider === 'anthropic'
      ? env.anthropicKey
      : env.aiProvider === 'openai'
        ? env.openaiKey
        : env.xaiKey;
  if (!key) throw new Error(`No API key configured for provider "${env.aiProvider}".`);
  return key;
}

function openAICompatible(): OpenAI {
  return new OpenAI({
    apiKey: serverKey(),
    baseURL: env.aiProvider === 'xai' ? 'https://api.x.ai/v1' : undefined,
  });
}

export async function grade(piece: Piece): Promise<Feedback> {
  const model = env.aiModel;
  let raw: RawFeedback;

  if (env.aiProvider === 'anthropic') {
    const msg = await new Anthropic({ apiKey: serverKey() }).messages.create({
      model,
      max_tokens: 4000,
      thinking: { type: 'adaptive' },
      system: gradeSystemPrompt(piece),
      output_config: { format: { type: 'json_schema', schema: GRADE_SCHEMA as Record<string, unknown> } },
      messages: [{ role: 'user', content: piece.body }],
    });
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');
    raw = JSON.parse(text) as RawFeedback;
  } else {
    const completion = await openAICompatible().chat.completions.create({
      model,
      messages: [
        { role: 'system', content: gradeSystemPrompt(piece) },
        { role: 'user', content: piece.body },
      ],
      response_format:
        env.aiProvider === 'openai'
          ? { type: 'json_schema', json_schema: { name: 'grade', strict: true, schema: GRADE_SCHEMA as Record<string, unknown> } }
          : { type: 'json_object' },
    });
    raw = JSON.parse(completion.choices[0]?.message?.content ?? '{}') as RawFeedback;
  }

  return { ...raw, grade: letterGrade(raw.overall), model, createdAt: Date.now() };
}

const PROMPT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    text: { type: 'string' },
    tip: { type: 'string' },
  },
  required: ['text', 'tip'],
} as const;

export async function generatePrompt(
  genre: string,
  wordTarget: number,
): Promise<{ text: string; tip: string }> {
  const model = env.aiModel;
  const label = GENRE_LABELS[genre] ?? 'creative';
  const system = [
    `You generate a single, original writing prompt for the genre: ${label}.`,
    'Make it concrete, evocative, and specific — never generic or list-like. One to three sentences.',
    wordTarget > 0 ? `It should be a good fit for roughly ${wordTarget} words.` : '',
    'Also give one short, actionable craft tip. Respond with ONLY the JSON object in the schema.',
  ]
    .filter(Boolean)
    .join('\n');

  if (env.aiProvider === 'anthropic') {
    const msg = await new Anthropic({ apiKey: serverKey() }).messages.create({
      model,
      max_tokens: 600,
      system,
      output_config: { format: { type: 'json_schema', schema: PROMPT_SCHEMA as Record<string, unknown> } },
      messages: [{ role: 'user', content: 'Generate the prompt now.' }],
    });
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');
    return JSON.parse(text) as { text: string; tip: string };
  }

  const completion = await openAICompatible().chat.completions.create({
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: 'Generate the prompt now.' },
    ],
    response_format:
      env.aiProvider === 'openai'
        ? { type: 'json_schema', json_schema: { name: 'prompt', strict: true, schema: PROMPT_SCHEMA as Record<string, unknown> } }
        : { type: 'json_object' },
  });
  return JSON.parse(completion.choices[0]?.message?.content ?? '{}') as { text: string; tip: string };
}

export async function review(piece: Piece, history: ReviewTurn[]): Promise<string> {
  const model = env.aiModel;
  const turns: ReviewTurn[] =
    history.length > 0 ? history : [{ role: 'writer', text: 'Can you give me your first impressions?' }];

  if (env.aiProvider === 'anthropic') {
    const msg = await new Anthropic({ apiKey: serverKey() }).messages.create({
      model,
      max_tokens: 1024,
      system: reviewSystemPrompt(piece),
      messages: turns.map((t) => ({
        role: t.role === 'writer' ? ('user' as const) : ('assistant' as const),
        content: t.text,
      })),
    });
    return msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
  }

  const completion = await openAICompatible().chat.completions.create({
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
