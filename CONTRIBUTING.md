# Contributing to Write Better

Thanks for your interest. This is a personal project maintained by one person, so reviews can take
a while, but issues and pull requests are welcome.

## Ways to help

- **Report a bug** with the bug report template. Say which platform (web, iOS, Android) and whether
  you use your own key (BYOK) or a managed account.
- **Suggest a feature** with the feature request template. Check [ROADMAP.md](./ROADMAP.md) first.
- **Add prompts or Learn content.** Prompt fragments and craft notes live in `src/lib/`. Original
  writing only, please; don't paste copyrighted text.
- **Security problems:** don't open a public issue. See [SECURITY.md](./SECURITY.md).

## Development setup

Requires Node.js 22.

```bash
npm ci
npm run web          # browser dev server
npm run ios          # iOS simulator (needs Xcode)
npm run android      # Android emulator
```

The app works without any API key. To try AI feedback, paste your own provider key in Settings, and
use a key with a spending limit. For the managed backend, see [server/README.md](./server/README.md)
and copy `server/.env.example` to `server/.env`. Stripe must stay in **test mode** for development.

This project uses Expo SDK 56. Read the versioned docs at https://docs.expo.dev/versions/v56.0.0/
before changing native or Expo code, and upgrade Expo packages with `npx expo install --fix` rather
than bumping them one by one.

## Before you open a pull request

Run the same checks CI runs:

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build:web            # static web export to dist/

cd server
npm ci
npm run typecheck
npm test
```

UI changes should also pass the Playwright suite against the static build:

```bash
EXPO_PUBLIC_WEB_DEMO=true npx expo export --platform web --clear
npx playwright install chromium   # first time only
npm run e2e
```

Tests must not call real AI providers or Stripe. Mock them, as the existing tests do.

## Pull request guidelines

- Branch from `main` and keep each PR to one change.
- Describe what changed and why, and how you tested it. Use the PR template.
- Add screenshots for UI changes, light and dark if the change affects both. Use sample text and
  mocked feedback only, never real personal writing or keys.
- Never commit API keys, `.env` files or local databases (`server/*.db`). CI runs a secret scan.
- Never put a provider key in an `EXPO_PUBLIC_*` variable; those are compiled into the bundle.
- Contributions are accepted under the [MIT License](./LICENSE).

## Code of conduct

This project follows the [Code of Conduct](./CODE_OF_CONDUCT.md). By taking part you agree to it.
