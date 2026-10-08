<!-- Generated from packages/plugins/discord-embed/README_ja.md. Do not edit this page directly; edit the package README and run `pnpm docs:sync`. -->

# Discord Embed

Discord のリンクプレビュー向けに、各ページの `<head>` を補完するプラグインです。

Discord の `Discordbot` は共有されたページの `<head>` メタデータを読んでプレビューカードを組み立てます。
`seo` プラグインが共通の `og:*` と `twitter:*` を出力するのに対し、このプラグインは Discord 固有の不足分だけを追加します。

- 埋め込みの左側ボーダー色に使われる `<meta name="theme-color">`
- `og:image:alt`（任意で `og:image:width` / `og:image:height`）

[English](./discord-embed.md)

## 設定する

```ts
import { defineConfig } from "@riebeckite/core";
import { discordEmbed } from "@riebeckite/plugin-discord-embed";

export default defineConfig({
  // ...
  plugins: [discordEmbed()],
});
```

## オプション

| オプション | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `themeColor` | `string` | `"#5865F2"` | 埋め込みのアクセントカラー。Discord の blurple |
| `imageAlt` | `boolean` | `true` | 画像がある記事に `og:image:alt` を出力する |
| `imageDimensions` | `boolean` | `true` | 画像サイズが分かる記事に `og:image:width` / `og:image:height` を出力する |

`themeColor` は `#rgb`、`#rgba`、`#rrggbb`、`#rrggbbaa` のいずれかを受け付けます。

## Frontmatter

| フィールド | 用途 |
| --- | --- |
| `theme_color` / `themeColor` / `discord_color` | この記事だけ埋め込みカラーを上書きする |
| `ogImage` / `image` | 画像の有無を判定し、`og:image:alt` などを付ける |
| `ogImageWidth` / `imageWidth` | 画像の幅 |
| `ogImageHeight` / `imageHeight` | 画像の高さ |

色の解決順は、frontmatter の上書き、なければ `themeColor` オプションです。
frontmatter の色が無効な場合は診断 `discord-embed-invalid-color`（warning）を記録し、オプションの既定値へフォールバックします。

## 出力するタグ

`onManifestCreated` フックで、すべてのエントリーに `entry.headTags` を設定します。

```html
<meta name="theme-color" content="#1ABC9C" />
<meta property="og:image:alt" content="記事タイトル" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
```

## Site shell が headTags を描画する

このプラグインは `<head>` を所有しません。プラグインが提供するのは `ContentManifestEntry.headTags` であり、描画するかどうかは Site が決めます。
Site の route が `c.set("headTags", entry.headTags ?? [])` を設定し、`app/routes/_renderer.tsx` がそれを `<meta>` / `<link>` / `<script>` に変換します。
詳しくは [HonoX Integration](../framework/honox-integration.ja.md) の "Site Application の拡張 contract" を参照してください。

## 主なエクスポート

- `discordEmbed(options?)` / `discordEmbedPlugin(options?)`: プラグインを作成する
- `buildDiscordHeadTags(entry, options, diagnostics)`: エントリーの head タグを組み立てる
- `resolveDiscordEmbedOptions(options?)`: 既定値を解決する
- 型: `DiscordEmbedOptions`、`ResolvedDiscordEmbedOptions`

## 関連資料

- [HonoX Integration](../framework/honox-integration.ja.md)
- [プラグインシステム](../reference/plugin-api.ja.md)
