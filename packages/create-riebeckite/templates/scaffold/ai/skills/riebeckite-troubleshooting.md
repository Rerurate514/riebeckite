---
name: riebeckite-troubleshooting
description: Use when a Riebeckite check, build, preview, or content resolution fails.
riebeckiteVersion: "{{riebeckite-version}}"
---

# Troubleshooting workflow

Read `references/guide.md` and complete `assets/checklist.md`.

1. Capture the exact failing command, full error, project root, Riebeckite version, and recent changes. Do not start by editing files.
2. Reproduce with the smallest command that fails. Prefer `npm run check`, then `npm run doctor`, then `npm run build`.
3. Use `npm exec riebeckite inspect config` to confirm the resolved project and content paths.
4. Use `npm exec riebeckite inspect content --list` before diagnosing a missing file, WikiLink, embed, or route.
5. Classify the failure: configuration, content source, frontmatter/format, Plugin contract, route/render, asset, environment, or deployment.
6. Form one concrete hypothesis and test it with the smallest read-only inspection. Do not make several unrelated changes at once.
7. Fix the root cause in shared code or configuration, not just the first symptom.
8. Re-run the failing command and the broader check/build verification. Confirm the fix does not suppress diagnostics.
9. If the cause is unclear, stop and report the evidence and the next discriminating check.
10. Report the cause, changed files, commands run, verification, and any remaining risk.
