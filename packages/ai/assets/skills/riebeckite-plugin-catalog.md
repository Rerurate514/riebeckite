---
name: riebeckite-plugin-catalog
description: Use before writing local code for a reusable Riebeckite feature, to find and evaluate an official Plugin.
riebeckiteVersion: "{{riebeckite-version}}"
---

# Official Plugin selection workflow

Read `references/guide.md` and complete `assets/checklist.md`.

1. State the capability in one sentence, including the content or route it must affect and whether it needs build-time output or runtime interaction.
2. Inspect `riebeckite.config.ts` and `package.json` for existing Plugins, Themes, local extensions, and overlapping capabilities.
3. Consult the official catalog before writing local code. When MCP is connected, call `riebeckite_plugin_catalog` with a short capability query. Otherwise use <https://riebeckite.dev/docs/plugins/>.
4. Compare candidates by supported input, output shape, configuration syntax, required companion packages, route or asset impact, and maintenance status.
5. Choose the narrowest Plugin that satisfies the need. Do not add a broad bundle for one feature.
6. Read the candidate's current documentation and version requirements. Do not rely on a remembered API or an old example.
7. Install only the required package and register it with the project's existing configuration pattern.
8. Run `npm run check` and `npm run build`; inspect the affected content, route, and assets.
9. If no catalog Plugin fits, report the gap and explain why local Plugin or application code is the next option. Do not silently build a duplicate.
10. Report the capability, candidates considered, chosen package and version, configuration changes, and verification results.
