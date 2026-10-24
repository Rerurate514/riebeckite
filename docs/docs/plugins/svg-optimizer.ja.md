---
date: 2026-10-24
title: SVG Optimizer
---
# SVG Optimizer

公開 SVG アセットを SVGO で軽量化し、元の公開 URL のまま配信します。

[English](./svg-optimizer.md)

## 使い方

```ts
import { svgOptimizer } from "@riebeckite/plugin-svg-optimizer";

export default defineConfig({
  plugins: [
    svgOptimizer({
      multipass: true,
      preserveViewBox: true,
      preserveAccessibility: true,
    }),
  ],
});
```

このプラグインは、ルーティング可能な公開・unlisted の Markdown から参照される `.svg` を対象にします。通常の Markdown 画像と Obsidian の画像埋め込みの両方に対応します。最適化後のデータは同じパスで元ファイルを置き換えるため、`/images/diagram.svg` のような既存のリンクはそのまま動作します。

## 出力

SVGO がコメント、エディタ用メタデータ、冗長な属性、未使用要素を削除します。既定の設定では、`viewBox`、グラデーション、マスク、クリップパス、要素 ID、`title`、`desc`、ARIA 属性、ID 参照を保持します。

最適化結果が元ファイルより小さい場合だけ採用します。小さくならない場合は元ファイルをそのまま出力し、その判断をキャッシュします。

## オプション

| オプション | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `multipass` | `boolean` | `true` | 出力が小さくならなくなるまで SVGO を繰り返す |
| `preserveViewBox` | `boolean` | `true` | `viewBox` 属性を残す |
| `preserveAccessibility` | `boolean` | `true` | `title`、`desc`、アクセシビリティ属性を残す |
| `keepOriginal` | `boolean` | `false` | 最適化せず元の SVG を配信する |

すべてのオプションは省略できます。既定値のまま、結果が小さくなる SVG だけを最適化します。

## 変換に失敗した場合

読み取れないファイル、不正な UTF-8、壊れた XML、10 MiB を超える SVG は変更せず、警告を出します。最適化の失敗でビルドを止めることはなく、元のアセットが失われることもありません。入力が変わらなければプラグインのキャッシュを再利用するため、変更のないビルドで同じ SVG を再変換しません。

## セキュリティ

最適化はサニタイズではありません。スクリプト、埋め込み HTML、イベントハンドラ、外部参照、CSS インポート、外部エンティティ、危険な URI スキームを含む SVG は最適化せず、警告を出して元のまま配信します。信頼できない SVG を安全にする必要がある場合は、別途サニタイズ処理を行ってください。

## 公開境界

変換対象になるのは、公開または unlisted のエントリから参照されたアセットだけです。draft と scheduled のエントリは読み取りも出力も行いません。SVG 以外のファイルには関与しないため、[Image Optimizer](./image-optimizer.ja.md) と同じ入力取り合いになることなく併用できます。
