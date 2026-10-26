# @riebeckite/plugin-image-optimizer

<!-- Generated from docs/docs/plugins/image-optimizer.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

公開される Markdown の画像アセットを、レスポンシブな WebP・AVIF に変換します。

[English](./README.md)

## 使い方

```ts
import { imageOptimizer } from "@riebeckite/plugin-image-optimizer";
import { responsiveImage } from "@riebeckite/plugin-responsive-image";

export default defineConfig({
  plugins: [imageOptimizer(), responsiveImage()],
});
```

`imageOptimizer()` は `responsiveImage()` より先に実行されます。生成した画像は公開アセットのマニフェストに登録されるため、レスポンシブ画像のマークアップは実際に出力されるファイルだけを参照します。

## 出力

Sharp が読み取れる JPEG、PNG、WebP、AVIF を入力として扱えます。`images/photo.png` の既定出力は次のとおりです。

- `images/photo-640.webp`
- `images/photo-640.avif`
- `images/photo-1280.webp`
- `images/photo-1280.avif`
- `images/photo-1920.webp`
- `images/photo-1920.avif`

元画像以上の幅は生成しません。元の公開画像は Core の通常のコンテンツアセット出力によって保持されます。`keepMetadata` を有効にしない限り、EXIF を含むメタデータは除去されます。

## 実行例

このサイトでは、`imageOptimizer()` が生成した画像バリアントを `responsiveImage()` 経由で配信しています。

![riebeckite-logo-horizontal.png](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/riebeckite-logo-horizontal.png.ja.md)

## オプション

| オプション | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `widths` | `number[]` | `[640, 1280, 1920]` | 生成する幅 |
| `formats` | `("webp" \| "avif")[]` | `['webp', 'avif']` | 出力形式 |
| `quality` | `number` | `80` | 1〜100 に制限される Sharp の画質 |
| `keepMetadata` | `boolean` | `false` | EXIF を含む入力メタデータを残す |
| `maxInputBytes` | `number` | `52428800` | これより大きい入力をスキップする |

変換対象は、ルーティング可能な公開 Markdown から参照されるアセットだけです。パスは Core が検証し、出力は通常の衝突検出に参加します。変更のない SSG ビルドでは、Sharp を再実行せず既存の出力キャッシュを再利用します。
