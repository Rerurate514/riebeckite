---
date: 2026-11-01
title: Image Compare
---
# Image Compare

`image-compare` フェンスコードブロックから、ビフォー・アフター比較スライダーを生成します。スライダーはビルド時に HTML を出力し、小さなクライアントスクリプトで操作を追加します。JavaScript が動かない場合も 2 枚の画像を並べて読めます。

[English](./image-compare.md)

## 概要

````markdown
```image-compare
before: ./before.png
after: ../assets/after.png
beforeAlt: 変更前
afterAlt: 変更後
orientation: horizontal
label: ホームページ
```
````

`before` と `after` は必須です。画像パスは Markdown 画像と同じ規則でノートからの相対パスとして解決します。外部 URL、プロトコル相対 URL、コンテンツディレクトリの外へ出るパスは拒否します。

ブロックは `<figure>` とネイティブの range input になります。マウス、タッチ、キーボードのすべてで操作でき、1 ページに複数のブロックを置けます。SPA でページが置き換わると、各スライダーのリスナーは破棄されます。

## 設定

```ts
import { defineConfig } from "@riebeckite/core";
import { imageCompare } from "@riebeckite/plugin-image-compare";

export default defineConfig({
  // ...
  plugins: [imageCompare()],
});
```

プラグインは専用のスタイルシートとページ単位のクライアントエントリを登録します。無効にした場合は何も出力しません。

## オプション

| オプション | 型 | 既定値 | 内容 |
| --- | --- | --- | --- |
| `language` | `string` | `"image-compare"` | フェンスコードブロックの言語 |

## ブロックのフィールド

| フィールド | 型 | 既定値 | 内容 |
| --- | --- | --- | --- |
| `before` | `string` | 必須 | 変更前の画像パス |
| `after` | `string` | 必須 | 変更後の画像パス |
| `beforeAlt` | `string` | `"Before"` | 変更前画像の代替テキスト |
| `afterAlt` | `string` | `"After"` | 変更後画像の代替テキスト |
| `orientation` | `"horizontal" \| "vertical"` | `"horizontal"` | スライダーの軸 |
| `label` | `string` | - | 比較の下に出すキャプション |

## 出力とアクセシビリティ

静的な figure には 2 枚の画像と Before / After のラベルを表示します。JavaScript が動くと静的な一覧を隠し、操作可能なステージを表示します。range input はステージ全体を覆い、ネイティブのキーボード操作を保ち、フォーカス時はステージに輪郭を出します。変更後の画像は `clip-path` で切り抜くため、ドラッグ中に画像の位置や縮尺は変わりません。

スタイルは既存の `--rb-color-*` テーマトークンを使い、Default、Light、Dark の各テーマで動作します。グラデーション、ガラス効果、過剰な角丸、アニメーションは使いません。

## 診断

| コード | 重大度 | 内容 |
| --- | --- | --- |
| `image-compare-invalid` | `error` | ブロックが不正、画像が見つからない、または画像パスが未対応。ブロックはエラーボックスに置き換わります |

## 関連資料

- [Gallery](./gallery.ja.md)
- [プラグインシステム](../reference/plugin-api.ja.md)
