---
title: UI
sidebar:
  hidden: true
---

# UI

UI primitives provided by `@riebeckite/honox/ui` are a small structural contract, not a component framework. Primitives include `Article`, `ArticleLayout`, `ArticleContent`, `ArticleBody`, `ArticleMeta`, `ArticleFooter`, `ContentSlot`, and `Sidebar` with stable CSS hooks (`rb-article`, `rb-article-layout`, etc.).

## Article primitives

```tsx
import { Article, ArticleBody, ArticleContent, ArticleLayout, ContentSlot } from "@riebeckite/honox/ui";

<Article class="site-article">
  <ArticleLayout>
    <ContentSlot slots={bodySlots} name="article.aside" class="site-article__aside" />
    <ArticleContent>
      <ContentSlot slots={bodySlots} name="article.header" />
      <ContentSlot slots={bodySlots} name="article.metadata" class="site-article__metadata" />
      <ArticleBody html={post.html ?? ""} />
    </ArticleContent>
  </ArticleLayout>
</Article>
```

## Stable styling hooks

Each primitive exposes one class as its stable styling hook:

| Component | Class |
|---|---|
| `Article` | `rb-article` |
| `ArticleLayout` | `rb-article-layout` |
| `ArticleHeader` | `rb-article-header` |
| `ArticleContent` | `rb-article-body` |
| `ArticleBody` | `rb-article-content` |
| `ArticleMeta` | `rb-article-meta` |
| `ArticleFooter` | `rb-article-footer` |
| `Sidebar` | `rb-sidebar` |
```

Structural CSS ships in `@riebeckite/honox/style.css` and reaches the site through `.riebeckite/framework-styles.css`.

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
