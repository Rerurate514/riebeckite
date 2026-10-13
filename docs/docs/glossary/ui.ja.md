---
title: UI
sidebar:
  hidden: true
---

# UI

@riebeckite/honox/ui) が提供する UI プリミティブ はコンポーネントフレームワークではなく、小さな構造的契約です。 `Article`, `ArticleLayout`, `ArticleContent`, `ArticleBody`, `ArticleMeta`, `ArticleFooter`, `ContentSlot`, `Sidebar` を含み、安定した CSS フック (`rb-article`, `rb-article-layout` など) を持っています。

## Article プリミティブ

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

## スタイルリングフック

 各プリミティブ は 1 つのクラスを安定したスタイルフックとして公開します:

| コンポーネント | クラス |
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

 安定したスタイル CSS は `@riebeckite/honox/style.css` で、 `.riebeckite/framework-styles.css` を通じてサイトに到達します。

## サイトの所有権

 プリミティブはセマンティック HTML、フック、class/composition、structural CSS を提供します。記事コピー、メタデータフォーマット、ナビゲーション配置、カード、ページレイアウト構成、islands、サイトビジュアルデザインはサイトアプリケーションに帰属します。

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
