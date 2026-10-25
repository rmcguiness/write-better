# Write Better

A cross-platform app (iOS, Android, and web from one codebase) that helps people become better writers through deliberate practice.

Built with **Expo (React Native) + Expo Router + TypeScript**.

## What it does

**1. The writing experience (core)**
- Auto-generated, genre-aware prompts (works fully offline) from a large pool of composable fragments — plus an optional **✨ AI prompt** that tailors a fresh prompt to your genre and word target
- 13 genres including **Journalism** (investigative) and **Personal** (reflective journaling). The Journalism genre adds a **📰 Headline** button that pulls a current news headline and frames it as an investigative assignment
- Compact **dropdown filters** (genre · length · timer) on a single line
- Distraction-free editor with a live word count, progress bar, and countdown timer
- Finished pieces are saved locally (AsyncStorage → localStorage on web)

**2. AI feedback (optional)**
- Structured grading across craft, structure, originality, and prompt response, with quoted line notes
- A back-and-forth "peer review" conversation with an AI writing partner
- Two ways to power it, chosen in **Settings**:
  - **Bring your own key (BYOK)** — paste a key from **Anthropic (Claude)**, **OpenAI (ChatGPT)**, or **xAI (Grok)**; the app calls the provider directly.
  - **Use my account (managed)** — sign in to the [backend](server/), which holds the keys, meters usage, enforces a monthly quota, and bills via Stripe.
- On managed plans the app shows **remaining AI uses this month** and prompts you to upgrade when you hit the limit.
- Either way the app is fully usable without AI configured (offline prompts, your own writing).

**3. Learn**
- A small library of practical craft notes (show-don't-tell, strong verbs, revision passes, …)
- An **investigative journalism** track: Investigative Journalism 101, Sources & Verification, and Public Records & FOIA

## Run it

```bash
npm install
npm run web      # browser
npm run ios      # iOS simulator (needs Xcode)
npm run android  # Android emulator
```

## Project layout

```
src/
  app/                     # Expo Router routes (file-based)
    (tabs)/                # Write · Library · Learn
    session.tsx            # full-screen timed writing session
    piece/[id].tsx         # saved piece + AI grade + peer review
    learn/[id].tsx         # lesson detail
    settings.tsx           # API key
  lib/                     # data layer (no UI)
    genres.ts, prompts.ts  # prompt generator
    storage.ts             # local persistence
    ai.ts                  # pluggable Claude API service
    learn.ts               # seeded lessons
  lib/
    providers.ts           # multi-provider abstraction (Anthropic/OpenAI/xAI) for BYOK
    api.ts                 # client for the managed backend
    ai.ts                  # routes grade/review to BYOK or managed
  components/ui/           # Button, Card, Chip
  constants/theme.ts       # colors, spacing, fonts (light + dark)

server/                    # managed backend (Hono + SQLite + Stripe) — see server/README.md
```

## The two AI modes

- **BYOK:** keys live only on-device and go straight to the chosen provider.
  Great for power users; no backend required.
- **Managed:** the [`server/`](server/) backend holds your provider keys, so end
  users never need their own. It authenticates users, meters usage, enforces
  per-plan monthly quotas, and bills via Stripe. Run it with `cd server && npm
  install && npm run dev`, then point the app's **Settings → Use my account** at
  it.

`src/lib/ai.ts` hides which mode is active, so screens never care where feedback
comes from.

## Security

Please report vulnerabilities privately; see [SECURITY.md](./SECURITY.md). Never commit real
API keys or `.env` files. The managed backend's configuration is described in
[server/README.md](./server/README.md) and `server/.env.example`.

## License

[MIT](./LICENSE) © 2026 Ryan McGuiness. The project was bootstrapped from the
`create-expo-app` template (© 650 Industries, Inc., MIT).

## Static web demo

Run `npm run build:web`, then `node scripts/serve-web.mjs` to preview `dist/` at
http://127.0.0.1:4173. The static server resolves exported `.html` routes and
saved-piece/lesson deep links. No managed backend is needed.

Web defaults to BYOK-only when `EXPO_PUBLIC_MANAGED_SERVER_URL` is absent.
`EXPO_PUBLIC_WEB_DEMO=true` explicitly forces this mode even when that URL is
configured. These are build-time settings. Never put provider keys in build-time
variables: users enter their own keys in Settings. Native managed mode is unchanged.

Prompts, sessions, Library, and Learn work without an AI key. AI requests go
directly to the selected provider; browsers store keys in unencrypted localStorage.
iOS/Android use SecureStore, migrating old settings keys on first read and removing
the plaintext copy only after successful storage. Native builds must include the
new SecureStore plugin.

Run `npm run e2e` after exporting. Install Chromium with
`npx playwright install --with-deps chromium` if needed. Tests block external
requests and mock provider responses using obviously fake keys. CI exports and
runs these tests separately, retaining the Playwright report on failure.
