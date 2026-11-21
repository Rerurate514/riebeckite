---
name: riebeckite-configuration
description: Use when changing riebeckite.config.ts, content locations, or deployment settings.
riebeckiteVersion: "{{riebeckite-version}}"
---

# Configuration workflow

Read `references/guide.md` and complete `assets/checklist.md`.

1. Read `riebeckite.config.ts`, package scripts, content root, deployment files, and active extensions before proposing a change.
2. Change the smallest relevant setting. Do not add a Plugin, Theme, environment variable, or provider without a concrete requirement.
3. Preserve unknown fields and project ordering. Verify every path against the project root and external-content boundary.
4. Keep development settings separate from publication settings. Never put secrets in source, commands, or generated documentation.
5. Run `npm run check` and `npm run build`. Inspect routes and output when changing URLs, locales, publishing, or content locations.
6. Report the effective setting, affected environments, validation result, rollback path, and remaining deployment risk.
