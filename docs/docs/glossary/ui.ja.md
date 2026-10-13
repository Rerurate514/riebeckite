---
title: UI
sidebar:
  hidden: true
---

# UI

`@riebeckite/honox/ui`が提供するUIプリミティブは、小さな構造の契約であり、コンポーネントフレームワークではありません。プリミティブには`Article`、`ArticleLayout`、`ArticleContent`、`ArticleBody`、`ArticleMeta`、`ArticleFooter`、`ContentSlot`、`Sidebar`があり、安定したCSS hook（`rb-article`、`rb-article-layout`など）を持ちます。

## Articleプリミティブ

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

## 安定したstyling hook

各プリミティブは、安定したstyling hookとして1つのクラスを公開します。

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

構造CSSは`@riebeckite/honox/style.css`に入っており、`.riebeckite/framework-styles.css`を通じてサイトに届きます。

## Siteが持つもの

プリミティブはセマンティックHTML、hook、classと構成、構造CSSを提供します。記事の本文、メタデータの整形、ナビゲーションの配置、カード、ページレイアウトの構成、island、サイトの視覚デザインはサイトのapplicationに属します。

## 関連用語

- [[glossary/obsidian-vault|Obsidian Vault]]
- [[tag|Tag]]
- [[shortcode|Shortcode]]
- [[callout|Callout]]
- [[sidenote|Sidenote]]
- [[backlink|Backlink]]
- [[glossary/site|Site]]

## さらに詳しく

- [HonoX UI](../framework/honox-integration/ui.ja.md)
