Run the app's pure TypeScript tests with `npm test`, and backend tests with
`cd server && npm test`. Both use Vitest in Node; no simulator is needed.

The app suite only includes `src/lib/**/*.test.ts`. Provider tests replace both
AI SDK clients, and the news tests explicitly stub fetch. Unexpected fetch calls
fail by default. Backend tests alias the configuration module to fake values in
`server/tests/env.ts` before application code loads, so they never load `.env`
or deployment credentials. SQLite uses an independent in-memory database for each
test file. Stripe webhook tests use locally signed fixtures, with no Stripe API
requests. Route tests import `server/src/app.ts`; only `index.ts` opens a listener.

Feedback parsing tests deliberately preserve the current behavior: malformed JSON
throws, missing fields are not validated locally, and scores are not clamped.
Provider JSON schemas remain responsible for the response shape. The offline
prompt generator has no word-target argument; AI prompt tests verify that a
positive target is included in the request instructions.

CI also runs `npm run lint`, `npx tsc --noEmit`,
`npx expo export --platform web`, and the server's `npm run typecheck`.
