/**
 * Core data model for Write Better.
 * Everything the app persists flows through these types.
 */

export type GenreId =
  | 'flashfiction'
  | 'literary'
  | 'scifi'
  | 'fantasy'
  | 'mystery'
  | 'horror'
  | 'romance'
  | 'poetry'
  | 'memoir'
  | 'journaling' // internal id for the "Personal" genre (kept for data stability)
  | 'journalism'
  | 'persuasive'
  | 'essay';

export interface Genre {
  id: GenreId;
  label: string;
  emoji: string;
  blurb: string;
  /** Accent color used for chips and prompt cards. */
  accent: string;
}

export interface Prompt {
  id: string;
  genre: GenreId;
  text: string;
  /** Optional craft tip surfaced alongside the prompt. */
  tip?: string;
}

/** A single saved writing session. */
export interface Piece {
  id: string;
  prompt: Prompt;
  title: string;
  body: string;
  wordTarget: number;
  wordCount: number;
  /** Timer length the writer chose, in seconds (0 = no timer). */
  durationSec: number;
  /** Actual seconds spent writing. */
  elapsedSec: number;
  createdAt: number;
  updatedAt: number;
  feedback?: Feedback;
  /** Threaded peer-review conversation with the AI reviewer. */
  review?: ReviewTurn[];
}

export interface ScoreLine {
  label: string;
  score: number;
  max: number;
}

/** Structured AI grade for a piece. */
export interface Feedback {
  /** Overall score out of 100. */
  overall: number;
  /** Letter grade derived from `overall`. */
  grade: string;
  scores: ScoreLine[];
  summary: string;
  strengths: string[];
  improvements: string[];
  lineNotes: { quote: string; note: string }[];
  model: string;
  createdAt: number;
}

export type ReviewRole = 'writer' | 'reviewer';

export interface ReviewTurn {
  role: ReviewRole;
  text: string;
  createdAt: number;
}
