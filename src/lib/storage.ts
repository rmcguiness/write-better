import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Feedback, Piece, ReviewTurn } from './types';

/**
 * Local persistence for saved pieces. Uses AsyncStorage, which transparently
 * maps to localStorage on web and native storage on iOS/Android — so the same
 * code persists drafts everywhere with no backend.
 */

const PIECES_KEY = 'wb:pieces';
const SETTINGS_KEY = 'wb:settings';

export type AIMode = 'byok' | 'managed';

export interface AppSettings {
  /** How AI features are powered: the user's own key, or our managed backend. */
  aiMode?: AIMode;

  // --- BYOK (bring your own key) ---
  /** Selected provider for BYOK. */
  provider?: 'anthropic' | 'openai' | 'xai';
  /** Selected model id for the chosen provider. */
  model?: string;
  /** Per-provider API keys, stored only on this device. */
  apiKeys?: Partial<Record<'anthropic' | 'openai' | 'xai', string>>;

  // --- Managed (our backend) ---
  /** Base URL of the Write Better backend. */
  backendUrl?: string;
  /** JWT from the backend after sign-in. */
  authToken?: string;
  /** Signed-in email, for display. */
  authEmail?: string;

  /** Last filters used, so the Write screen remembers preferences. */
  lastGenre?: string;
  lastWordTarget?: number;
  lastDurationSec?: number;
}

async function readAll(): Promise<Piece[]> {
  try {
    const raw = await AsyncStorage.getItem(PIECES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Piece[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(pieces: Piece[]): Promise<void> {
  await AsyncStorage.setItem(PIECES_KEY, JSON.stringify(pieces));
}

export async function listPieces(): Promise<Piece[]> {
  const pieces = await readAll();
  return pieces.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getPiece(id: string): Promise<Piece | undefined> {
  const pieces = await readAll();
  return pieces.find((p) => p.id === id);
}

export async function savePiece(piece: Piece): Promise<void> {
  const pieces = await readAll();
  const idx = pieces.findIndex((p) => p.id === piece.id);
  const next = { ...piece, updatedAt: Date.now() };
  if (idx >= 0) pieces[idx] = next;
  else pieces.push(next);
  await writeAll(pieces);
}

export async function deletePiece(id: string): Promise<void> {
  const pieces = await readAll();
  await writeAll(pieces.filter((p) => p.id !== id));
}

export async function setFeedback(id: string, feedback: Feedback): Promise<void> {
  const piece = await getPiece(id);
  if (!piece) return;
  await savePiece({ ...piece, feedback });
}

export async function appendReview(id: string, turns: ReviewTurn[]): Promise<void> {
  const piece = await getPiece(id);
  if (!piece) return;
  await savePiece({ ...piece, review: [...(piece.review ?? []), ...turns] });
}

export async function getSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    return raw ? (JSON.parse(raw) as AppSettings) : {};
  } catch {
    return {};
  }
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const next = { ...current, ...patch };
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  return next;
}
