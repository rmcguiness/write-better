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
