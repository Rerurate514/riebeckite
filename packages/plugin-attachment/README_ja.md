# @riebeckite/plugin-attachment

Obsidian wikilink 向けの attachment link / embed card 描画。

[English](./README_en.md)

## 概要

`attachment()` は `renderAttachment` hook を提供します。
`@riebeckite/plugin-obsidian-markdown` が wikilink を image 以外のファイル
（`[[report.pdf]]`、`![[report.pdf]]` など）に解決したときに使われます。

この plugin が無い場合、これらの wikilink は単純な download link に
フォールバックします。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { attachment } from "@riebeckite/plugin-attachment";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";

export default defineConfig({
  // ...
  plugins: [obsidianMarkdown(), attachment()],
});
```

## 描画

### link（非 embed）

```html
<a class="wikilink wikilink-attachment" href="..." download>label</a>
```

### embed（`![[file]]`）

```html
<aside class="attachment-card" data-attachment-path="...">
  <div class="attachment-card__meta">
    <span class="attachment-card__format">PDF</span>
    <span class="attachment-card__size">1.2 MB</span>
  </div>
  <div class="attachment-card__name">report.pdf</div>
  <a class="attachment-card__download" href="..." download>label</a>
</aside>
```

- format は大文字にしたファイル拡張子
- size は `config.content.directory` 配下のファイルから読み取ります
  （path traversal 対策済み）。読めない場合は表示しません

スタイルは `style.css` に同梱されています（inline link には `↓` が
付きます）。

## オプション

| オプション | 型 | デフォルト | 説明 |
| ---------- | -- | ---------- | ---- |
| `showSize` | `boolean` | `true` | ファイルサイズを読み取り、embed card に表示 |

## エクスポート

- `attachment(options?)` / `attachmentPlugin` — plugin factory
- 型: `AttachmentOptions`

## 関連

- [Plugin ガイド](../../docs/plugins_jp.md)
- [`@riebeckite/plugin-obsidian-markdown`](../plugin-obsidian-markdown/README_ja.md)
