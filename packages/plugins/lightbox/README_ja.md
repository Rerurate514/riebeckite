# @riebeckite/plugin-lightbox

画像をクリックで拡大表示する lightbox。

[English](./README_en.md)

## 概要

2 つの部分で構成されます。

- **Build（rehype）:** 描画された各 `<img>` を trigger anchor で囲みます
- **Client:** クリックで操作可能な dialog を開きます

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { lightboxPlugin } from "@riebeckite/plugin-lightbox";

export default defineConfig({
  // ...
  plugins: [lightboxPlugin()],
});
```

`style.css` と client entry（`initLightbox`）が登録され、アプリが page
初期化時に呼び出します。

## 動作

### Build (`rehypeLightbox`)

- `<img src>` をそれぞれ
  `<a class="rr-lightbox-trigger">`（`data-lightbox-src`、
  `data-lightbox-alt`、`aria-label` 付き）で囲みます
- image に `rr-lightbox-image` を追加します
- `data-lightbox-ignore="true"` の image、および `<a>`・`<button>`・
  既存 trigger・dialog 内の image はスキップします

### Client (`initLightbox`)

- build 時に変換されなかった `img[src` ] を任意で囲みます
  （`autoWrapImages`、デフォルト on。link / button 内はスキップ）
- image・`alt` caption・close button を備えた `role="dialog"` の overlay を
  作成します
- `Escape`・backdrop クリック・close button で閉じます
- 開く前にフォーカスしていた要素へ focus を戻します
- 開いている間は `html[data-lightbox-open="true"]` を設定します
  （CSS による scroll lock）
- listener・dialog・囲んだ image を解除する cleanup function を返します

## オプション

| オプション | 型 | デフォルト | 説明 |
| ---------- | -- | ---------- | ---- |
| `selectorClass` | `string` | `"rr-lightbox-trigger"` | trigger class（build / client 共通） |
| `autoWrapImages` | `boolean` | `true` | client 専用: 初期化時に未処理の image を囲む |

`LightboxOptions` = `{ selectorClass? }`（build）、
`LightboxInitOptions` = `LightboxOptions & { autoWrapImages? }`（client）。

## エクスポート

- `lightboxPlugin(options?)` — plugin factory
- `rehypeLightbox(options?)` — rehype transform
- `initLightbox(root?, options?)` — client initializer。cleanup function を
  返します
- 型: `LightboxOptions`、`LightboxInitOptions`

## 関連

- [Plugin ガイド](../../docs/plugins_jp.md)
