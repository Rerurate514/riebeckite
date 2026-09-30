# Riebeckite Docs App

This is the official documentation app for Riebeckite. It uses the repository-level `riebeckite.config.ts` and reads `docs/` as its content directory.

Important details:

- `content.directory` points at `../../docs` because `apps/web` is the application root.
- `content.exclude` includes `agents/**`, so `docs/agents` stays available in GitHub but is not published by the docs app.
- `publishStrategy` is `selective`, allowing normal documentation pages without `publish: true` frontmatter to be published unless they opt out with `private: true` or `draft: true`.

Use the root monorepo commands from the framework development docs when working on this app.
