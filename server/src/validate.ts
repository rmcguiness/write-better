import type { Piece, ReviewTurn } from './providers.js';

/** Runtime validation for request bodies (TypeScript types are not checked at runtime). */

export const LIMITS = {
  maxBodyBytes: 128 * 1024,
  pieceChars: 50_000,
  promptChars: 2_000,
  genreChars: 40,
  historyTurns: 20,
  turnChars: 4_000,
  historyChars: 40_000,
  maxWordTarget: 20_000,
} as const;

const isStr = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max;

export function parsePiece(v: unknown): Piece | null {
  if (!v || typeof v !== 'object') return null;
  const p = v as Record<string, unknown>;
  const prompt = (p.prompt ?? {}) as Record<string, unknown>;
  if (!isStr(p.body, LIMITS.pieceChars) || p.body.trim() === '') return null;
  const genre = prompt.genre ?? 'literary';
  const text = prompt.text ?? '';
  if (!isStr(genre, LIMITS.genreChars) || !isStr(text, LIMITS.promptChars)) return null;
  return { body: p.body, prompt: { genre, text } };
}

export function parseHistory(v: unknown): ReviewTurn[] | null {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.length > LIMITS.historyTurns) return null;
  let total = 0;
  const turns: ReviewTurn[] = [];
  for (const t of v) {
    if (!t || typeof t !== 'object') return null;
    const { role, text } = t as Record<string, unknown>;
    if ((role !== 'writer' && role !== 'reviewer') || !isStr(text, LIMITS.turnChars)) return null;
    total += text.length;
    turns.push({ role, text });
  }
  return total <= LIMITS.historyChars ? turns : null;
}

export function parsePromptRequest(v: unknown): { genre: string; wordTarget: number } | null {
  const b = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const genre = b.genre ?? 'literary';
  const wordTarget = b.wordTarget ?? 0;
  if (!isStr(genre, LIMITS.genreChars)) return null;
  if (typeof wordTarget !== 'number' || !Number.isInteger(wordTarget) || wordTarget < 0 || wordTarget > LIMITS.maxWordTarget)
    return null;
  return { genre, wordTarget };
}
