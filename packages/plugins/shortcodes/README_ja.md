# @riebeckite/plugin-shortcodes

`remark-directive` を土台にした汎用ショートコード機能です。

[English](./README.md)

## 概要

`shortcodes()` は `remark-directive` の記法を Markdown 処理時に HTML へ変換
します。リーフ型（`::name[label]{key=value}`）とコンテナ型
（`:::name[label]{attrs}` … `:::`）の両方に対応し、組み込みレンダラーに
独自のレンダラーを重ねられる拡張可能なレジストリを備えます。

出力は `mdast` の `html` ノードとして書き出され、リーフは `span`、コンテナは
`div` で `rb-shortcode rb-shortcode--<name>` を付けてラップされます。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { shortcodes } from "@riebeckite/plugin-shortcodes";

export default defineConfig({
  // ...
  plugins: [shortcodes()],
});
```

スタイルは `style.css` に同梱されています。

## 記法

```
::kbd[Ctrl+S]

::youtube[id=dQw4w9WgXcQ]

:::note[補足]{type=warning}
コンテナの本文では **Markdown** が使えます。
:::
```

- `::name[label]{key=value}` — リーフ型。インラインで描画されます。
- `:::name[label]{key=value}` … `:::` — コンテナ型。本文は通常の Markdown
  パイプラインで描画されます。

未知のショートコードは `shortcodes-unknown` 診断を出し、エスケープした
テキストとしてページに残します。不正な属性は `shortcodes-invalid` を出して
無視します。

## 組み込みショートコード

| 名前 | 種類 | 属性 | 出力 |
| ---- | ---- | ---- | ---- |
| `figure` | リーフ / コンテナ | `src`/`url`/`image`, `alt`, `caption`, `width`, `height` | 画像とキャプションの `<figure>` |
| `youtube` | リーフ | `id`/`video` または `url`/`src`, `title` | `youtube-nocookie.com` のプライバシー配慮埋め込み |
| `vimeo` | リーフ | `id`/`video` または `url`/`src`, `title` | `player.vimeo.com` 埋め込み（`dnt=1`） |
| `gist` | リーフ | `user` + `id`、または `url`, `file` | `<noscript>` リンク付きの Gist 埋め込み |
| `kbd` | リーフ | ラベルまたは `keys` | `+` で分割した `<kbd>` |
| `badge` | リーフ | ラベルまたは `text`, `variant`/`type`/`color`, `title` | インラインバッジ |
| `details` | コンテナ | ラベルまたは `summary`, `open` | `<details>` 折りたたみ |
| `spoiler` | コンテナ | ラベルまたは `summary`, `open` | クラス違いの `details` エイリアス |
| `note` | リーフ / コンテナ | ラベルまたは `title`, `type`/`variant` | コールアウト |
| `callout` | リーフ / コンテナ | ラベルまたは `title`, `type`/`variant` | クラス違いの `note` エイリアス |
| `link-card` | リーフ | `url`/`href`, `title`, `description`, `image`/`icon` | リンクプレビューカード |
| `file` | リーフ | `url`/`src`/`path`, `name`/`label`, `size` | ダウンロードリンク |

## オプション

| オプション | 型 | 既定値 | 説明 |
| ---------- | -- | ------ | ---- |
| `className` | `string` | `"rb-shortcode"` | すべてのラッパーのルート CSS クラス |
| `language` | `string` | – | ラッパーの `lang` に付与する BCP-47 タグ |
| `builtins` | `boolean` | `true` | 組み込みレンダラーを登録する |
| `shortcodes` | `Record<string, ShortcodeRenderer>` | `{}` | 組み込みに重ねる独自レンダラー |

## 独自レンダラー

```ts
import { shortcodes } from "@riebeckite/plugin-shortcodes";

shortcodes({
  shortcodes: {
    mark: ({ label, attributes }) => `<mark>${label}</mark>`,
  },
});
```

`ShortcodeRenderer` は `{ name, label, attributes, childrenHtml, context,
container }` を受け取り、文字列を返します。コンテナ型では結果が
`<div class="rb-shortcode rb-shortcode--<name>">` でラップされ、
`childrenHtml` の位置に本文が差し込まれます。コンテナ用レンダラーは本文を
置きたい位置で `input.childrenHtml` をそのまま出力してください。レンダラーは
同期関数で、ユーザー入力のエスケープは各自で行う必要があります
（`@riebeckite/core` の `escapeHtml` / `escapeHtmlAttribute` を再エクスポート
しています）。

## エクスポート

- `shortcodes(options?)` / `shortcodesPlugin` — プラグインファクトリ
- `remarkShortcodes(options?)` — 単体で使える remark トランスフォーム
- `renderShortcode(request, options)` — 単一ショートコードの描画
- `resolveShortcodeOptions(options?)` — オプションの正規化
- `builtinShortcodes`, `builtinShortcodeNames` — 組み込みレジストリ
- 型: `ShortcodeRenderer`, `ShortcodeOptions`, `ResolvedShortcodeOptions`,
  `ShortcodeRenderInput`, `ShortcodeRenderRequest`, `ShortcodeAttributes`,
  `RemarkShortcodesOptions`

## 関連

- [プラグインガイド](../../../docs/ja/docs/reference/plugin-api.md)

