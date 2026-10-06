# サイトのアイコンとロゴ

Theme は、色・タイポグラフィ・余白・レイアウトなど、Riebeckite サイトの見た目を決めます。一方で、サイトをそのサイトらしくするアイコン・ヘッダーのロゴ・リンクプレビュー画像は Theme の外側にあります。このガイドでは、これらのアセットを差し替えます。サイト全体の見た目を変えたい場合は [最初の Theme を変える](../getting-started/first-theme.md) を参照してください。

## サイトアイコン

生成されたサイトには `public/favicon.ico` が含まれ、`app/routes/_renderer.tsx` から参照されています。

```tsx
<link rel="icon" href="/favicon.ico" />
```

この構成のまま使う場合は、`public/favicon.ico` を同じ名前の ICO ファイルで置き換えます。コードの変更は不要です。

PNG や SVG を使う場合は、ファイルを `public/` に置き、`href` を変更します。URL から形式が分からない場合は `type` も指定します。

```tsx
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
```

## ヘッダーのロゴ

`starter` と `showcase` の preset ではヘッダーが表示されます。`app/components/site-header.tsx` は、28×28 のロゴの隣にサイト名を表示します。

```tsx
<img src="/riebeckite-logo.png" alt="" class="site-header__logo" width="28" height="28" />
```

`public/riebeckite-logo.png` を自分の画像に置き換えます。正方形で背景が透明な PNG がレイアウトになじみます。ファイル名を変える場合は `src` も合わせて変更します。

`empty` と `minimal` の preset にはヘッダーがないため、置き換えるロゴもありません。

## リンクプレビュー画像

リンクプレビュー（Open Graph 画像）には、フォールバックとして `site.defaultOgImage` が使われます。`riebeckite.config.ts` の `site` に追加します。

```ts
site: {
  title: "My Blog",
  baseUrl: "https://example.com",
  defaultOgImage: "/ogp.png",
},
```

ファイルは `public/` に置きます（この例では `public/ogp.png` が `/ogp.png` で配信されます）。1200×630 の PNG または JPEG が一般的なサイズです。`site.baseUrl` を実際の公開 URL に設定しておくと、生成されるメタデータの画像 URL が正しくなります。

ページごとに画像を上書きすることもできます。[SEO Plugin](../plugins/seo.md) は frontmatter の `image` / `ogImage` を読み取り、なければ `site.defaultOgImage` を使います。

## タイトルと説明

`site.title` はサイト名、`site.description` は SEO や Feed で使われる説明です。[サイト設定を確認する](../getting-started/installation.md#サイト設定を確認する) で一度だけ設定します。`site` ブロックの全体は [Configuration](../reference/configuration.md) を参照してください。

## 確認

開発サーバーを起動し、ブラウザのタブとヘッダーを確認します。

```bash
npm exec riebeckite dev
```

続けてビルドし、アセットが `dist/` にコピーされることを確認します。

```bash
npm exec riebeckite build
```
