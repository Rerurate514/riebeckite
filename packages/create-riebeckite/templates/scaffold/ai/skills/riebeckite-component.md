---
name: riebeckite-component
description: Use when adding or changing application pages, routes, or UI components in a Riebeckite site.
riebeckiteVersion: "{{riebeckite-version}}"
---

# Application component workflow

Read `references/guide.md` and complete `assets/checklist.md`.

1. Inspect the route, component tree, active Theme, and existing Plugins before editing.
2. Decide the ownership boundary: install an official Plugin for reusable Riebeckite behavior; change the Theme for shared presentation; use application code only for site-specific UI or routes.
3. Keep route data and public URL behavior explicit. Do not change content routes, permalinks, or publication policy as a side effect of a UI change.
4. Reuse established components, tokens, and accessibility patterns from the application and Theme.
5. Preserve semantic HTML, keyboard access, focus visibility, responsive layout, and reduced-motion behavior.
6. Add focused coverage for non-trivial route or component behavior.
7. Run `npm run check` and `npm run build`; inspect every affected route and interactive state.
8. Report the ownership decision, affected routes, validation result, and accessibility or compatibility risk.
