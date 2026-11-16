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

### 既存の Vault をそのまま読む

`content.directory` を Vault に向けます。サイトディレクトリの外にあっても構いません:

```ts
content: {
  directory: "../vault",
  exclude: [".obsidian/**", "Templates/**"],
},
```

`exclude` は論理パスに対する glob で、公開判定より前に適用されます。除外したノートはリンク解決にも使われません。詳しくは [Obsidian ノートの公開](../obsidian.ja.md) と [コンテンツの選択](../../reference/configuration/content.ja.md) を参照してください。

### SPA ナビゲーションを有効にする

```ts
spa: {
  prefetch: "intent",
  viewTransitions: true,
},
```

最初の読み込み後、対象の内部リンクは次のページを取得して本文だけを置き換えます。ヘッダーとフッターはそのまま残ります。scaffold 済みのサイトは `@riebeckite/spa` に依存しています。詳しくは [SPA ナビゲーション](../spa-navigation.ja.md) を参照してください。

### Open Graph 画像を生成する

プラグインを入れてプリセットを選びます:

```sh
npm install @riebeckite/plugin-og-image
```

```ts
import { ogImage } from "@riebeckite/plugin-og-image";

plugins: [ogImage({ preset: "card" })],
```

`card`・`minimal`・`editorial` が使えます。画像はビルド時に `/_og/` 以下へ生成され、frontmatter の `ogImage` または `image` があればそちらが優先されます。詳しくは [OG Image プラグイン](../../plugins/og-image.ja.md) を参照してください。

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
  <PoweredByRiebeckite />
  <RecentPosts />
  <ArticleFooter class="site-article__footer">
    <Backlinks />
    <RelatedPosts />
  </ArticleFooter>
</ArticleContent>
<aside class="site-article__aside">
  <TableOfContents className="rr-table-of-contents--desktop" />
</aside>
```

After — プロパティパネルを本文の下に移し、最近の記事を aside に移します:

```tsx
<ArticleContent>
  <Breadcrumbs />
  <ArticleBody />
  <Properties />
  <PoweredByRiebeckite />
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

### 記事にローカルグラフを表示する

プラグインを入れて登録します:

```sh
npm install @riebeckite/plugin-local-graph
```

```ts
import { localGraph } from "@riebeckite/plugin-local-graph";

plugins: [localGraph()],
```

記事本文の後ろにコンポーネントを 1 回置きます:

```tsx
// app/components/article.tsx
import { LocalGraph } from "@riebeckite/plugin-local-graph";

// ...ArticleFooter の中:
<ArticleFooter class="site-article__footer">
  <LocalGraph />
  <Backlinks />
  <RelatedPosts />
</ArticleFooter>
```

ページには最大 3 ホップ・320 ノードまで埋め込まれます。切り詰められた場合はその旨が表示され、Depth スライダーは 3 で止まります。詳しくは [Local Graph プラグイン](../../plugins/local-graph.ja.md) を参照してください。

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

Before — `app/style.css` は生成スタイル、プリセットのスタイル、starter 自身のスタイルを import しています:

```css
@import "./.riebeckite/framework-styles.css";
@import "./.riebeckite/plugin-styles.css";
@import "./.riebeckite/theme-styles.css";
@import "./styles/page.css";
@import "./styles/site-header.css";
@import "./styles/site-explorer.css";
@import "./styles/site-footer.css";
@import "./styles/article.css";
@import "./styles/not-found.css";
```

After — 生成スタイルの import を先頭に残したまま、自分のスタイルシートを後ろに足します:

```css
@import "./.riebeckite/framework-styles.css";
@import "./.riebeckite/plugin-styles.css";
@import "./.riebeckite/theme-styles.css";
@import "./styles/page.css";
@import "./styles/site-header.css";
@import "./styles/site-explorer.css";
@import "./styles/site-footer.css";
@import "./styles/article.css";
@import "./styles/not-found.css";
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

### テーマのトークンを上書きする

セマンティックトークンはテーマとプラグインが参照する安定した語彙です。レイヤーなしのサイト CSS で上書きします:

```css
/* app/styles/custom.css */
:is(:root, .rb-theme-root) {
  --rb-color-accent: #c2410c;
  --rb-font-heading: "Newsreader", serif;
}
```

レイヤーなしの宣言はフレームワーク・プラグイン・テーマのレイヤーより優先されるので、`!important` は不要です。詳しくは [デザイントークン](../../framework/theme-system/tokens.ja.md) を参照してください。

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

### Obsidian 記法を使う

starter は `obsidianMarkdown()` を登録しているので、コールアウト・WikiLink・埋め込み・インラインタグ・ブロック参照は設定なしで使えます:

```md
> [!warning]- 移行前にバックアップする
> Vault をバージョン管理に入れておきます。
```

```md
予定は [[Notes/planning]] を見てください。

![[Notes/writing#チェックリスト]]

![[diagram.png|480]]
```

ノートの埋め込みは 3 階層まで再帰的に描画されます。解決できないリンクには `rr-obsidian-wikilink--broken` が付きます。詳しくは [Obsidian Markdown プラグイン](../../plugins/obsidian-markdown.ja.md) を参照してください。

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

### ノートの URL を固定する

`permalink` はファイルパスではなく frontmatter から URL を作ります。プラグインを入れて登録します:

```sh
npm install @riebeckite/plugin-permalink
```

```ts
import { permalink } from "@riebeckite/plugin-permalink";

plugins: [permalink()],
```

単発の URL には `permalink`、移行前の URL には `redirect_from` を指定します:

```md
---
title: About
publish: true
permalink: /about
redirect_from: /about-us
---
```

このプラグインを有効にするとすべての URL が変わります。`id` のないノートにはパス由来のハッシュが付きます。最初のデプロイ前に URL の形を決めてください。詳しくは [Permalink プラグイン](../../plugins/permalink.ja.md) を参照してください。

### frontmatter から公開を制御する

`publish: true` がないノートはビルドに含まれません。その URL へのリクエストは 404 ページになります。未来の日付が付いたノートも同様です:

```md
---
title: 下書きの記事
# publish: true がないので非公開のまま
---
```

詳しくは [コンテンツのセットアップ](../writing-content/setup.ja.md) を参照してください。

### ページを一覧に出さない・公開日時を指定する

`visibility: unlisted` にすると、URL では配信されますが、ナビゲーション・検索・フィード・サイトマップ・タクソノミー・グラフ・バックリンク・関連記事には出ません:

```md
---
title: 共有用リンク
publish: true
visibility: unlisted
---
```

`publishAt` を指定すると、その時刻以降の最初のビルドまでページは隠れます:

```md
---
title: 公開記事
publish: true
publishAt: 2026-12-01T00:00:00.000Z
---
```

公開日時はビルド時にだけ判定されます。ページを出したい時刻にビルドを走らせてください。詳しくは [コンテンツの選択](../../reference/configuration/content.ja.md) を参照してください。

### ノートをシリーズにまとめる

`series` を入れて登録します:

```sh
npm install @riebeckite/plugin-series
```

```ts
import { series } from "@riebeckite/plugin-series";

plugins: [series()],
```

各ノートにシリーズ名と順番を付けます:

```md
---
title: Part 1
publish: true
series: Build a thing
series_order: 1
---
```

記事ごとにナビゲーションを 1 回描画します:

```tsx
// app/components/article.tsx
import { SeriesNavigation } from "@riebeckite/plugin-series";

// ...ArticleBody の後:
<ArticleBody />
<SeriesNavigation />
```

`/series` と `/series/<name>` のページも生成されます。`series_order` のないノートも、番号付きのノートの後ろに並びます。詳しくは [Series プラグイン](../../plugins/series.ja.md) を参照してください。

## 次に読む

- [発見のレシピ](../discovery-recipes.ja.md) — 注目記事、全記事一覧、タグ、フォルダ、シリーズ、アーカイブ
- [デプロイ](../deployment/README.ja.md) — 静的ホスト、Cloudflare Workers、GitHub Actions
- [CLI リファレンス](../../reference/cli.ja.md) — `check`・`doctor`・`build`・`inspect`
- [プリセット](../../getting-started/presets.ja.md) — 各プリセットが最初から登録するもの
