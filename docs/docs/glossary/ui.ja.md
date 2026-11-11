---
date: 2026-10-14
title: UI
sidebar:
  hidden: true
---

# UI

`@riebeckite/honox/ui` が提供する UI プリミティブは、コンポーネントフレームワークではなく小さな構造の契約です。プリミティブには `Article`、`ArticleLayout`、`ArticleContent`、`ArticleBody`、`ArticleMeta`、`ArticleFooter`、`Sidebar` があり、安定した CSS フック（`rb-article`、`rb-article-layout` など）を持ちます。

## 記事のプリミティブ

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

安定したスタイリング用フックと構造 CSS は、この契約が提供します。記事本文、メタデータの表示形式、ナビゲーションの配置、カード、ページレイアウトの構成、アイランド、サイトの視覚デザインは、サイトアプリケーションに属します。

## プラグインUIの組み立て

プラグインはデータヘルパーと JSX コンポーネントを公開し、サイトが自分の TSX で組み立てます。各プラグインのデータヘルパーは `PublicContentView`（または同様のフィルタ済みファサード）を受け取り、型付きモデルを返します。その後コンポーネントを直接描画するため、配置、順序、条件付き描画はサイトが完全に制御できます。

プラグイン UI も同じ形で組み立てます。

- プラグインがデータヘルパー（例：`getProperties`）を公開し、限られた入力を受けてモデルを返す
- プラグインが JSX コンポーネント（例：`<Properties />`）を公開し、型付き props を受け取る
- サイトが必要な箇所でコンポーネントをインポートして描画する（例：`<Properties data={data} />`）

```tsx
import { getProperties } from "@riebeckite/plugin-properties";
import { Properties } from "@riebeckite/plugin-properties/components";

const data = getProperties({ view, frontmatter: entry.frontmatter });
<Properties data={data} />
```

## 安定したスタイリング用フック

各プリミティブは、安定したスタイリング用フックとして1つのクラスを公開します。

| コンポーネント | クラス |
| --- | --- |
| `Article` | `rb-article` |
| `ArticleLayout` | `rb-article-layout` |
| `ArticleHeader` | `rb-article-header` |
| `ArticleContent` | `rb-article-body` |
| `ArticleBody` | `rb-article-content` |
| `ArticleMeta` | `rb-article-meta` |
| `ArticleFooter` | `rb-article-footer` |
| `Sidebar` | `rb-sidebar` |

構造 CSS は `@riebeckite/honox/style.css` にあり、生成される `.riebeckite/framework-styles.css` を通じてサイトに届きます。プリミティブが提供するのは、セマンティック HTML、これらのフック、`class`/`className` の合成、フックを機能させる構造 CSS です。記事本文、メタデータの表示形式、ナビゲーションの配置、カード、ページレイアウトの構成、アイランド、サイトの視覚デザインと上書きは所有しません。それらはサイトアプリケーションに属します。`ArticleHeader` は children か HTML 入力用の prop を受け取り、`ArticleContent` は children を受け取ります。`ArticleBody` は有効な Content Format が提供する本文、なければレンダリング済みの Markdown を `.rb-article-content` として描画し、Markdown のタイポグラフィはそのラッパーにスコープされるため、プラグインのコンポーネントはどこに置いても独自の見出しを保てます。

## サイトが持つもの

プリミティブはセマンティック HTML、フック、クラスと合成、構造 CSS を提供します。記事本文、メタデータの表示形式、ナビゲーションの配置、カード、ページレイアウトの構成、アイランド、サイトの視覚デザインはサイトアプリケーションに属します。

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
