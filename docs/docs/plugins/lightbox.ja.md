---
date: 2026-10-08
title: Lightbox
---
# Lightbox

記事内の画像をクリックすると、拡大表示用のダイアログを開くプラグインです。

[English](./lightbox.md)

## 仕組み

ビルド時の Rehype 変換と、ブラウザ側の初期化処理の 2 つで構成されます。変換では画像をトリガーリンクで囲み、初期化処理ではアクセシブルなダイアログを用意します。

```ts
import { defineConfig } from "@riebeckite/core";
import { lightbox } from "@riebeckite/plugin-lightbox";

export default defineConfig({
  // ...
  plugins: [lightbox()],
});
```

## 実行例

画像をクリックすると lightbox が開きます。

![[riebeckite-logo.png]]

## 利用時の挙動

- `rehypeLightbox` は各 `<img>` を `.rr-lightbox-trigger` で囲みます。
- `data-lightbox-ignore="true"` の画像、リンク・ボタン・既存トリガー・ダイアログ内の画像は変換しません。
- `initLightbox` は `Escape`、背景クリック、閉じるボタンでダイアログを閉じ、開く前のフォーカスを戻します。
- 開いている間は `html[data-lightbox-open="true"]` を設定するため、CSS でスクロールを止められます。

テーマ側では、`rr-lightbox` のルート要素に `--rr-lightbox-image-border-radius` を指定すると、子要素を選択せずに表示中の画像を調整できます。

## オプション

| オプション | 型 | 既定値 | 内容 |
| --- | --- | --- | --- |
| `selectorClass` | `string` | `"rr-lightbox-trigger"` | トリガーに使う CSS クラス |
| `expandLabel` | `string` | `"Expand image"` | トリガーとダイアログのアクセシブルラベル |
| `closeLabel` | `string` | `"Close"` | 閉じるボタンのアクセシブルラベル |
| `autoWrapImages` | `boolean` | `true` | 初期化時に未処理の画像も囲むか。クライアント側でのみ有効 |

`initLightbox()` はイベントリスナー、ダイアログ、追加したトリガーを片付けるクリーンアップ関数を返します。

## 公開 API

- `lightbox(options?)`：プラグインファクトリ
- `rehypeLightbox(options?)`：Rehype 変換
- `initLightbox(root?, options?)`：ブラウザ初期化関数
- `initLightboxFromOptions(options?)`：プラグインのクライアントスクリプトが呼ぶ初期化関数。オプションを第 1 引数に取る
- `LightboxOptions`、`LightboxInitOptions`：型

## 関連資料

- [[plugin-api|プラグインシステム]]
