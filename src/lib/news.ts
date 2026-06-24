import { newId } from './id';
import type { Prompt } from './types';

/**
 * Lightweight news-source integration for the Journalism genre.
 *
 * Pulls current headlines and turns one into an *investigative* writing prompt —
 * the goal is to push writers past summarizing the news toward asking "what's the
 * story underneath, and how would I report it out?".
 *
 * The default source is the Hacker News front page via the Algolia API: it's
 * keyless and CORS-friendly, so it works from the browser and native with no
 * setup. Swap `HEADLINES_URL` (or proxy a fuller news API through the managed
 * backend) for broader coverage. Everything here fails soft — if the network is
 * unavailable the caller falls back to the offline journalism generator.
 */

const HEADLINES_URL = 'https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=40';

const ANGLES = [
  'Follow the money — who profits, and who quietly pays?',
  'Whose voices are missing from the coverage so far?',
  'What public records or documents would prove or disprove the claim?',
  'What is the local angle that no national outlet will chase?',
  'Who is accountable here, and have they actually been asked to answer?',
  'What is being treated as a one-off that might be a pattern?',
];

export interface Headline {
  title: string;
  url: string;
  source?: string;
}

interface RawHit {
  title?: string;
  url?: string;
}

function hostOf(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

export async function fetchHeadlines(limit = 15): Promise<Headline[]> {
  const res = await fetch(HEADLINES_URL);
  if (!res.ok) throw new Error('Could not reach the news source.');
  const data = (await res.json()) as { hits?: RawHit[] };
  const hits = Array.isArray(data.hits) ? data.hits : [];
  return hits
    .filter((h): h is Required<RawHit> => !!h.title && !!h.url && !/^(Show|Ask|Tell) HN/i.test(h.title))
    .map((h) => ({ title: h.title, url: h.url, source: hostOf(h.url) }))
    .slice(0, limit);
}

/** Fetch a current headline and frame it as an investigative prompt. */
export async function generateNewsPrompt(): Promise<Prompt> {
  const headlines = await fetchHeadlines();
  if (headlines.length === 0) throw new Error('No headlines available right now.');

  const h = headlines[Math.floor(Math.random() * headlines.length)];
  const angle = ANGLES[Math.floor(Math.random() * ANGLES.length)];

  const text =
    `In the news${h.source ? ` (${h.source})` : ''}: “${h.title}”. ` +
    `Pitch and outline the investigative follow-up no one else is doing. ${angle} ` +
    `Name the documents you’d request and two sources you’d need on the record.`;

  return {
    id: newId('news'),
    genre: 'journalism',
    text,
    tip: 'Start from a question you genuinely don’t know the answer to — then go get the documents.',
  };
}
