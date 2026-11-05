---
date: 2026-10-08
title: サイトのアイコンとロゴ
---
# サイトのアイコンとロゴ

[[glossary/theme|テーマ]]は、色、[[glossary/typography|タイポグラフィ]]、余白、レイアウトなど、Riebeckite サイトの見た目を決めます。一方、サイトをそのサイトらしくするアイコン、ヘッダーのロゴ、リンクプレビュー画像はテーマの外側にあります。このガイドでは、これらのアセットを差し替えます。サイト全体の見た目を変えたい場合は、[最初のテーマを変える](../getting-started/first-theme.ja.md)を参照してください。

## サイトアイコン

生成されたサイトにはプレースホルダーの `public/favicon.ico` が含まれます。`app/routes/_renderer.tsx` の `RiebeckiteHead` が、既定で次のリンクを追加します。

```tsx
<link rel="icon" href="/favicon.ico" />
```

この構成のまま使う場合は、`public/favicon.ico` を同じ名前の ICO ファイルで置き換えます。コードの変更は不要です。

PNG や SVG を使う場合は、ファイルを `public/` に置き、そのパスを `RiebeckiteHead` に渡します。

```tsx
<RiebeckiteHead
  faviconHref="/favicon.svg"
  seo={c.get("seo")}
  themeStyle={themeStyle}
  themeStylesheets={getThemeStylesheets(config.theme.stylesheets)}
/>
```

ブラウザーはファイル拡張子から形式を判断します。`type` 属性を明示する必要がある場合は、`faviconHref={null}` で既定のリンクを無効にし、同じ `<head>` 内に独自の `<link>` を追加します。

## ヘッダーのロゴ

`empty` と `minimal` を除くすべての[[glossary/preset|プリセット]]でヘッダーが表示されます。`app/components/site-header.tsx` は、28×28 のロゴの隣にサイト名を表示します。

```tsx
<img src="/riebeckite-logo.png" alt="" class="site-header__logo" width="28" height="28" />
```

`public/riebeckite-logo.png` を自分の画像に置き換えます。正方形で背景が透明な PNG がレイアウトになじみます。ファイル名を変える場合は、`src` も合わせて変更します。

`empty` と `minimal` のプリセットにはヘッダーがないため、置き換えるロゴもありません。

## リンクプレビュー画像

リンクプレビュー（Open Graph 画像）では、フォールバックとして `site.defaultOgImage` が使われます。`riebeckite.config.ts` の `site` に追加します。

```ts
site: {
  title: "My Blog",
  baseUrl: "https://example.com",
  defaultOgImage: "/ogp.png",
},
```

ファイルは `public/` に置きます（この例では `public/ogp.png` が `/ogp.png` で配信されます）。1200×630 の PNG または JPEG が一般的なサイズです。`site.baseUrl` を実際の公開 URL に設定しておくと、生成されるメタデータの画像 URL が正しくなります。

ページごとに画像を上書きすることもできます。[SEO プラグイン](../plugins/seo.ja.md)は、[[glossary/frontmatter|フロントマター]]の `image` / `ogImage` を読み取り、なければ `site.defaultOgImage` を使います。

## タイトルと説明

`site.title` はサイト名、`site.description` は SEO やフィードで使われる説明です。[サイト設定を確認する](../getting-started/installation.ja.md#サイト設定を確認する)で一度だけ設定します。`site` ブロックの全体は[設定](../reference/configuration.ja.md)を参照してください。

## 確認

開発サーバーを起動し、ブラウザーのタブとヘッダーを確認します。

```bash
npm exec riebeckite dev
```

続けてビルドし、アセットが `dist/` にコピーされることを確認します。

```bash
npm exec riebeckite build
```
