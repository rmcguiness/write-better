import type { Genre, GenreId } from "./types";

export const GENRES: Genre[] = [
  {
    id: "flashfiction",
    label: "Flash Fiction",
    emoji: "⚡",
    blurb: "Tiny, complete stories",
    accent: "#F59E0B",
  },
  {
    id: "literary",
    label: "Literary",
    emoji: "📖",
    blurb: "Character & language first",
    accent: "#6366F1",
  },
  {
    id: "journalism",
    label: "Journalism",
    emoji: "📰",
    blurb: "Report and investigate",
    accent: "#475569",
  },
  {
    id: "scifi",
    label: "Sci-Fi",
    emoji: "🚀",
    blurb: "Ideas, futures, what-ifs",
    accent: "#06B6D4",
  },
  {
    id: "fantasy",
    label: "Fantasy",
    emoji: "🐉",
    blurb: "Magic and other worlds",
    accent: "#8B5CF6",
  },
  {
    id: "mystery",
    label: "Mystery",
    emoji: "🕵️",
    blurb: "Clues, tension, reveals",
    accent: "#0EA5E9",
  },
  {
    id: "horror",
    label: "Horror",
    emoji: "🕯️",
    blurb: "Dread and the uncanny",
    accent: "#EF4444",
  },
  {
    id: "romance",
    label: "Romance",
    emoji: "💌",
    blurb: "Connection and longing",
    accent: "#EC4899",
  },
  {
    id: "poetry",
    label: "Poetry",
    emoji: "🪶",
    blurb: "Image, rhythm, compression",
    accent: "#14B8A6",
  },
  {
    id: "memoir",
    label: "Memoir",
    emoji: "🧭",
    blurb: "True moments from life",
    accent: "#F97316",
  },
  // `journaling` id kept stable; label is now "Diary".
  {
    id: "journaling",
    label: "Diary",
    emoji: "🌤️",
    blurb: "Reflect, vent, unblock",
    accent: "#22C55E",
  },

  {
    id: "persuasive",
    label: "Persuasive",
    emoji: "📣",
    blurb: "Argue and convince",
    accent: "#E11D48",
  },
  {
    id: "essay",
    label: "Essay",
    emoji: "✍️",
    blurb: "Explore an idea",
    accent: "#3B82F6",
  },
];

export const GENRE_MAP: Record<GenreId, Genre> = GENRES.reduce(
  (acc, g) => {
    acc[g.id] = g;
    return acc;
  },
  {} as Record<GenreId, Genre>,
);

export function getGenre(id: GenreId): Genre {
  return GENRE_MAP[id] ?? GENRES[0];
}
