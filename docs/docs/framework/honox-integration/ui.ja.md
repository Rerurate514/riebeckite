---
title: UI Primitive
sidebar:
  label: UI Primitive
  order: 10
---
# UI Primitive

`@riebeckite/honox/ui` は UI framework ではありません。

Site が独自のデザインを作りながら、Riebeckite と共通の HTML 構造を利用するための小さな primitive set です。

公開されている主な component は次のとおりです。

- `Article`
- `ArticleLayout`
- `ArticleHeader`
- `ArticleContent`
- `ArticleBody`
- `PageBody`
- `ArticleMeta`
- `ArticleFooter`
- `ContentSlot`
- `Sidebar`

対応する `*Props` 型も公開されています。`ContentSlot` には `hasSlot(slots, name)` という純粋 helper が対応し、`ARTICLE_SLOT` 定数が標準 slot 名を提供します。

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

`ContentSlot` は `slots` map から slot 名で HTML fragment を取り出し、`data-slot` を付けて描画します。存在しない slot、空文字、whitespace のみの slot は何も描画しません。`class` / `className` で Site 固有 class を追加できます。slot 名から semantic 要素を推測するような暗黙の mapping は行いません。

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

## 使用例

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

`ArticleHeader` は children または HTML input prop を受け取ります。`ArticleContent` は children を受け取ります。レンダリング済み Markdown 本文は `ArticleBody` に渡してください。

Primitive は composition point として使用し、構造は Framework の hook CSS が、見た目は Site 側が定義してください。

また、

```text
@riebeckite/honox/src/
```

以下を直接 import しないでください。

公開 API として記載されていない内部 component に依存することも避けてください。
