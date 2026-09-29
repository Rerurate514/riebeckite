# @riebeckite/plugin-responsive-image

既存の `<img>` に遅延読み込みと、レスポンシブな `<picture>` / `srcset` を付与するプラグインです。参照するのは、すでにコンテンツマニフェストに存在する画像バリアントだけです。

[English](./README.md)

## できること

`responsiveImage()` はビルド時の HTML レイヤーとして動作します。

1. `<img>` に `loading="lazy"` と `decoding="async"` を付与します。すでに属性がある場合は変更しません。
2. `sizes` がなければ追加します。
3. マニフェスト上に存在する兄弟バリアント（`photo.webp`、`photo.avif`、`photo-640.webp`、`photo-640.png` など）を探します。見つかれば `<img>` を `<picture>` に置き換え、形式ごとの `<source>` を並べます。見つからなければ `<img>` のまま、追加属性だけを残します。

URL を捏造することはありません。ファイルを書き出すこともありません。マニフェストが把握しているアセットだけを参照します。

## 設定

```ts
import { defineConfig } from "@riebeckite/core";
import { attachment } from "@riebeckite/plugin-attachment";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import { responsiveImage } from "@riebeckite/plugin-responsive-image";

export default defineConfig({
  // ...
  plugins: [obsidianMarkdown(), attachment(), responsiveImage()],
});
```

`responsiveImage()` は `order: 100` で動作するため、メディアと添付ファイルのレンダラーより後に実行されます。

## オプション

| オプション | 型 | 既定値 | 内容 |
| --- | --- | --- | --- |
| `lazy` | `boolean` | `true` | 未指定時に `loading="lazy"` を付与 |
| `decoding` | `boolean` | `true` | 未指定時に `decoding="async"` を付与 |
| `sizes` | `string` | `"100vw"` | 未指定時に追加する `sizes` |
| `widths` | `number[]` | `[640, 1280, 1920]` | 探索する幅バリアント |
| `formats` | `string[]` | `["webp", "avif"]` | 探索する形式バリアント |
| `className` | `string` | `"rb-responsive-image"` | `<picture>` に付与するクラス |
| `generate` | `boolean` | `false` | 予約 |
| `outputDir` | `string` | 未設定 | 予約 |

## バリアントの探索

バリアントは、マニフェストに登録済みのアセットパスと照合します。

- 形式バリアント: `photo.webp`、`photo.avif`
- 幅バリアント: `photo-640.webp`、`photo-1280.avif`、`photo-1920.png`
- 元の形式の幅バリアント: `photo-640.png`

元の `<img src>` は、サイトのアセット URL（`/attachments/photo.png`）と添付ファイル URL（`/assets/attachments/photo.png`）の両方を試して、マニフェスト上のアセットに対応付けます。対応するアセットが見つからない `<img>` はそのまま残します。

## 制約: 画像のエンコードはしない

このプラグインは、決定的な探索と HTML 変換だけを担当します。既定では新しい画像ファイルを生成しません。`PluginAsset` は `style` と `script` のモジュール指定子しか扱えず、プラグインが任意のバイナリファイルをビルド成果物へ出力する手段を Core は提供していません。

`generate` と `outputDir` は将来のリリース向けの予約で、現在は何もしません。実際のエンコードには Core のファイル出力 API が必要です。それまでは、外部の画像ツールなどでバリアントを事前生成し、元画像の隣にコミットしてください。サイト側では `apps/web/scripts/build_images.ts` が、参照されたボールト内アセットを `public/` へコピーします。

## 公開 API

- `responsiveImage(options?)` / `responsiveImagePlugin` — プラグインファクトリ
- `resolveResponsiveImageOptions(options?)` — 既定値の解決
- `buildResponsiveSrcset(existingPaths, src, options?)` — 純粋な srcset 計画
- `applyResponsiveImages(html, existingPaths, options?)` — HTML 変換
- `collectKnownAssetPaths(manifest)` — マニフェストのアセット集合を取得
- 型: `ResponsiveImageOptions`、`ResolvedResponsiveImageOptions`、`ResponsiveImagePlan`、`ResponsiveImageSource`、`ResponsiveImageVariant`

## ????

- [?????????](../../../docs/ja/plugin-system.md)
