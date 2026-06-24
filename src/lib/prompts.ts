import type { GenreId, Prompt } from './types';
import { GENRES } from './genres';

/**
 * A lightweight, fully-offline prompt generator.
 *
 * Each genre composes a prompt from interchangeable fragments so the writer
 * gets a fresh, surprising starting point every time — no network required.
 * When the AI layer is connected it can override this with a model-generated
 * prompt, but this guarantees the core experience always works.
 */

function rand<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const CHARACTERS = [
  'a lighthouse keeper', 'a retired cartographer', 'a night-shift nurse',
  'a child who never sleeps', 'a disgraced chess champion', 'a translator of dead languages',
  'a beekeeper', 'a war photographer', 'a small-town locksmith', 'an understudy who never goes on',
  'a deep-sea welder', 'a museum guard', 'a fortune teller who lies', 'a clockmaker losing their sight',
  'a piano tuner with perfect pitch', 'a border-town smuggler', 'a hospice volunteer',
  'a failed astronaut', 'a taxidermist', 'a competitive memory champion', 'a snowplow driver',
  'a forger of old maps', 'a marriage counselor on the brink of divorce', 'a lottery winner who hides it',
  'a sign-language interpreter', 'a retired stage magician', 'a long-haul trucker who collects voicemails',
  'a apprentice undertaker', 'a storm chaser', 'a night watchman at an empty mall',
];

const SITUATIONS = [
  'discovers a door that was not there yesterday',
  'receives a letter meant for someone long dead',
  'must return something they should never have taken',
  'is the last person to remember a vanished town',
  'agrees to keep a secret that grows heavier each day',
  'finds their own name in a stranger’s diary',
  'is given exactly one hour to change their mind',
  'wakes to find the world a single degree off true',
  'inherits a house that remembers more than they do',
  'is mistaken for someone far more dangerous',
  'must finish a task a dead friend left unfinished',
  'realizes the photograph has changed since yesterday',
  'is offered everything they wanted, with one impossible condition',
  'keeps meeting the same stranger in different cities',
  'finds a phone that only rings at 3 a.m.',
  'is asked to forgive something unforgivable',
  'has to choose which version of the truth to tell',
  'notices the neighbors have started copying their life',
];

const CONSTRAINTS = [
  'Tell it without naming the central emotion.',
  'Begin at the end and work backward.',
  'Use no dialogue at all.',
  'Let an object carry the whole story.',
  'Write it as a single unbroken scene.',
  'Make the weather a character.',
  'End on an image, not an explanation.',
  'Reveal the stakes only in the final line.',
  'Write entirely in second person.',
  'Set the whole thing in under ten minutes of real time.',
  'Use only one location.',
  'Never describe the main character directly.',
  'Let the title do half the work.',
  'Tell it through a list, a form, or a set of instructions.',
  'Withhold one fact until it changes everything.',
];

const POETRY_SEEDS = [
  'the exact moment a habit becomes a memory',
  'a color you have never had words for',
  'the last warm day of the year',
  'an apology you rehearsed but never gave',
  'the sound of a house settling at night',
  'hands — yours, or someone you watched',
  'a map of a place that no longer exists',
  'the space between a question and its answer',
  'the weight of a name you no longer use',
  'something you keep meaning to throw away',
  'the light in a room after someone leaves it',
  'a word in another language with no translation',
  'the inventory of a junk drawer',
  'what the body remembers that the mind forgot',
];

const POETRY_FORMS = [
  'Write in couplets.', 'Repeat one line three times, changed slightly each time.',
  'Keep every line under seven words.', 'Use only present tense.',
  'Build the whole poem from a single extended metaphor.', 'No similes — only direct images.',
  'Let each stanza begin with the same word.', 'End on a question.',
  'Use no punctuation at all.', 'Write it as a single sentence broken into lines.',
];

const JOURNAL_PROMPTS = [
  'What did today cost you, and was it worth it?',
  'Describe a small thing you noticed that no one else did.',
  'Write a letter to yourself one year from now.',
  'What are you pretending not to know?',
  'Name something you are ready to put down.',
  'Describe your day as if it were weather.',
  'What would you do differently if no one would ever find out?',
  'Catalog three ordinary things you would miss.',
  'What advice would you give the version of you from five years ago?',
  'Write about a decision you keep re-making in your head.',
  'What did you want today, and what did you do about it?',
  'Describe the room you feel most yourself in.',
  'What are you carrying that isn’t yours to carry?',
  'List what went right today, in detail.',
];

const MEMOIR_SEEDS = [
  'a meal that meant more than the food',
  'the first time you understood your parents were people',
  'a place you can no longer return to',
  'a moment you knew a friendship had ended',
  'a small act of courage no one saw',
  'the object you would save from a fire',
  'a lesson learned the slow, hard way',
  'the first time you felt like an adult',
  'a stranger who changed your day, or your life',
  'a goodbye you didn’t know was the last one',
  'a job that taught you something other than the job',
  'the moment you stopped believing something you were sure of',
];

const ESSAY_QUESTIONS = [
  'Is it possible to be too honest?',
  'What does a city owe the people who leave it?',
  'When is forgetting a kindness?',
  'Does effort matter if no one sees it?',
  'What have we lost by making everything convenient?',
  'Can a place feel like home before you live there?',
  'Is curiosity a virtue or an appetite?',
  'What do we actually owe our future selves?',
  'Is privacy a right or a luxury?',
  'Can a person change, or only their circumstances?',
  'What is the difference between a habit and a value?',
  'Is nostalgia a kind of lying?',
];

const PERSUASIVE_CLAIMS = [
  'Boredom should be protected, not eliminated.',
  'Every school should teach how to be wrong gracefully.',
  'The most useful skill of the next decade will be attention.',
  'We owe more to strangers than we admit.',
  'Cities should be designed for people who are tired.',
  'Failure should be on every résumé.',
  'Slowness is an underrated form of intelligence.',
  'Most meetings are a tax on the people doing the work.',
  'Public libraries are the most radical institution we have.',
  'Convenience has a hidden cost we refuse to price in.',
  'Everyone should learn to repair at least one thing they own.',
  'Anonymity online does more good than harm.',
];

const TIPS = [
  'Specifics beat adjectives — name the brand, the street, the exact hour.',
  'Cut the first sentence; you usually wrote it to warm up.',
  'Let the reader do some work. Trust the gap.',
  'Strong verbs do the lifting adverbs only describe.',
  'Read it aloud once. Your ear catches what your eye misses.',
  'A scene needs a want and an obstacle. Find both.',
  'Concrete nouns ground abstract feelings.',
  'End sentences on the strongest word.',
  'If two words mean the same thing, keep the shorter one.',
  'Start as late into the scene as you can.',
  'One vivid detail beats five vague ones.',
  'Dialogue is best when nobody quite answers the question.',
];

function fictionPrompt(genre: GenreId, flavor: string): string {
  const who = rand(CHARACTERS);
  const what = rand(SITUATIONS);
  const how = rand(CONSTRAINTS);
  return `${cap(who)} ${what}.${flavor ? ` ${flavor}` : ''} ${how}`;
}

const FLAVORS: Partial<Record<GenreId, string[]>> = {
  scifi: [
    'It is forty years from now and one technology has quietly changed everything.',
    'The setting is a generation ship, three centuries into the voyage.',
    'A new law of physics was discovered last spring.',
    'Memory can now be bought, sold, and stolen.',
    'Earth got a reply, and it was only one word.',
  ],
  fantasy: [
    'Magic in this world always demands an equal, personal price.',
    'The old gods have begun answering prayers again — literally.',
    'This is the last city where the maps still work.',
    'Every person is born knowing the exact day they will die.',
    'The forest has started taking back the roads.',
  ],
  mystery: [
    'Something is missing, and only they have noticed.',
    'Everyone is telling a slightly different version of the same night.',
    'The clue everyone overlooked is hiding in plain sight.',
    'The alibi is perfect, which is the problem.',
    'The victim mailed a letter the morning they vanished.',
  ],
  horror: [
    'The wrongness is small at first — almost reasonable.',
    'No one else can hear it yet.',
    'The house has been patient.',
    'The instructions were very clear about what not to do.',
    'It only happens when they look away.',
  ],
  romance: [
    'They have exactly one reason to keep their distance.',
    'It is the wrong time, the wrong place, the right person.',
    'Neither will say the thing first.',
    'They keep being thrown together by a job neither can quit.',
    'One of them is leaving in a week.',
  ],
  literary: [
    'Nothing dramatic happens, and everything changes.',
    'The whole story turns on a single decision made in a doorway.',
    'Two people want the same thing for opposite reasons.',
    'An ordinary afternoon quietly divides a life into before and after.',
  ],
  flashfiction: [
    'You have under 500 words — every sentence must earn its place.',
    'Make the ending recolor everything before it.',
    'Give us a whole life in a single moment.',
  ],
};

// --- Journalism: investigative beats, leads, and methods ---------------------

const JOURNALISM_BEATS = [
  'city hall', 'the county budget office', 'the local school district', 'a regional hospital',
  'the police department', 'a fast-growing housing developer', 'the water utility',
  'a politician’s campaign fund', 'a factory with a spotty safety record', 'a university’s endowment',
  'the local jail', 'a nonprofit’s books', 'the zoning board', 'a public pension fund',
  'the transit authority', 'a private prison contractor',
];

const JOURNALISM_LEADS = [
  'a no-bid contract awarded overnight',
  'a sudden spike in complaints no one is logging',
  'a building that keeps failing inspections but never closes',
  'public money that landed somewhere unexpected',
  'an official who keeps recusing themselves',
  'records that went missing right after a request',
  'overtime pay that doubled in a single quarter',
  'a settlement quietly paid and then sealed',
  'a vendor that shares an address with a board member',
  'a safety report that was finished but never released',
];

const JOURNALISM_METHODS = [
  'Follow the money: trace who pays and who benefits.',
  'File a public-records request and build the story around the documents.',
  'Find the people affected and let them speak on the record.',
  'Compare what officials say with what the data actually shows.',
  'Build a timeline and find the gap no one wants to explain.',
  'Map the network — who knows whom, and who profits.',
];

const JOURNALISM_TIPS = [
  'Attribute everything — the reader should always know how you know.',
  'Two independent sources before you publish a claim as fact.',
  'The document beats the quote. Get the paper trail.',
  'Always seek comment from the subject; their answer — or silence — is part of the story.',
  'Show the receipts: cite or link every record.',
  'Lead with the finding, not the process.',
];

/** Build a self-contained investigative journalism prompt (no network). */
export function localJournalismPrompt(): { text: string; tip: string } {
  const text =
    `A tip reaches your newsroom: ${rand(JOURNALISM_LEADS)} at ${rand(JOURNALISM_BEATS)}. ` +
    `Report it out as an investigative story. ${rand(JOURNALISM_METHODS)} ` +
    `Verify every claim with at least two independent sources, and seek comment before you publish.`;
  return { text, tip: rand(JOURNALISM_TIPS) };
}

export function generatePrompt(genre: GenreId): Prompt {
  const id = `${genre}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  let text: string;
  let tip = rand(TIPS);

  switch (genre) {
    case 'poetry':
      text = `Write a poem about ${rand(POETRY_SEEDS)}. ${rand(POETRY_FORMS)}`;
      break;
    // `journaling` is the internal id for the "Personal" genre (kept stable so
    // existing saved pieces still resolve).
    case 'journaling':
      text = rand(JOURNAL_PROMPTS);
      break;
    case 'memoir':
      text = `Write about ${rand(MEMOIR_SEEDS)}. Put us in the room — sights, sounds, and what you didn’t say.`;
      break;
    case 'essay':
      text = `${rand(ESSAY_QUESTIONS)} Take a position and earn it with a real example.`;
      break;
    case 'persuasive':
      text = `Argue this, even if you’re not sure you believe it: “${rand(PERSUASIVE_CLAIMS)}” Anticipate the strongest objection and answer it.`;
      break;
    case 'journalism': {
      const j = localJournalismPrompt();
      text = j.text;
      tip = j.tip;
      break;
    }
    default: {
      const flavor = FLAVORS[genre] ? rand(FLAVORS[genre]!) : '';
      text = fictionPrompt(genre, flavor);
    }
  }

  return { id, genre, text, tip };
}

/** Generate a prompt for a randomly chosen genre. */
export function generateSurprisePrompt(): Prompt {
  const genre = rand(GENRES).id;
  return generatePrompt(genre);
}
