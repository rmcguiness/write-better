# Write Better — Managed Backend

A small backend so users can use AI features **without** their own API key. It
holds your provider keys, authenticates users, meters usage, enforces per-plan
monthly and daily caps, and bills via Stripe.

Stack: **Hono** (HTTP) · **better-sqlite3** (storage) · **Stripe** (billing) ·
Anthropic / OpenAI / xAI SDKs (the AI itself).

## Run it locally

```bash
cd server
cp .env.example .env        # then fill in the values below
npm install
npm run dev                 # http://localhost:8787
```

Point the app at it: in **Settings → Use my account**, set the server URL to
`http://localhost:8787` and create an account.

## Configuration (`.env`)

| Var | What it's for |
|---|---|
| `JWT_SECRET` | Signs login tokens. At least 32 random characters; required when `NODE_ENV=production`. |
| `CORS_ORIGINS` | Comma-separated browser origins allowed to call the API (production default: `APP_URL`'s origin). |
| `TRUST_PROXY` | `1` only behind your own reverse proxy, so rate limits use `X-Forwarded-For`. |
| `AUTH_RATE_LIMIT_PER_MINUTE` / `AI_RATE_LIMIT_PER_MINUTE` | In-memory per-IP (auth) and per-user (AI) burst limits. `0` disables. |
| `AI_IP_RATE_LIMIT_PER_MINUTE` | In-memory per-IP burst limit on AI routes across all accounts (default 60). Uses `X-Forwarded-For` only with `TRUST_PROXY=1`. |
| `AI_PROVIDER` / `AI_MODEL` | Which model the service uses for everyone (`anthropic`/`openai`/`xai`). Default `claude-haiku-4-5` keeps cost low. |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `XAI_API_KEY` | Your provider key — only the one matching `AI_PROVIDER` is required. |
| `FREE_MONTHLY_LIMIT` / `PRO_MONTHLY_LIMIT` | AI uses (grades, review replies, AI prompts) included per UTC month. Defaults 10 / 300. |
| `FREE_DAILY_LIMIT` / `PRO_DAILY_LIMIT` | AI uses allowed per UTC day. Defaults 10 / 50. |
| `STRIPE_*` | Billing. Leave blank to run without payments (everyone stays on Free). |

## Endpoints

| Method | Path | Notes |
|---|---|---|
| `POST` | `/auth/signup` · `/auth/login` | `{ email, password }` → `{ token, account }` |
| `GET` | `/me` | auth → `{ account }` |
| `POST` | `/feedback/grade` | auth, metered → `{ feedback }` |
| `POST` | `/feedback/review` | auth, metered → `{ reply }` |
| `POST` | `/billing/checkout` · `/billing/portal` | auth → `{ url }` |
| `POST` | `/billing/webhook` | Stripe → updates plan |

## Usage caps

Every plan is capped, including Pro, so one account can't run up an unbounded
provider bill. Caps must be whole numbers `>= 0`. A value like `-1` or
`unlimited` is rejected with a warning, and the default is used instead. The
default numbers are placeholders until pricing is decided. Set them from your
provider's per-request cost and the price you charge.

An AI use is reserved in the same SQLite transaction that checks the caps,
before the provider is called. It is released if the provider call fails, so
parallel requests can't overshoot the cap and failed calls don't count.

| Status | `code` | Meaning |
|---|---|---|
| `402` | `quota_exceeded` | Monthly or daily cap reached. The body includes `scope` (`month`/`day`), `plan`, `limit`, `resetsAt` (ISO), `canUpgrade`, and a readable `error`. |
| `429` | `rate_limited` | Too many requests in a minute (per account or per IP). Includes `retryAfter` (seconds) and a `Retry-After` header. |

The app shows the remaining allowance on the home screen and on each piece. When
a cap is hit, it shows which cap and when it resets. It offers an upgrade only
when that would actually help (`canUpgrade`). `GET /me` returns
`usage.used/limit/resetsAt` for the month and `usage.today` for the day.

The in-memory rate limiters are per server instance. The caps live in the
database, so they hold across restarts.

## Enabling billing (Stripe test mode)

1. In the Stripe dashboard, create a **recurring Price** for the Pro plan → put
   its id in `STRIPE_PRICE_ID`, and your secret key in `STRIPE_SECRET_KEY`.
2. Forward webhooks while developing:
   ```bash
   stripe listen --forward-to localhost:8787/billing/webhook
   ```
   Put the printed signing secret in `STRIPE_WEBHOOK_SECRET`.
3. Upgrades flow: app → `/billing/checkout` → Stripe Checkout → webhook flips the
   user to `pro` → the Pro caps apply.

## Production notes

- Run with `NODE_ENV=production`, HTTPS only, and a strong `JWT_SECRET`.
- Quota is reserved atomically before each AI call and refunded if the provider call fails.
- Add an edge rate limit, email verification and a provider spending cap before open sign-ups.

- Swap `better-sqlite3` for Postgres (the `db.ts` interface is small).
- Put it behind HTTPS; set a real `JWT_SECRET` and `APP_URL`.
- Consider rate-limiting `/auth/*` and adding email verification.
