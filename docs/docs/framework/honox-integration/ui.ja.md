---
title: UI Primitive
sidebar:
  label: UI Primitive
  order: 10
---
# UI Primitive

`@riebeckite/honox/ui` は UI framework ではありません。

Site が独自のデザインを作りながら、Riebeckite と共通の HTML 構造を利用するための小さな primitive set です。

公開されている main な component は次のとおりです。

- `Article`
- `ArticleLayout`
- `ArticleHeader`
- `ArticleContent`
- `ArticleBody`
- `PageBody`
- `ArticleMeta`
- `ArticleFooter`
- `Sidebar`

対応する `*Props` 型も公開されています。`ContentSlot` component と `hasSlot` ユーティリティは削除されました。標準 slot 名を提供する `ARTICLE_SLOT` constant も削除されました。

## Stable Styling Hooks

各 primitive は次の class を stable styling hook として提供します。

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

`ArticleBody` はレンダリング済み Markdown 本文を `.rb-article-content` として描画し、Markdown typography はこの wrapper にのみ適用されます。plugin component の見出しは plugin 自身が所有します。

Primitive が担当するのは主に、

- semantic HTML
- stable styling hook
- `class` / `className` の合成
- hook を成立させる構造 CSS

です。`rb-*` hook を成立させる構造 CSS は `@riebeckite/honox/style.css` にあり、生成された `.riebeckite/framework-styles.css` 経由で Site に読み込まれます。

一方、

- 記事本文の見た目
- metadata の表示形式
- navigation の配置
- card
- page layout の composition
- island
- Site 固有の visual design と override

は Site Application が管理します。

## Plugin UI の composition

各 component は Plugin から直接 import し、Site が置きたい場所で描画します。`SiteProvider` と、公開 `entry` を渡した `Article` を使うと、component は必要な Plugin データを自動で解決します。配置、順序、表示条件は引き続き Site が管理します。

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

`view` には `createPublicContentView(manifest)` で作成した値を渡します。必要な Context がなければ component は何も描画しないため、共通 layout に置いても安全です。個別の props はカスタマイズ用として残り、Context からの値より優先されます。高度な composition が必要なときは、従来どおり純粋なデータヘルパーを利用できます。

依存方向は `plugin → @riebeckite/ui ← honox` です。Plugin UI を HonoX の barrel から再エクスポートしません。

## Site が持つもの

プリミティブはセマンティックHTML、hook、class と構成、構造CSSを提供します。記事の本文、メタデータの表示形式、navigation の配置、card、ページレイアウトの composition、island、サイトの視覚デザインはサイトのapplicationが管理します。

## 関連用語

- [[glossary/obsidian-vault|Obsidian Vault]]
- [[tag|Tag]]
- [[shortcode|Shortcode]]
- [[callout|Callout]]
- [[sidenote|Sidenote]]
- [[backlink|Backlink]]
- [[glossary/site|Site]]
