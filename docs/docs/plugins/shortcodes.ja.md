<!-- Generated from packages/plugins/shortcodes/README_ja.md. Do not edit this page directly; edit the package README and run `pnpm docs:sync`. -->

# Shortcodes

`remark-directive` を使う汎用ショートコード機能です。

[English](./shortcodes.md)

## 概要

`shortcodes()` は `remark-directive` の記法を Markdown 処理時に HTML へ変換
します。インライン型（`:name[label]{key=value}`）、ブロックのリーフ型
（`::name[label]{key=value}`）、コンテナ型（`:::name[label]{attrs}` … `:::`）
に対応し、組み込みレンダラーに独自のレンダラーを重ねられる拡張可能な
レジストリを備えます。

インライン型は段落の中の `span` として、リーフ型とコンテナ型は `div` として
描画されます。ラッパーには `rb-shortcode rb-shortcode--<name>` が付きます。

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
:badge[新着]{variant=success}

::kbd[Ctrl+S]

::youtube[id=dQw4w9WgXcQ]

:::note[補足]{type=warning}
コンテナの本文では **Markdown** が使えます。
:::
```

- `:name[label]{key=value}` — インライン型。現在の段落の中の `span` として
  描画されます。インラインで使えるのは `inlineShortcodes` に含まれる名前だけ
  で、組み込みでは `badge`、`kbd`、`link-card`、`file` が該当します。
- `::name[label]{key=value}` — ブロックのリーフ型。`div` として描画されます。
- `:::name[label]{key=value}` … `:::` — コンテナ型。本文は通常の Markdown
  パイプラインで描画されます。

ブロック専用のショートコードを `:` で書くと
`shortcodes-inline-unsupported` 診断を出し、エスケープしたテキストとして
ページに残します。未知のショートコードは `shortcodes-unknown` 診断を出し、
不正な属性は `shortcodes-invalid` を出して無視します。

## 組み込みショートコード

| 名前 | 種類 | インライン | 属性 | 出力 |
| ---- | ---- | ---------- | ---- | ---- |
| `figure` | リーフ / コンテナ | – | `src`/`url`/`image`, `alt`, `caption`, `width`, `height` | 画像とキャプションの `<figure>` |
| `youtube` | リーフ | – | `id`/`video` または `url`/`src`, `title` | `youtube-nocookie.com` のプライバシー配慮埋め込み |
| `vimeo` | リーフ | – | `id`/`video` または `url`/`src`, `title` | `player.vimeo.com` 埋め込み（`dnt=1`） |
| `gist` | リーフ | – | `user` + `id`、または `url`, `file` | `<noscript>` リンク付きの Gist 埋め込み |
| `kbd` | リーフ | 可 | ラベルまたは `keys` | `+` で分割した `<kbd>` |
| `badge` | リーフ | 可 | ラベルまたは `text`, `variant`/`type`/`color`, `title` | インラインバッジ |
| `details` | コンテナ | – | ラベルまたは `summary`, `open` | `<details>` 折りたたみ |
| `spoiler` | コンテナ | – | ラベルまたは `summary`, `open` | クラス違いの `details` エイリアス |
| `note` | リーフ / コンテナ | – | ラベルまたは `title`, `type`/`variant` | コールアウト |
| `callout` | リーフ / コンテナ | – | ラベルまたは `title`, `type`/`variant` | クラス違いの `note` エイリアス |
| `link-card` | リーフ | 可 | `url`/`href`, `title`, `description`, `image`/`icon` | リンクプレビューカード |
| `file` | リーフ | 可 | `url`/`src`/`path`, `name`/`label`, `size` | ダウンロードリンク |

## 実際のレンダリング

以下の例では、組み込みショートコード全12種類の使い方を紹介します。各例では Markdown の記法と、その直下にショートコード自体を記載しています。Shortcodes プラグインが有効な場合、実際のレンダリング結果を確認できます。

### バッジ（badge）

文章の途中にステータスやラベルを表示できます。

```md
この機能は :badge[新着]{variant=success} です。

現在の状態: :badge[ベータ版]{variant=warning}
```

この機能は :badge[新着]{variant=success} です。

現在の状態: :badge[ベータ版]{variant=warning}

### キーボード（kbd）

キーボードショートカットを意味的に適切な `<kbd>` 要素で表示できます。

```md
変更を保存するには :kbd[Ctrl+S] を押してください。

検索を開くには :kbd[Ctrl+K] を使用します。
```

変更を保存するには :kbd[Ctrl+S] を押してください。

検索を開くには :kbd[Ctrl+K] を使用します。

### ノート（note）

ヒントや補足情報などを目立たせて表示できます。

```md
:::note[ヒント]{type=info}
このコンテナ内では **Markdown** を使用できます。

- リスト
- **太字**
- [リンク](https://example.com)
:::
```

:::note[ヒント]{type=info}
このコンテナ内では **Markdown** を使用できます。

- リスト
- **太字**
- [リンク](https://example.com)
:::

### コールアウト（callout）

重要な通知や警告を表示できます。`callout` は `note` のエイリアスで、異なる CSS クラスが適用されます。

```md
:::callout[注意]{type=warning}
設定ファイルを変更した場合は、サイトを再ビルドしてください。
:::
```

:::callout[注意]{type=warning}
設定ファイルを変更した場合は、サイトを再ビルドしてください。
:::

### 折りたたみ（details）

クリックすると追加のコンテンツを展開できるセクションを作成できます。

```md
:::details[詳細を表示]
このコンテンツは、セクションを展開するまで非表示になります。

**Markdown** やリストも使用できます。

- 項目 A
- 項目 B
:::
```

:::details[詳細を表示]
このコンテンツは、セクションを展開するまで非表示になります。

**Markdown** やリストも使用できます。

- 項目 A
- 項目 B
:::

### スポイラー（spoiler）

コンテンツを折りたたみセクション内に隠せます。`spoiler` は `details` と同様に動作しますが、異なる CSS クラスが適用されます。

```md
:::spoiler[ネタバレを表示]
ユーザーがこのセクションを展開すると、隠されたコンテンツが表示されます。

ここでも **Markdown** を使用できます。
:::
```

:::spoiler[ネタバレを表示]
ユーザーがこのセクションを展開すると、隠されたコンテンツが表示されます。

ここでも **Markdown** を使用できます。
:::

### 画像（figure）

意味的に適切な `<figure>` 要素を使用して、キャプションやサイズを指定した画像を表示できます。

```md
::figure[サンプル画像]{src="https://placehold.co/800x400/png" alt="サンプルのプレースホルダー画像" caption="Figure 1: 画像の表示例"}
```

::figure[サンプル画像]{src="https://placehold.co/800x400/png" alt="サンプルのプレースホルダー画像" caption="Figure 1: 画像の表示例"}

### YouTube

プライバシーに配慮した `youtube-nocookie.com` ドメインを使用して、YouTube 動画を埋め込めます。

```md
::youtube[id=dQw4w9WgXcQ]
```

::youtube[id=dQw4w9WgXcQ]

### Vimeo

`dnt=1` プライバシーパラメータを使用して、Vimeo 動画を埋め込めます。

```md
::vimeo[id=76979871]
```

::vimeo[id=76979871]

### GitHub Gist

GitHub Gist のコードスニペットをページ内に直接埋め込めます。JavaScript が無効な環境では、代替リンクが提供されます。

```md
::gist{user=octocat id=aa5a315d61ae9438b18d}
```

::gist{user=octocat id=aa5a315d61ae9438b18d}

### リンクカード（link-card）

外部リンクをタイトルや説明付きのプレビューカードとして表示できます。

```md
::link-card[GitHub]{url="https://github.com" title="GitHub" description="コードのホスティングとソフトウェア開発の共同作業を行うためのプラットフォーム"}
```

::link-card[GitHub]{url="https://github.com" title="GitHub" description="コードのホスティングとソフトウェア開発の共同作業を行うためのプラットフォーム"}

### ファイル（file）

ファイル名やサイズを指定したダウンロードリンクを作成できます。

```md
::file[サンプルPDF]{url="https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" name="sample.pdf" size="13 KB"}
```

::file[サンプルPDF]{url="https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" name="sample.pdf" size="13 KB"}

上記のコードブロックは元の Markdown 記法を示しています。その直下のショートコードは、Shortcodes プラグインを有効にした Riebeckite で処理された際の、実際のレンダリングを確認するための例です。

## オプション

| オプション | 型 | 既定値 | 説明 |
| ---------- | -- | ------ | ---- |
| `className` | `string` | `"rb-shortcode"` | すべてのラッパーのルート CSS クラス |
| `language` | `string` | – | ラッパーの `lang` に付与する BCP-47 タグ |
| `builtins` | `boolean` | `true` | 組み込みレンダラーを登録する |
| `shortcodes` | `Record<string, ShortcodeRenderer>` | `{}` | 組み込みに重ねる独自レンダラー |
| `inlineShortcodes` | `readonly string[]` | `[]` | インラインの `:` 形式で使える名前に追加する |

## 独自レンダラー

```ts
import { shortcodes } from "@riebeckite/plugin-shortcodes";

shortcodes({
  shortcodes: {
    mark: ({ label, attributes }) => `<mark>${label}</mark>`,
  },
  inlineShortcodes: ["mark"],
});
```

`ShortcodeRenderer` は `{ name, label, attributes, childrenHtml, context,
container }` を受け取り、文字列を返します。独自レンダラーをインラインの `:`
形式で使うには、その名前を `inlineShortcodes` に追加します。コンテナ型では
結果が `<div class="rb-shortcode rb-shortcode--<name>">` でラップされ、
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
- `builtinInlineShortcodes` — インラインの `:` 形式で使える組み込み名
- 型: `ShortcodeRenderer`, `ShortcodeOptions`, `ResolvedShortcodeOptions`,
  `ShortcodeRenderInput`, `ShortcodeRenderRequest`, `ShortcodeAttributes`,
  `RemarkShortcodesOptions`

## 関連

- [プラグインガイド](../reference/plugin-api.ja.md)
