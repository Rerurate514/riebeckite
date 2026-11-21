---
name: riebeckite-component
description: Use when adding or changing site-specific Riebeckite application components or routes.
riebeckiteVersion: "{{riebeckite-version}}"
---

# Application component workflow

Read `references/guide.md` and complete `assets/checklist.md`.

1. Inspect the affected route, existing components, active Theme, Plugins, and the content it renders. Record the current public URL and route params.
2. Decide the ownership boundary before coding: official Plugin, local Plugin, Theme, application component, or content/config.
3. Reuse the project's existing UI primitives and layout rather than creating a parallel design system.
4. Preserve route data, params, error states, and public URLs. Do not change content routing as a side effect of a UI edit.
5. Use semantic HTML and preserve keyboard operation, labels, focus order, landmarks, and heading hierarchy.
6. Check narrow layouts, long content, missing content, and reduced-motion preferences. Do not encode meaning in colour alone.
7. Add or update a focused test for the component's data, input, loading, and error branches where the project has a test setup.
8. Run `npm run check`; run `npm run build` when routes, rendering, or assets changed.
9. Inspect the rendered page at the affected route in a browser and confirm no unrelated route regressed.
10. Report changed components/routes, URL and accessibility impact, tests, and any remaining visual risk.
