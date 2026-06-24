import { generatePromptViaBackend, gradeViaBackend, reviewViaBackend } from './api';
import { getGenre } from './genres';
import { newId } from './id';
import {
  friendlyProviderError,
  generatePromptWithProvider,
  gradeWithProvider,
  reviewWithProvider,
  type ProviderId,
} from './providers';
import type { AppSettings } from './storage';
import type { Feedback, GenreId, Piece, Prompt, ReviewTurn } from './types';

/**
 * AI orchestration layer. Screens call `gradePiece` / `peerReview` with a
 * resolved `AIConfig` and never care whether feedback comes from the user's own
 * key (BYOK) or our managed backend. Both modes degrade gracefully: if AI isn't
 * configured, `resolveAIConfig` returns null and the UI shows a connect prompt.
 */

export type AIConfig =
  | { mode: 'byok'; provider: ProviderId; model: string; apiKey: string }
  | { mode: 'managed'; backendUrl: string; token: string };

/** Resolve usable AI config from settings, or null if nothing is connected. */
export function resolveAIConfig(s: AppSettings): AIConfig | null {
  if (s.aiMode === 'managed') {
    if (s.backendUrl && s.authToken) {
      return { mode: 'managed', backendUrl: s.backendUrl, token: s.authToken };
    }
    return null;
  }
  // Default to BYOK.
  const provider = (s.provider ?? 'anthropic') as ProviderId;
  const key = s.apiKeys?.[provider];
  if (key && key.trim().length > 10) {
    return { mode: 'byok', provider, model: s.model ?? defaultModelFor(provider), apiKey: key.trim() };
  }
  return null;
}

export function isAIConfigured(s: AppSettings): boolean {
  return resolveAIConfig(s) !== null;
}

function defaultModelFor(provider: ProviderId): string {
  // Cheap sensible defaults; the picker can override.
  return provider === 'anthropic'
    ? 'claude-haiku-4-5'
    : provider === 'openai'
      ? 'gpt-4o-mini'
      : 'grok-2-latest';
}

export async function gradePiece(piece: Piece, cfg: AIConfig): Promise<Feedback> {
  try {
    if (cfg.mode === 'managed') {
      return await gradeViaBackend(cfg.backendUrl, cfg.token, piece);
    }
    return await gradeWithProvider(cfg.provider, cfg.model, cfg.apiKey, piece);
  } catch (err) {
    throw normalize(cfg, err);
  }
}

export async function peerReview(
  piece: Piece,
  history: ReviewTurn[],
  cfg: AIConfig,
): Promise<string> {
  try {
    if (cfg.mode === 'managed') {
      return await reviewViaBackend(cfg.backendUrl, cfg.token, piece, history);
    }
    return await reviewWithProvider(cfg.provider, cfg.model, cfg.apiKey, piece, history);
  } catch (err) {
    throw normalize(cfg, err);
  }
}

/**
 * Generate a fresh, AI-tailored prompt for a genre. Falls back to nothing —
 * callers keep the instant offline generator for when AI isn't configured.
 */
export async function generateAIPrompt(
  genre: GenreId,
  wordTarget: number,
  cfg: AIConfig,
): Promise<Prompt> {
  const info = getGenre(genre);
  try {
    const raw =
      cfg.mode === 'managed'
        ? await generatePromptViaBackend(cfg.backendUrl, cfg.token, genre, wordTarget)
        : await generatePromptWithProvider(cfg.provider, cfg.model, cfg.apiKey, info.label, info.blurb, wordTarget);
    return { id: newId('prompt'), genre, text: raw.text, tip: raw.tip };
  } catch (err) {
    throw normalize(cfg, err);
  }
}

/** Managed errors already carry user-facing messages; BYOK errors are mapped. */
function normalize(cfg: AIConfig, err: unknown): Error {
  if (cfg.mode === 'managed') {
    return err instanceof Error ? err : new Error('Something went wrong.');
  }
  return friendlyProviderError(err);
}
