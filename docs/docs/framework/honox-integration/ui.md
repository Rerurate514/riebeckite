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
  `ArticleBody`, `PageBody`, `ArticleMeta`, `ArticleFooter`, and `ContentSlot`
  for an article page;
- `Sidebar` for complementary content.

The corresponding `*Props` types are public. `ContentSlot` is paired with the
pure `hasSlot(slots, name)` helper, and the `ARTICLE_SLOT` constant provides
the standard slot names.

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
they are placed. `ContentSlot` looks a slot up by name in the `slots` map and
renders it with a `data-slot` attribute; a missing, empty, or whitespace-only
slot renders nothing, and `class`/`className` add site classes. It never infers
a semantic element from the slot name.

```tsx
import {
  Article,
  ArticleBody,
  ArticleContent,
  ArticleLayout,
  ContentSlot,
} from "@riebeckite/honox/ui";

<Article class="site-article">
  <ArticleLayout>
    <ContentSlot
      slots={bodySlots}
      name="article.aside"
      class="site-article__aside"
    />
    <ArticleContent>
      <ContentSlot slots={bodySlots} name="article.header" />
      <ContentSlot slots={bodySlots} name="article.metadata" />
      <ArticleBody html={post.html ?? ""} />
    </ArticleContent>
  </ArticleLayout>
</Article>;
```

Use the primitives as composition points, then style them from the site. Pass
rendered Markdown to `ArticleBody`. Do not import files below
`@riebeckite/honox/src/` or rely on any unlisted component.
