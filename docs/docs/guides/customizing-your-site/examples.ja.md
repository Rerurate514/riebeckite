---
date: 2026-11-13
title: 実例
sidebar.label: 実例
sidebar.order: 40
---
# 実例

生成された starter サイトを起点にした、よくある改造の before/after 例です。各例には触るファイルを明記しています。ファイル全体の対応表は [レイアウト](./layout.ja.md) を見てください。

## 設定だけで済む改造 — `riebeckite.config.ts`

### サイトの基本情報を設定する

`site` ブロックはサイト名・説明・正規 URL・言語・リンクプレビュー画像のフォールバックを決めます:

```ts
site: {
  title: "My Blog",
  description: "静的サイトについてのメモ",
  baseUrl: "https://example.com",
  locale: "ja",
  defaultOgImage: "/ogp.png",
},
```

1200×630 の画像を `public/ogp.png` に置くと `/ogp.png` として配信されます。`baseUrl` は実際に公開する URL にしてください。canonical URL や Open Graph のメタデータはここから作られます。

詳しくは [サイトのブランディング](../branding.ja.md) と [設定](../../reference/configuration.ja.md) を参照してください。

### テーマを変える

テーマのパッケージを入れて、ファクトリを import し、`theme: defaultTheme()` を置き換えます:

```sh
npm install @riebeckite/theme-sakura
```

```ts
import { sakuraTheme } from "@riebeckite/theme-sakura";

export default defineConfig({
  // ...
  theme: sakuraTheme(),
});
```

テーマのファクトリにはオプションも渡せます。すべてのテーマが `colorMode`・`layout`・`preset`・`settings`・`stylesheets` を受け付けます:

```ts
import { gardenTheme } from "@riebeckite/theme-garden";

theme: gardenTheme({
  colorMode: "system",
  preset: "reading",
  settings: { typography: "serif" },
}),
```

config を変えたら dev サーバーを再起動してください。詳しくは [テーマを変える](../../getting-started/first-theme.ja.md) と [テーマ一覧](../../themes/README.ja.md) を参照してください。

### ナビゲーションを自分で決める

Before — 既定のナビゲーションは Vault からリンクを自動で作ります:

```ts
plugins: [navigation()],
```

After — `items` を明示します（`children` で入れ子にできます）。`secondary` は補助リンクです:

```ts
plugins: [
  navigation({
    items: [
      { label: "ガイド", href: "/guide" },
      {
        label: "ノート",
        href: "/notes/planning",
        children: [
          { label: "計画", href: "/notes/planning" },
          { label: "執筆", href: "/notes/writing" },
        ],
      },
    ],
    secondary: [{ label: "GitHub", href: "https://github.com/example/site" }],
  }),
],
```

詳しくは [ページとナビゲーション](./pages-and-navigation.ja.md) と [ナビゲーションのリファレンス](../../reference/configuration/navigation.ja.md) を参照してください。

### SEO の出力をオンにする

Before — starter は sitemap と robots だけ有効にしています:

```ts
seo({ sitemap: true, robots: true }),
```

After — RSS / Atom / JSON のフィードも出力します:

```ts
seo({
  sitemap: true,
  robots: true,
  feed: { rss: true, atom: true, json: true, limit: 30 },
}),
```

ビルド時に `/sitemap.xml`・`/robots.txt`・フィードが生成されます。詳しくは [SEO プラグイン](../../plugins/seo.ja.md) を参照してください。

### コードブロックの見た目を調整する

Before — starter は行番号・コピーボタン・ファイル名・ハイライトを有効にしています:

```ts
codeEnhance({ lineNumbers: true, copyButton: true, filename: true, lineHighlight: true, diffHighlight: true }),
```

After — Shiki のテーマを選び、折りたたみボタンを追加します:

```ts
codeEnhance({
  theme: { light: "github-light", dark: "tokyo-night" },
  lineNumbers: true,
  copyButton: true,
  filename: true,
  lineHighlight: true,
  diffHighlight: true,
  wrapToggle: true,
  collapsible: true,
}),
```

詳しくは [Code Enhance プラグイン](../../plugins/code-enhance.ja.md) を参照してください。

### 関連記事を調整する

```ts
relatedPosts({
  limit: 8,
  minScore: 2,
  headingText: "関連ノート",
}),
```

`limit` は一覧の上限、`minScore` は弱い候補を捨てる閾値、`headingText` は見出しの文言です。詳しくは [Related Posts プラグイン](../../plugins/related-posts.ja.md) を参照してください。

### エイリアスで古い URL をリダイレクトする

ノートの frontmatter に `aliases` があると:

```md
---
title: 古いノート
aliases:
  - legacy-note
---
```

`alias` プラグインが `/legacy-note` を正規パーマリンクへのリダイレクトとして配信します。HTTP ステータスを選べます:

```ts
alias({ status: 301 }),
```

詳しくは [Alias プラグイン](../../plugins/alias.ja.md) を参照してください。

### ホバープレビューを調整する

Before — starter の設定:

```ts
hoverPreview({ delay: 120, excerptLength: 160, selector: 'a[href^="/"]' }),
```

After — 少し遅めに、長めのプレビューを出します:

```ts
hoverPreview({ delay: 300, excerptLength: 240 }),
```

詳しくは [Hover Preview プラグイン](../../plugins/hover-preview.ja.md) を参照してください。

### 多言語サイトにする

`l10n` プラグインを追加して言語を宣言します:

```ts
import { l10n } from "@riebeckite/plugin-l10n";

plugins: [
  l10n({ defaultLang: "ja", languages: ["ja", "en", "zh-CN"] }),
],
```

`defaultLang` は `languages` に含めてください。デフォルト以外の言語には URL プレフィックス、言語スイッチャー、`hreflang` リンクが付きます。詳しくは [多言語化](../localization.ja.md) を参照してください。

## ページとレイアウト — `app/`

### カスタムページを追加する

`app/routes/about.tsx` を作ると、HonoX のファイルベースルーティングで `/about` に配信されます:

```tsx
// app/routes/about.tsx
export default function About() {
  return (
    <main>
      <h1>About</h1>
      <p>自分で作ったページです。</p>
    </main>
  );
}
```

詳しくは [ページとナビゲーション](./pages-and-navigation.ja.md) を参照してください。

### 404 ページをカスタマイズする

`app/routes/_404.tsx` は普通のサイトファイルです:

```tsx
// app/routes/_404.tsx
import type { Context } from "hono";

const handler = (c: Context) => {
  c.status(404);

  return c.render(
    <div class="not-found">
      <p class="not-found__status">404</p>
      <h1>ページが見つかりません</h1>
      <p>
        <a href="/">トップに戻る</a>
      </p>
    </div>,
  );
};

export default handler;
```

`c.status(404)` は必ず残してください。見た目だけ整えて 200 で返すと誤りになります。詳しくは [ページとナビゲーション](./pages-and-navigation.ja.md) を参照してください。

### head に独自のタグを追加する

`app/routes/_renderer.tsx` では、標準の head 描画を担う `RiebeckiteHead` を残したまま、その横に自分のタグを足します:

```tsx
<head>
  <RiebeckiteHead
    faviconHref="/favicon.svg"
    seo={c.get("seo")}
    themeStyle={themeStyle}
    themeStylesheets={getThemeStylesheets(config.theme.stylesheets)}
  />
  <meta name="theme-color" content="#0f172a" />
</head>
```

`faviconHref` でサイトアイコンを差し替えられます。ファイルは `public/` に置いてください。詳しくは [レイアウト](./layout.ja.md) と [サイトのブランディング](../branding.ja.md) を参照してください。

### 記事ページの構成を並べ替える

Before — starter は `app/components/article.tsx` で記事ページを組み立てています:

```tsx
<ArticleContent>
  <Breadcrumbs />
  <Properties />
  <ArticleBody />
  <ArticleFooter class="site-article__footer">
    <Backlinks />
    <RelatedPosts />
  </ArticleFooter>
</ArticleContent>
<aside class="site-article__aside">
  <TableOfContents className="rr-table-of-contents--desktop" />
</aside>
```

After — プロパティパネルを本文の下に移し、aside に最近の記事を追加します:

```tsx
<ArticleContent>
  <Breadcrumbs />
  <ArticleBody />
  <Properties />
  <ArticleFooter class="site-article__footer">
    <Backlinks />
    <RelatedPosts />
  </ArticleFooter>
</ArticleContent>
<aside class="site-article__aside">
  <TableOfContents className="rr-table-of-contents--desktop" />
  <RecentPosts />
</aside>
```

`SiteArticle` は `Article` プリミティブの上に作られたサイトコンポーネントなので、自由に編集できます。詳しくは [レイアウト](./layout.ja.md) を参照してください。

### 記事の横にプラグインのUIを置く

Before — 記事ページは生成された `app/components/article.tsx` だけを使います。

After — aside 用の自作コンポーネントでプラグインコンポーネントを描画し、`article.tsx` から使います:

```tsx
// app/components/article-aside.tsx
import { Backlinks } from "@riebeckite/plugin-backlinks";
import { TableOfContents } from "@riebeckite/plugin-toc";

export function ArticleAside() {
  return (
    <aside>
      <TableOfContents />
      <Backlinks />
    </aside>
  );
}
```

コンテキスト対応のコンポーネントは現在のページをコンテキストから読むので、props は不要です。明示した props があればそちらが優先されます:

```tsx
// app/components/article.tsx
import { ArticleAside } from "./article-aside";

// ...レイアウトの中で:
<ArticleAside />;
```

詳しくは [プラグインとCSS](./plugins-and-css.ja.md) を参照してください。

### ヘッダーのロゴを差し替える

ヘッダーは `app/components/site-header.tsx` でロゴを描画しています:

```tsx
<img src="/riebeckite-logo.png" alt="" class="site-header__logo" width="28" height="28" />
```

最も簡単なのは、`public/riebeckite-logo.png` を自分の正方形の PNG で上書きすることです。コードの変更は不要です。ファイル名を変えた場合は `src` も合わせてください。詳しくは [サイトのブランディング](../branding.ja.md) を参照してください。

### 自分でコンポーネントを作る

```tsx
// app/components/callout.tsx
export function Callout({ children }: { children?: unknown }) {
  return <aside class="callout">{children}</aside>;
}
```

ルートや別のコンポーネントから普通に import して使います:

```tsx
// app/routes/about.tsx
import { Callout } from "../components/callout";

export default function About() {
  return (
    <main>
      <h1>About</h1>
      <Callout>config を変えたら dev サーバーを再起動してください。</Callout>
    </main>
  );
}
```

詳しくは [レイアウト](./layout.ja.md) を参照してください。

### インタラクティブな island を作る

ブラウザ側の動作が必要な UI は、普通の HonoX island として `app/islands/` に置きます:

```tsx
// app/islands/counter.tsx
import { useState } from "hono/jsx";

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button type="button" onClick={() => setCount((c) => c + 1)}>
      {count} 回クリックされました
    </button>
  );
}
```

ルートやコンポーネントからは、他のコンポーネントと同じように import します:

```tsx
// app/routes/about.tsx
import Counter from "../islands/counter";

export default function About() {
  return (
    <main>
      <h1>About</h1>
      <Counter />
    </main>
  );
}
```

`app/client.ts` はすでに `createClient()` を呼んでいるので、追加の設定なしで island は hydrate します。詳しくは [プラグインとCSS](./plugins-and-css.ja.md) を参照してください。

## スタイリング — CSS

### サイト全体の CSS を追加する

Before — `app/style.css` は生成スタイルとプリセットのスタイルだけを import しています:

```css
@import "./.riebeckite/framework-styles.css";
@import "./.riebeckite/plugin-styles.css";
@import "./.riebeckite/theme-styles.css";
@import "./styles/page.css";
```

After — 生成スタイルの import を先頭に残したまま、自分のスタイルシートを後ろに足します:

```css
@import "./.riebeckite/framework-styles.css";
@import "./.riebeckite/plugin-styles.css";
@import "./.riebeckite/theme-styles.css";
@import "./styles/page.css";
@import "./styles/custom.css";
```

`app/.riebeckite/` 以下のファイルは編集しないでください。ビルドのたびに再生成されます。詳しくは [プラグインとCSS](./plugins-and-css.ja.md) を参照してください。

### CSS フックでプラグインの見た目を変える

プラグインは安定したルートフックを公開しています。プラグインの UI は `rr-<feature>`（例: `rr-code`、`rr-search`）、フレームワークの構造には `rb-*` です。レイヤーなしのサイト CSS は、フレームワーク・プラグイン・テーマの通常の宣言より優先されます:

```css
/* app/styles/custom.css */
.rr-code {
  border-radius: 8px;
}

.rr-code__header {
  font-size: 0.75rem;
}
```

詳しくは [UI とアセットのリファレンス](../../reference/plugin-api/ui-and-assets.ja.md) を参照してください。

### ダークモード対応の CSS を書く

セマンティックな `--rb-*` トークン（`--rb-color-accent`、`--rb-color-border`、`--rb-rule-width` など）を使うと、light / dark / system のどのモードでも正しく解決されます:

```css
.my-banner {
  border-bottom: var(--rb-rule-width) solid var(--rb-color-border);
  color: var(--rb-color-accent);
}
```

モード自体で分岐したい場合だけ、テーマルートにスコープを絞ってください。埋め込みの `.rb-theme-root` の中でも効くようにするためです:

```css
:is(:root, .rb-theme-root)[data-rb-mode="dark"] .my-banner {
  background: #0f172a;
}
```

詳しくは [テーマシステムの CSS](../../framework/theme-system/css.ja.md) を参照してください。

## コンテンツ — Markdown / MDX / frontmatter

### MDX でサイトコンポーネントを埋め込む

プラグインは一度だけ `mdx({ trusted: true })` で登録します（`trusted` は必須です。MDX はビルド時に執筆側の JavaScript を評価するため）。そのうえで `.mdx` のページを書きます:

```mdx
---
title: リリースノート
publish: true
---

import { MdxNote } from "../app/components/mdx-note";

# リリースノート

<MdxNote />
```

詳しくは [MDX プラグイン](../../plugins/mdx.ja.md) を参照してください。

### frontmatter をプロパティとして表示する

frontmatter:

```md
---
title: 私のノート
tags: [riebeckite, docs]
status: active
publish: true
---
```

各キーをどう表示するかは `properties()` の設定が決めます:

```ts
properties({
  include: ["tags", "status"],
  fields: {
    tags: { type: "tags", variant: "chips" },
    status: {
      type: "badge",
      variants: { active: "success", draft: "warning", archived: "danger" },
    },
  },
}),
```

詳しくは [Properties プラグイン](../../plugins/properties.ja.md) を参照してください。

### frontmatter から公開を制御する

`publish: true` がないノートはビルドに含まれません。その URL へのリクエストは 404 ページになります。未来の日付が付いたノートも同様です:

```md
---
title: 下書きの記事
# publish: true がないので非公開のまま
---
```

詳しくは [コンテンツのセットアップ](../writing-content/setup.ja.md) を参照してください。
