---
name: riebeckite-configuration
description: Use when changing Riebeckite site configuration, scripts, content paths, or integration settings.
riebeckiteVersion: "{{riebeckite-version}}"
---

# Configuration workflow

Read `references/guide.md` and complete `assets/checklist.md`.

1. Inspect `riebeckite.config.ts`, `package.json`, the content directory, deployment files, and installed extensions.
2. Identify the smallest setting that solves the need. Prefer an existing option over a new abstraction or script.
3. Preserve unknown configuration fields and unrelated settings.
4. Check path, locale, base URL, publish strategy, and extension changes for route or publication impact.
5. Keep secrets in environment variables or the provider's secret store. Report names only.
6. Update the configuration in the project's existing style and keep TypeScript types valid.
7. Run `npm run check`; run `npm run build` when paths, routes, extensions, or deployment output changed.
8. Use `npm exec riebeckite inspect config` to confirm the resolved values when behaviour is unclear.
9. Report the changed setting, reason, validation results, and any migration or deployment implication.
