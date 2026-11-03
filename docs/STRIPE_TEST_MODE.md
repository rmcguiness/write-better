# Stripe test-mode plan

How to check write-better's billing end to end in Stripe **test mode**, and how to take the
`stripe` 17 → 23 upgrade safely. Nothing here uses a live key or moves real money.

Status (Nov 3, 2026): **not run yet.** No Stripe test key is available to the maintainer
tooling, so only the offline checks in step 0 have been done. Steps 1–6 are the plan.

## What the billing code does

`server/src/billing.ts` uses four Stripe calls and one webhook handler:

| Code path | Stripe API | Notes |
| --- | --- | --- |
| `ensureCustomer` | `customers.create` | Stores `stripe_customer_id` on the user row |
| `createCheckoutUrl` | `checkout.sessions.create` (`mode: 'subscription'`) | Uses `STRIPE_PRICE_ID` |
| `createPortalUrl` | `billingPortal.sessions.create` | Needs a saved portal configuration in the test dashboard |
| `handleWebhook` | `webhooks.constructEvent` | Signature checked with `STRIPE_WEBHOOK_SECRET` |

Entitlement follows `customer.subscription.created/updated/deleted` only. A
`checkout.session.completed` event is ignored on purpose, because a finished checkout does
not prove payment. The client is created with `new Stripe(key)` and **does not pin
`apiVersion`**, so requests use the SDK's pinned version. That is why a major SDK bump changes
API behavior.

## What's needed from Ryan

Three values, all from the Stripe dashboard with **Test mode** switched on:

| Box secret name | Value | Required |
| --- | --- | --- |
| `WRITE_BETTER_STRIPE_TEST_SECRET_KEY` | A test secret key, `sk_test_...` (or a restricted `rk_test_...` key with write access to Customers, Checkout Sessions, Customer portal, Products, Prices and Subscriptions, and read access to Events) | Yes |
| none (dashboard step) | Save a Customer portal configuration once: Settings → Billing → Customer portal → Save | Yes, for `/billing/portal` |
| none | Stripe account email for the CLI, **only if** you'd rather log the CLI in than pass `--api-key` | No |

**Never supply a live key (`sk_live_...` / `rk_live_...`).** The test run refuses any key that
doesn't start with `sk_test_` or `rk_test_`. The key stays in the box secret store, and it
is never written to `.env` in the repo, a log or a PR.

`STRIPE_PRICE_ID` and `STRIPE_WEBHOOK_SECRET` don't need to be supplied. Step 2 creates a
test Price with the API, and step 3 prints a webhook signing secret from `stripe listen`.

## Step 0: offline checks (done)

These need no key and run in CI already:

- `server/src/billing.test.ts` signs fixture events with
  `Stripe.webhooks.generateTestHeaderString` and checks entitlement for created / updated
  (active, trialing, past_due) / deleted / checkout-completed, plus a bad signature.
- On a scratch copy of `main`'s server with `stripe@23.1.0` installed (Nov 3, 2026):
  `tsc --noEmit` passed, and all 58 server tests passed (4 files). That proves the code
  compiles and the webhook signature path works against v23. It doesn't prove the live
  API calls behave the same, which is what steps 1–6 are for.

## Step 1: set up

```bash
# Stripe CLI (free, no account needed when you pass --api-key)
#   https://docs.stripe.com/stripe-cli  (download the Linux tarball from the GitHub release)
export STRIPE_API_KEY="$WRITE_BETTER_STRIPE_TEST_SECRET_KEY"
case "$STRIPE_API_KEY" in sk_test_*|rk_test_*) ;; *) echo "refusing: not a test key"; exit 1;; esac

cd server && npm ci
```

## Step 2: create a test product and price

```bash
stripe products create --name "write-better Pro (test)"
stripe prices create --product prod_... --unit-amount 500 --currency usd \
  -d "recurring[interval]=month"
# Copy the price id into STRIPE_PRICE_ID for this shell only.
```

## Step 3: start the server with webhook forwarding

```bash
stripe listen --forward-to localhost:8787/billing/webhook \
  --events customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,checkout.session.completed
# Prints "Your webhook signing secret is whsec_..." -> STRIPE_WEBHOOK_SECRET

JWT_SECRET="$(openssl rand -hex 32)" STRIPE_SECRET_KEY="$STRIPE_API_KEY" \
STRIPE_PRICE_ID=price_... STRIPE_WEBHOOK_SECRET=whsec_... \
APP_URL=http://localhost:8787 npm run dev
```

`GET /` should report `"billing": true`.

## Step 4: run the checkout flow

| # | Action | Expected |
| --- | --- | --- |
| 1 | `POST /auth/signup` with a fake address (e.g. `stripe-test+1@example.com`) | 200, plan `free` |
| 2 | `POST /billing/checkout` with the bearer token | 200 with a `checkout.stripe.com` test URL; the user row gets a `cus_...` id |
| 3 | Open the URL and pay with card `4242 4242 4242 4242`, any future date, any CVC, any ZIP | Redirects to `/billing/return?status=success` |
| 4 | Watch `stripe listen` | `checkout.session.completed` → 200 (ignored), `customer.subscription.created` → 200 |
| 5 | `GET /me` | plan `pro`, Pro caps shown |
| 6 | `POST /billing/portal` | 200 with a `billing.stripe.com` test URL |
| 7 | Cancel the subscription in the portal (or `stripe subscriptions cancel sub_...`) | `customer.subscription.deleted` → 200; `GET /me` is back to `free` |
| 8 | Repeat checkout with `4000 0000 0000 0341` (attaches, then fails to charge) | No `pro` entitlement while the subscription is `incomplete` / `past_due` |
| 9 | Repeat with `4000 0025 0000 3155` (3-D Secure) | `pro` only after the authentication succeeds |
| 10 | `curl -X POST /billing/webhook` with a bad `stripe-signature` | 400, plan unchanged |
| 11 | `stripe events resend evt_...` for an old `customer.subscription.created` | Plan matches the latest subscription state, with no duplicate user changes |

Steps 3, 8 and 9 need a browser for the hosted Checkout page. To check the webhooks without
a browser, create the subscription directly instead:
`stripe subscriptions create --customer cus_... -d "items[0][price]=price_..." -d payment_behavior=error_if_incomplete --default-payment-method pm_card_visa`
(attach `pm_card_visa` to the customer first).

Record the results in a table (event id, HTTP status, plan before and after) in the PR. Don't
include keys or `whsec_` values.

## Step 5: the stripe 23 upgrade

`stripe@23` (latest 23.1.0) changes the pinned API version from the v17 line to
**`2026-09-30.endive`**. Changes between v17 and v23 that matter here:

- **v19** pinned `2025-09-30.clover`, **v20** `2025-11-17.clover`, **v21** `2026-03-25.dahlia`
  (removed `payment_method_types` on Checkout create, which this code doesn't send), and
  **v23** `2026-09-30.endive`. Read the Stripe API changelog for each version on Checkout
  Sessions, Subscriptions, the Customer portal and the `customer.subscription.*` event payloads.
- **v22:** `Stripe` is a true ES6 class (`new Stripe(...)`, which this code already uses), and
  the CJS entry no longer exports `.default`. Types moved inline. The server's ESM
  `import Stripe from 'stripe'` compiles under v23 (step 0).
- **v23:** needs Node 20 or later (CI uses Node 22). `verifyHeader` now applies the default
  timestamp tolerance, and passing `0` to `constructEvent` really skips the check. This code
  uses the default, so nothing changes. Incomplete response bodies now throw
  `StripeConnectionError` instead of `StripeAPIError`. `Stripe.constructEventWithoutVerification`
  is removed (not used here).
- **Webhook payload version:** events are rendered with the **webhook endpoint's** API version,
  not the SDK's. `stripe listen` uses the account default unless you pass `--latest`. Run step 4
  twice: once as is, once with `stripe listen --latest`. When a production endpoint exists,
  create it with `api_version: 2026-09-30.endive` so payloads match the SDK types.

Upgrade steps:

1. Branch from `main`: `cd server && npm install stripe@^23.1.0`.
2. Optional but recommended: pin the version explicitly so later SDK bumps can't change it
   silently: `new Stripe(key, { apiVersion: '2026-09-30.endive' })`.
3. `npm run typecheck && npm test`.
4. Run steps 2–4 above against the upgraded server and paste the results table into the PR.
5. Close Dependabot PR #10 (stripe 17 → 23.0.0) as replaced.

## Step 6: clean up

- Cancel every test subscription (`stripe subscriptions list --status active`).
- Delete the local SQLite database and the scratch `.env` if one was made.
- Stop `stripe listen`. The `whsec_` it printed is tied to that CLI session.
- Optional: archive the test product in the dashboard.

## Alternatives when no test key is available

- **stripe-mock** (`docker run -p 12111:12111 stripe/stripe-mock`, then
  `new Stripe('sk_test_123', { host: 'localhost', port: 12111, protocol: 'http' })`): checks
  that request shapes match the OpenAPI spec. It's stateless and doesn't send webhooks, so it
  can't prove entitlement. Use it to smoke-test the upgrade's request params.
- **Recorded fixtures:** the existing signed-fixture tests in `billing.test.ts`. Adding
  fixtures taken from a real endive-version `customer.subscription.*` payload (with ids
  scrubbed) would make the type change visible in CI.

Neither replaces steps 2–4. The upgrade PR shouldn't merge until a real test-mode run passes.
