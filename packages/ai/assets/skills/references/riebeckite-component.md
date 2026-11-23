# Application component guide

Use application code for site-specific layout, page composition, interactions, and route wiring. Use a Plugin for reusable content semantics and a Theme for shared presentation.

## Choose the right boundary

| Need | Owner |
| --- | --- |
| Reusable content transformation or output | Official or local Plugin |
| Shared visual language across the site | Theme |
| One site's page layout, interaction, or route | Application component |
| Markdown meaning or frontmatter interpretation | Plugin or content format |
| Site name, locale, menu, or deployment setting | Configuration |

Do not put content semantics in a component or presentation in a Plugin.

## Route structure

The minimal scaffold uses file routes:

```tsx
import { createHomeRoute } from "@riebeckite/honox/server";
import { SiteArticle } from "../components/article";
import { config } from "virtual:riebeckite/config";
import { content } from "virtual:riebeckite/content";

export default createHomeRoute({
  content,
  config,
  render: () => <SiteArticle />,
});
```

The content catch-all route uses `createContentRoute` with the same content/config inputs:

```tsx
import { createContentRoute } from "@riebeckite/honox/server";
import { SiteArticle } from "../components/article";
import { config } from "virtual:riebeckite/config";
import { content } from "virtual:riebeckite/content";

export default createContentRoute({
  content,
  config,
  render: () => <SiteArticle />,
});
```

A shared article component can compose framework UI:

```tsx
import { Article, ArticleBody, ArticleContent } from "@riebeckite/honox/ui";

export function SiteArticle() {
  return (
    <Article class="site-article">
      <ArticleContent>
        <ArticleBody />
      </ArticleContent>
    </Article>
  );
}
```

Keep the actual project imports and route file names. Do not rename a route file merely to match an example.

## Preserve the route contract

Before changing a route or component, identify:

- The public URL, params, and query behaviour.
- The content type and frontmatter it receives.
- The loading, empty, not-found, and error states.
- Any redirect or canonical URL behaviour.
- Any client-side navigation or hydration requirement.

A UI change must not silently change a public URL or make a content page unreachable.

## Accessibility and presentation

- Use landmarks, headings, lists, buttons, and links for their semantics.
- Every control needs an accessible name and visible focus.
- Preserve keyboard order; do not trap focus outside a modal.
- Do not rely on colour alone to convey state.
- Support long titles, long words, and narrow viewports without clipping.
- Respect `prefers-reduced-motion`; avoid motion that is required to understand content.
- Use Theme tokens and `rb-*` structural hooks instead of hard-coded palette values.
- Keep decorative images out of the accessibility tree; give meaningful images useful alternative text.

## Tests

Match the project's existing test stack. Cover:

- The route's data and parameter handling.
- Empty, loading, and error states.
- Interactive controls and keyboard paths.
- A representative content fixture.
- A regression assertion for the public URL or rendered landmark.

If the project has no component test setup, state that and verify manually rather than adding a new framework for one component.

## Commands

```sh
npm run check
npm run build
npm run dev
```

Use `npm run build` when routes, rendering, or assets changed. Inspect the built route, not only the source.

## Common failures

| Symptom | Likely cause |
| --- | --- |
| Page renders but navigation 404s | Route file or catch-all contract changed. |
| Content is missing | Wrong content object, route param, or frontmatter expectation. |
| Layout breaks on mobile | Fixed widths, unbreakable content, or overflow hidden. |
| Keyboard focus disappears | CSS removal of outline or incorrect focus management. |
| Build passes but browser fails | Client/server boundary or hydration issue. |

## Report

State the ownership decision, changed components/routes, public URL impact, accessibility checks, tests, and any remaining visual or behavioural risk.
