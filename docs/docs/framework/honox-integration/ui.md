---
title: UI primitives
sidebar:
  label: UI primitives
  order: 10
---
# UI primitives

`@riebeckite/honox/ui` is deliberately a small structural contract, not a
component framework. Its complete public component surface is:

- `Article`, `ArticleLayout`, `ArticleHeader`, `ArticleContent`,
  `ArticleBody`, `PageBody`, `ArticleMeta`, `ArticleFooter` for an article page;
- `Sidebar` for complementary content.

The corresponding `*Props` types are public.

## Stable styling hooks

Each primitive exposes one class as its stable styling hook:

| Component | Class |
| --- | --- |
| `Article` | `rb-article` |
| `ArticleLayout` | `rb-article-layout` |
| `ArticleHeader` | `rb-article-header` |
| `ArticleContent` | `rb-article-body` |
| `ArticleBody` | `rb-article-content` |
| `ArticleMeta` | `rb-article-meta` |
| `ArticleFooter` | `rb-article-footer` |
| `Sidebar` | `rb-sidebar` |

These stable styling hooks are the only classes supplied by the contract.
Primitives provide semantic
HTML, those hooks, `class`/`className` composition, and the structural CSS that
makes the hooks work. That structural CSS ships in `@riebeckite/honox/style.css`
and reaches the site through the generated `.riebeckite/framework-styles.css`.
Primitives do not own article copy, metadata formatting, navigation placement,
cards, page-layout composition, islands, or site visual design and overrides.
Those belong to the site application. `ArticleHeader` accepts children or its
HTML input prop, while `ArticleContent` accepts children. `ArticleBody` renders
rendered Markdown as `.rb-article-content`, and Markdown typography is
scoped to that wrapper, so plugin components keep their own headings wherever
they are placed.

## Composing plugin UI

Import each component from its plugin and render it where the Site wants it.
With `SiteProvider` and an `Article` supplied with its `post` and public
`entry`, components resolve their own plugin data. The Site still owns
placement, ordering, and conditional rendering.

```tsx
import { Article, ArticleBody } from "@riebeckite/honox/ui";
import { Properties } from "@riebeckite/plugin-properties";
import { SiteProvider } from "@riebeckite/ui";

<SiteProvider config={config} manifest={manifest} view={view} path={path}>
  <Article post={post} entry={entry}>
    <Properties />
    <ArticleBody />
  </Article>
</SiteProvider>;
```

`view` must be created with `createPublicContentView(manifest)`. Components
render nothing when their required context is unavailable, so they can safely
appear in shared layouts. Explicit props remain the customization path and take
precedence over context data. The exported pure data helpers remain available
for advanced composition.

The dependency direction is `plugin → @riebeckite/ui ← honox`; plugin UI is not
re-exported by a HonoX barrel.

## Site ownership

Primitives provide semantic HTML, hooks, class/composition, and structural CSS.
Article copy, metadata formatting, navigation placement, cards, page-layout
composition, islands, and site visual design belong to the site application.

## Related terms

- [[glossary/obsidian-vault|Obsidian Vault]]
- [[tag|Tag]]
- [[shortcode|Shortcode]]
- [[callout|Callout]]
- [[sidenote|Sidenote]]
- [[backlink|Backlink]]
- [[glossary/site|Site]]
