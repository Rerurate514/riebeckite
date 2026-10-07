# @riebeckite/plugin-gallery

Markdown からカードギャラリーを生成するプラグインです。YAML を本文に持つ
`gallery` フェンスコードブロックが、レスポンシブなカードグリッドとして描画
されます。テーマギャラリーやプロジェクト紹介、リンク集を HTML を書かずに
作れます。

[English](./README.md)

## 仕組み

````markdown
```gallery
columns: 3
items:
  - title: Default
    description: 落ち着いた読みやすい標準テーマ
    image: /themes/default.png
    href: /themes/default
    meta: v0.1.0
  - title: Gruvbox
    href: /themes/gruvbox
```
````

各要素が 1 枚のカードになります。`href` があるカードは `<a>`、ないカードは
`<div>` として出力されます。`image` を省略するとテキストのみのカードに
なります。グリッドはビルド時に生成されるため、クライアント側 JavaScript は
不要です。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { gallery } from "@riebeckite/plugin-gallery";

export default defineConfig({
  // ...
  plugins: [gallery()],
});
```

## オプション

| オプション | 型 | 既定値 | 説明 |
| ---------- | -- | ------ | ---- |
| `language` | `string` | `"gallery"` | 対象のコードブロック言語 |
| `columns` | `number` | `3` | 既定の列数 |
| `aspect` | `string` | `"4/3"` | 既定の画像アスペクト比 |

```ts
gallery({ columns: 4, aspect: "1/1" });
```

## ブロックのフィールド

| フィールド | 型 | 説明 |
| ---------- | -- | ---- |
| `items` | `GalleryItem[]` | 必須。並び順どおりのカード |
| `columns` | `number` | 列数。プラグインオプションを上書きする |
| `aspect` | `string` | 画像アスペクト比。プラグインオプションを上書きする |

各 `GalleryItem` のフィールドはすべて省略可能ですが、`title` か `image` の
どちらかは指定してください。

| フィールド | 説明 |
| ---------- | ---- |
| `image` | 画像の URL |
| `alt` | 代替テキスト。`title`、次に `""` へフォールバックする |
| `title` | カードの見出し |
| `description` | 補足の説明文 |
| `href` | リンク先。省略すると非インタラクティブなカードになる |
| `meta` | バージョンや日付などの小さなラベル |

## 出力

```html
<div class="rr-gallery" data-rr-gallery style="--rr-gallery-columns:3;--rr-gallery-aspect:4/3">
  <ul class="rr-gallery__items">
    <li class="rr-gallery__item">
      <a class="rr-gallery__card" href="/themes/default">
        <img class="rr-gallery__image" src="/themes/default.png" alt="Default" loading="lazy" decoding="async">
        <span class="rr-gallery__body">
          <span class="rr-gallery__title">Default</span>
          <span class="rr-gallery__description">落ち着いた読みやすい標準テーマ</span>
          <span class="rr-gallery__meta">v0.1.0</span>
        </span>
      </a>
    </li>
  </ul>
</div>
```

## 診断

| コード | 重大度 | 意味 |
| ------ | ------ | ---- |
| `gallery-invalid` | `error` | 本文が不正な YAML、マッピングでない、または `items` / `columns` / `aspect` が不正。ブロックはエラーボックスに置き換わる |
| `gallery-item-incomplete` | `warning` | `title` も `image` も持たない要素がある |

生成される画像には常に `alt` が付与されるため、`quality:img-alt-missing` を
通り抜けます。また `responsive-image`（`srcset`）や `lightbox`（ズーム）とも
そのまま組み合わせられます。

## スタイル

パッケージに `style.css` が含まれます。他のプラグインと同じように読み込みます。

```ts
import "@riebeckite/plugin-gallery/style.css";
```

グリッドは `container-type: inline-size` を使い、`36rem` 未満で 2 列、`22rem`
未満で 1 列に折り返します。

## エクスポート

- `gallery(options?)` — プラグインファクトリ
- `galleryPlugin` — `gallery` のエイリアス
- `parseGallery(source, options)` — ブロック本文をスペックへパースする
- `renderGallery(spec)` / `renderGalleryError(message)` — グリッドまたはエラーボックスを描画する
- `remarkGallery(options?)` — remark トランスフォーム
- `resolveGalleryOptions(options?)` — オプションの既定値を適用する
- 定数: `GALLERY_PLUGIN_NAME`, `GALLERY_CLASS`, `GALLERY_ATTRIBUTE`, `DEFAULT_GALLERY_COLUMNS`, `DEFAULT_GALLERY_ASPECT`
- 型: `GalleryOptions`, `GalleryItem`, `GallerySpec`, `GalleryParseResult`, `GalleryWarning`, `ResolvedGalleryOptions`

## 制約

- 要素は静的なデータです。コンテンツマニフェストへの問い合わせや絞り込みには
  対応しません。その用途には `query` プラグインの table / cards 出力を使って
  ください。
- コンテナクエリによる折り返しは既定の複数列レイアウトを対象にしています。
  `columns: 1` を明示したブロックの見た目は変わりません。

## 関連

- [プラグインガイド](../../../docs/docs/reference/plugin-api.ja.md)

