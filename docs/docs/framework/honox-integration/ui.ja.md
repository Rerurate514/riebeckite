---
date: 2026-10-08
title: UIプリミティブ
sidebar:
  label: UIプリミティブ
  order: 10
---
# UIプリミティブ

`@riebeckite/honox/ui` は UI フレームワークではありません。

サイトが独自のデザインを作りながら、Riebeckite と共通の HTML 構造を利用するための小さなプリミティブ群です。

公開されているコンポーネントは次のとおりです。

- `Article`
- `ArticleLayout`
- `ArticleHeader`
- `ArticleContent`
- `ArticleBody`
- `PageBody`
- `ArticleMeta`
- `ArticleFooter`
- `Sidebar`

対応する `*Props` 型も公開されています。

## 安定したスタイル用フック

各プリミティブは次のクラスを安定したスタイル用フックとして提供します。

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

`ArticleBody` はレンダリング済みの Markdown 本文を `.rb-article-content` として描画し、Markdown のタイポグラフィはこのラッパーにのみ適用されます。プラグインコンポーネントの見出しはプラグイン自身が所有します。

プリミティブが担当するのは主に、

- セマンティック HTML
- 安定したスタイル用フック
- `class` / `className` の合成
- フックを成立させる構造 CSS

です。`rb-*` フックを成立させる構造 CSS は `@riebeckite/honox/style.css` にあり、生成された `.riebeckite/framework-styles.css` 経由でサイトに読み込まれます。

一方、

- 記事本文の見た目
- メタデータの表示形式
- ナビゲーションの配置
- カード
- ページレイアウトの構成
- アイランド
- サイト固有の視覚デザインと上書き

はサイトアプリケーションが管理します。

## プラグイン UI の構成

各コンポーネントはプラグインから直接インポートし、サイトが置きたい場所で描画します。`SiteProvider` と、公開 `entry` を渡した `Article` を使うと、コンポーネントは必要なプラグインデータを自動で解決します。配置、順序、表示条件は引き続きサイトが管理します。

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

`view` には `createPublicContentView(manifest)` で作成した値を渡します。必要なコンテキストがなければコンポーネントは何も描画しないため、共通レイアウトに置いても安全です。個別の props はカスタマイズ用として残り、コンテキストからの値より優先されます。高度な構成が必要なときは、従来どおり純粋なデータヘルパーを利用できます。

依存方向は `plugin → @riebeckite/ui ← honox` です。プラグイン UI を HonoX のバレルから再エクスポートしません。

## サイトが持つもの

プリミティブはセマンティック HTML、フック、class の合成、構造 CSS を提供します。記事本文、メタデータの表示形式、ナビゲーションの配置、カード、ページレイアウトの構成、アイランド、サイトの視覚デザインはサイトアプリケーションが管理します。

## 関連用語

- [[glossary/obsidian-vault|Obsidian Vault]]
- [[tag|Tag]]
- [[shortcode|Shortcode]]
- [[callout|Callout]]
- [[sidenote|Sidenote]]
- [[backlink|Backlink]]
- [[glossary/site|Site]]
