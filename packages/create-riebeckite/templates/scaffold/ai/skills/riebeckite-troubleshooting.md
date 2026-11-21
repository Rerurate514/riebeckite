---
name: riebeckite-troubleshooting
description: Use when a Riebeckite command, build, publication state, or link is failing.
riebeckiteVersion: "{{riebeckite-version}}"
---

# Troubleshooting workflow

Read `references/guide.md` and complete `assets/checklist.md`.

1. Capture the command, affected source, expected result, observed result, and first diagnostic before changing files.
2. Run `npm run doctor` and `npm run check`. With MCP, inspect context, diagnostics, publication, and links for the affected source.
3. Classify the failure: configuration, source resolution, frontmatter/publication, link graph, Plugin/Theme, generated output, or environment.
4. Reproduce with the smallest input and inspect the owning layer. Do not suppress diagnostics or make unrelated configuration changes.
5. Verify the original reproduction first, then run the narrowest relevant check; build when output behavior changed.
6. Report cause, evidence, changed files, validation, and any unverified environment dependency.
