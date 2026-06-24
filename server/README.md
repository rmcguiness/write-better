# Write Better — Managed Backend

A small backend so users can use AI features **without** their own API key. It
holds your provider keys, authenticates users, meters usage, enforces per-plan
monthly quotas, and bills via Stripe.

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
| `JWT_SECRET` | Signs login tokens. Use a long random string in prod. |
| `AI_PROVIDER` / `AI_MODEL` | Which model the service uses for everyone (`anthropic`/`openai`/`xai`). Default `claude-haiku-4-5` keeps cost low. |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `XAI_API_KEY` | Your provider key — only the one matching `AI_PROVIDER` is required. |
| `FREE_MONTHLY_LIMIT` / `PRO_MONTHLY_LIMIT` | Included feedbacks per month per plan (`-1` = unlimited). |
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

A `402` from a feedback route means the user hit their monthly quota — the app
surfaces that as an upgrade prompt.

## Enabling billing (Stripe test mode)

1. In the Stripe dashboard, create a **recurring Price** for the Pro plan → put
   its id in `STRIPE_PRICE_ID`, and your secret key in `STRIPE_SECRET_KEY`.
2. Forward webhooks while developing:
   ```bash
   stripe listen --forward-to localhost:8787/billing/webhook
   ```
   Put the printed signing secret in `STRIPE_WEBHOOK_SECRET`.
3. Upgrades flow: app → `/billing/checkout` → Stripe Checkout → webhook flips the
   user to `pro` → quota becomes unlimited.

## Production notes

- Swap `better-sqlite3` for Postgres (the `db.ts` interface is small).
- Put it behind HTTPS; set a real `JWT_SECRET` and `APP_URL`.
- Consider rate-limiting `/auth/*` and adding email verification.
