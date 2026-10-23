---
date: 2026-10-14
title: UI
sidebar:
  hidden: true
---

# UI

UI primitives provided by `@riebeckite/honox/ui` are a small structural contract, not a component framework. Primitives include `Article`, `ArticleLayout`, `ArticleContent`, `ArticleBody`, `ArticleMeta`, `ArticleFooter`, and `Sidebar` with stable CSS hooks (`rb-article`, `rb-article-layout`, etc.).

## Article primitives

```tsx
import { Article, ArticleBody, ArticleContent, ArticleLayout } from "@riebeckite/honox/ui";

<Article class="site-article">
  <ArticleLayout>
    <ArticleContent>
      <ArticleBody html={post.html ?? ""} />
    </ArticleContent>
  </ArticleLayout>
</Article>;
```

Stable styling hooks and structural CSS are provided by the contract. Article copy, metadata formatting, navigation placement, cards, page-layout composition, islands, and site visual design belong to the site application.

## Composing plugin UI

Plugins expose data helpers and JSX components that the Site composes in its own TSX. Each plugin's data helper receives a `PublicContentView` (or similar filtered facade) and returns a typed model. The component is then rendered directly, giving the Site full control over placement, ordering, and conditional rendering.

Plugin UI follows the same pattern:

- A plugin exports a data helper (e.g., `getProperties`) that takes narrow inputs and returns a model
- The plugin exports a JSX component (e.g., `<Properties />`) that accepts typed props
- The Site imports and renders the component where needed, e.g: `<Properties data={data} />`

```tsx
import { getProperties } from "@riebeckite/plugin-properties";
import { Properties } from "@riebeckite/plugin-properties/components";

const data = getProperties({ view, frontmatter: entry.frontmatter });
<Properties data={data} />
```

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

Structural CSS ships in `@riebeckite/honox/style.css` and reaches the site through the generated `.riebeckite/framework-styles.css`. Primitives provide semantic HTML, those hooks, `class`/`className` composition, and the structural CSS that makes the hooks work. That structural CSS ships in `@riebeckite/honox/style.css` and reaches the site through the generated `.riebeckite/framework-styles.css`. Primitives do not own article copy, metadata formatting, navigation placement, cards, page-layout composition, islands, or site visual design and overrides. Those belong to the site application. `ArticleHeader` accepts children or its HTML input prop, while `ArticleContent` accepts children. `ArticleBody` renders rendered Markdown as `.rb-article-content`, and Markdown typography is scoped to that wrapper, so plugin components keep their own headings wherever they are placed.

## Site ownership

Primitives provide semantic HTML, hooks, class/composition, and structural CSS. Article copy, metadata formatting, navigation placement, cards, page-layout composition, islands, and site visual design belong to the site application.

## Related terms

- [[glossary/obsidian-vault|Obsidian Vault]]
- [[tag|Tag]]
- [[shortcode|Shortcode]]
- [[callout|Callout]]
- [[sidenote|Sidenote]]
- [[backlink|Backlink]]
- [[glossary/site|Site]]

## Learn more

- [HonoX UI](../framework/honox-integration/ui.md)