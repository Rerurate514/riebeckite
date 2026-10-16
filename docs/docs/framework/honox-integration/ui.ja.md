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

Plugin はデータヘルパーと JSX コンポーネントを公開し、Site は自分の TSX でこれらを composition します。各 Plugin のデータヘルパーは `PublicContentView`（または同様のフィルタされたファサード）を受け取り、型付き model を返します。その後、component は直接描画され、Site は配置、順序、コンディショナルレンダリングの全てを制御します。

`bodySlots` map も `ContentSlot` プリミティブも存在しません。

代わりに：

- Plugin はデータヘルパー（例：`getProperties`）をエクスポートし、狭い input を受けて model を返します
- Plugin は JSX コンポーネント（例：`<Properties />`）をエクスポートし、型付き props を受け入れます
- Site は必要な箇所で import して描画します：`<Properties data={data} />`

これは削除された body-slot システムを置き換えます：Site はすべての描画決定を所有し、Plugin は HTML フラグメントの累積ではなく型付きデータ + component を提供します。

```tsx
import { getProperties } from "@riebeckite/plugin-properties";
import { Properties } from "@riebeckite/plugin-properties/components";

const data = getProperties({ view, frontmatter: entry.frontmatter });
<Properties data={data} />
```

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