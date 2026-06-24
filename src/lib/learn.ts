/**
 * Seeded education-center content. Plain-text bodies with a tiny markup:
 * lines beginning with "## " are subheadings, "- " are bullets, blank lines
 * separate paragraphs. The Learn screens render this without a markdown dep.
 */

export interface Lesson {
  id: string;
  title: string;
  emoji: string;
  minutes: number;
  summary: string;
  category: 'Craft' | 'Process' | 'Genre' | 'Journalism';
  body: string;
}

export const LESSONS: Lesson[] = [
  {
    id: 'show-dont-tell',
    title: 'Show, Don’t Tell',
    emoji: '🪟',
    minutes: 4,
    category: 'Craft',
    summary: 'Turn stated emotions into evidence the reader can feel.',
    body: `"Telling" hands the reader a conclusion. "Showing" hands them the evidence and lets them reach it themselves — which makes it theirs.

## The difference
Telling: "She was nervous."
Showing: "She read the same line three times, then set the letter face-down."

The second version never names the feeling, yet you feel it more.

## How to do it
- Replace an emotion word with a physical detail, action, or specific image.
- Trust the reader. If the evidence is clear, you don’t need the label too.
- Use the senses — what does the moment look, sound, or smell like?

## When telling is right
Showing everything is exhausting and slow. Tell to move quickly through unimportant stretches ("Three years passed"), and show at the moments that matter most.`,
  },
  {
    id: 'strong-verbs',
    title: 'Verbs Do the Work',
    emoji: '⚙️',
    minutes: 3,
    category: 'Craft',
    summary: 'Precise verbs beat adjective-and-adverb pileups.',
    body: `Weak prose leans on adjectives and adverbs to prop up vague verbs. Strong prose picks a verb that already carries the meaning.

## Examples
- "walked quickly" → "hurried", "strode", "marched"
- "said angrily" → "snapped", "barked"
- "looked at carefully" → "studied", "examined"

## The rule of thumb
When you find an adverb, ask whether a better verb could absorb it. Often one word can replace three and hit harder.

## Watch for "was" + -ing
"She was running" is weaker than "She ran." The simple past is more immediate. Reserve the continuous form for when the ongoing-ness actually matters.`,
  },
  {
    id: 'first-lines',
    title: 'Earning the First Line',
    emoji: '🎣',
    minutes: 4,
    category: 'Craft',
    summary: 'Openings promise a question. Make the reader need the answer.',
    body: `A great opening doesn’t explain — it creates a question the reader must keep reading to resolve.

## Strong openings tend to
- Drop us into a specific moment, not a summary.
- Imply a situation slightly off-balance.
- Use concrete nouns over abstractions.

## A quick test
Read your first sentence and ask: "Does this make me want to read the second?" If not, you may have written a warm-up. Try deleting the first sentence — the real opening is often line two or three.

## Avoid
- Waking up / alarm clocks (unless something is truly wrong).
- Weather reports with no stakes.
- Long throat-clearing before anything happens.`,
  },
  {
    id: 'revision-passes',
    title: 'Revise in Passes',
    emoji: '🔁',
    minutes: 5,
    category: 'Process',
    summary: 'Don’t fix everything at once. Layer your edits.',
    body: `Trying to fix structure, sentences, and typos in one read is how revision stalls. Separate the jobs.

## A simple order
1. Structure: Does each scene or paragraph earn its place? Cut what doesn’t move things forward.
2. Clarity: Is every sentence saying one thing clearly?
3. Rhythm: Read aloud. Vary sentence length. Fix anything you stumble over.
4. Polish: Word choice, grammar, typos — last.

## Why it works
Each pass has one question, so your attention isn’t split. You also avoid polishing a sentence you’re about to cut.

## Read it aloud
Your ear catches what your eye glides past — clunky rhythm, repeated words, sentences that run out of breath.`,
  },
  {
    id: 'beat-the-blank-page',
    title: 'Beating the Blank Page',
    emoji: '🚀',
    minutes: 4,
    category: 'Process',
    summary: 'Lower the stakes and start badly on purpose.',
    body: `The blank page is intimidating because you’re trying to write *well* before you’ve written *anything*. Separate drafting from judging.

## Tactics
- Set a timer and write without stopping — no backspacing. (That’s what the Write tab’s timer is for.)
- Give yourself permission to write a bad first draft. You can’t edit a blank page.
- Start in the middle. You don’t have to write the opening first.
- Lower the goal. "One ugly paragraph" is easier to start than "a great story."

## Keep the hand moving
Momentum beats perfection. The editor in your head is useful later — silence it while drafting.`,
  },
  {
    id: 'investigative-101',
    title: 'Investigative Journalism 101',
    emoji: '🔎',
    minutes: 6,
    category: 'Journalism',
    summary: 'What separates investigation from reporting — and how to start one.',
    body: `Daily reporting tells you what happened. Investigative journalism reveals what someone didn’t want known — and proves it. The difference is original digging, not access.

## Start with a question, not a conclusion
A good investigation begins with a falsifiable question: "Is the city paying twice for the same work?" Not "I think the mayor is corrupt." Let the evidence decide.

## The investigative mindset
- Assume documents exist for almost everything. Budgets, contracts, inspections, emails, court filings.
- Patterns matter more than incidents. One late inspection is a story; fifty is an investigation.
- "Follow the money" is a cliché because it works. Who pays, who benefits, who decides.

## A first move
Pick something you can actually check this week: a public budget line, a contract, a set of inspection records. Compare what officials say with what the records actually show. The gap is your story.

## Protect people
Sources can be vulnerable. Understand on-the-record vs. on background before you promise anything, and never expose someone who didn’t agree to it. See the ‘Sources & Verification’ note.`,
  },
  {
    id: 'sourcing-and-verification',
    title: 'Sources & Verification',
    emoji: '🧷',
    minutes: 6,
    category: 'Journalism',
    summary: 'Two independent sources, on the record, and the document beats the quote.',
    body: `A claim isn’t a fact until you’ve verified it. Verification is the whole job.

## The two-source rule
Don’t publish a factual claim on a single source unless it’s a document you can see. Two *independent* sources — people who don’t share an interest or a boss — make it solid.

## On the record vs. background
- **On the record:** you can quote them by name. Always the goal.
- **On background:** usable, but not by name — agree on exactly how you’ll attribute it *before* the conversation.
- **Off the record:** can’t use it at all. Be sure you both mean the same thing by the term.

## The document beats the quote
A person can be wrong or lying. A contract, an email, or an inspection report is evidence. Build the story around what you can prove on paper, and use people to explain what the documents mean.

## Always seek comment
Before you publish, give the subject a real chance to respond. Their answer — or their silence — belongs in the story, and it’s both fair and a defense against getting it wrong.`,
  },
  {
    id: 'public-records',
    title: 'Public Records & FOIA',
    emoji: '🗂️',
    minutes: 5,
    category: 'Journalism',
    summary: 'How to pry loose the documents that prove the story.',
    body: `Most accountability journalism runs on records the public has a right to see. In the U.S. that’s FOIA (federal) and state open-records laws; most countries have an equivalent.

## Before you file
- Search what’s already public — agency websites, meeting minutes, court dockets, budgets.
- Identify the specific record, the agency that holds it, and a date range. Narrow requests get answered faster.

## Writing the request
- Be specific but not so narrow you miss the key document. Name file types (emails, invoices, calendars).
- Cite the law and ask for a fee waiver if you’re acting in the public interest.
- Set a tracking system — agencies have deadlines, and you should hold them to it.

## When they say no
Denials are often negotiable. Ask which exemption they’re citing, narrow the request, or appeal. A partial release plus a fight over the rest is normal.

## Build the story around the paper
Once the documents arrive, make a timeline, flag the anomalies, and report out the gaps. The records are the spine; reporting is the muscle. See the ‘Sources & Verification’ note.`,
  },
  {
    id: 'dialogue',
    title: 'Dialogue That Breathes',
    emoji: '💬',
    minutes: 5,
    category: 'Genre',
    summary: 'Real dialogue is compressed, oblique, and full of want.',
    body: `Good dialogue isn’t transcribed speech — it’s the interesting parts, shaped. Every line should do at least one job: reveal character, build tension, or move the story.

## Principles
- People rarely answer the question they’re asked. Let characters dodge and deflect.
- Cut the small talk. Start the scene as late as possible.
- "Said" is invisible — use it. Avoid "he expostulated." Let the words carry the tone.
- Give each character a distinct rhythm and vocabulary.

## Subtext is the point
What’s *not* said carries the charge. Two people arguing about the dishes are often arguing about something else entirely. Write the surface; imply the depth.`,
  },
];

export function getLesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}
