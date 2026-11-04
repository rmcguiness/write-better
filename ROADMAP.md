# Roadmap

This is a personal project, so the list is a direction, not a promise. Items
near the top come first.

## Next

- [ ] **Test native builds on real devices.** Run iOS and Android through a dev
      build and check the SecureStore key migration, keyboard handling in the
      editor, and reduced motion.
- [ ] **Smoke-test real providers.** Do one opt-in manual run per provider
      (Anthropic, OpenAI, xAI) with a capped key, and confirm the current model
      IDs and browser CORS behavior.
- [ ] **Validate feedback responses.** Validate and clamp model output in the app
      (missing fields, out-of-range scores) instead of trusting the provider's
      JSON schema.
- [ ] **Export and import pieces.** Add JSON or Markdown export so writing isn't
      trapped in local storage.

## Pro plan (groundwork done, launch not started)

- [x] Every plan is capped: monthly and daily AI-use caps enforced on the server,
      plus per-account and per-IP burst limits on AI routes. The app shows a clear
      "cap reached" state and when it resets. No "unlimited" copy anywhere.
- [ ] **Decide the numbers.** Set the Pro price and caps from real per-request
      provider costs. The defaults (Free 10/month, Pro 300/month and 50/day) are
      placeholders.
- [ ] **Stripe test-mode run.** Check out with a test card, confirm the webhook
      moves the account to Pro, and check that the caps update. No live keys
      until then.
- [ ] **Pricing copy** in the app and README once the numbers are settled.

## Later

- [ ] **Host the web demo** on a free static host (see the README), if wanted.
- [ ] **Managed backend hardening:** a production deployment plan, SQLite
      backups or a move to Postgres, structured logging, and a Stripe test-mode
      end-to-end run.
- [ ] **Streaks and history:** gentle practice stats such as words per week and
      genres tried.
- [ ] **More Learn content,** and links from feedback to the relevant lesson.
- [ ] **Localization** of the UI strings.

## Maintenance

- [ ] Take Expo SDK upgrades as whole-SDK bumps (`npx expo install --fix`), not
      piecemeal major bumps from Dependabot. React and React DOM are pinned by
      Expo and ignored in `dependabot.yml`.
- [ ] Review the open major-version Dependabot PRs one at a time.
