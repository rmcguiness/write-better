# Security policy

## Reporting a vulnerability

Please **do not open a public issue** for security problems. Report them privately through
GitHub's [private vulnerability reporting](https://github.com/rmcguiness/write-better/security/advisories/new)
(Security tab → "Report a vulnerability").

Include what you found, how to reproduce it, and the impact. This is a personal project
maintained by one person: there is no bug bounty and no guaranteed response time.

## Scope

- The Expo app (`src/`), including how it stores API keys and sign-in tokens.
- The managed backend (`server/`): auth, AI proxy, quotas and Stripe billing.
- CI and repository configuration.

Out of scope: vulnerabilities in third-party dependencies without demonstrated impact here
(Dependabot tracks updates), and abuse of AI providers through your own API key.

## Operator notes

- `JWT_SECRET` must be a random value of at least 32 characters; the server refuses to start
  in production without one. Rotate it if it was ever left at a default.
- Set `STRIPE_WEBHOOK_SECRET` and serve the backend over HTTPS only.
- The in-memory rate limiter covers a single instance; add an edge/WAF rate limit and a provider
  spending cap before opening sign-ups to the public.
