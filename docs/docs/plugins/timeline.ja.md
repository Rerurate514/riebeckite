---
date: 2026-10-24
title: Timeline
---
# Timeline

[English](./timeline.md)

discoverable かつ有効な Frontmatter 日付を持つノートから、時系列ページを生成します。さらに [George-debug/obsidian-timeline](https://github.com/George-debug/obsidian-timeline) の `timeline` / `timeline-labeled` コードブロックをビルド時に描画します。

## インストール

```bash
pnpm add @riebeckite/plugin-timeline
```

## 生成ページ

```ts
import { timeline } from "@riebeckite/plugin-timeline";

export default {
  plugins: [timeline()],
};
```

既定では、`date`、`published`、`created` の順で最初に有効な値を持つ discoverable なノートを、古い順に掲載します。draft、公開前の scheduled、unlisted のノートは掲載しません。ここで使う Frontmatter 日付と、インライン Timeline 内の日付ラベルは別のものです。

自動選択は selector で絞り込めます。folders と tags は OR 条件で、`exclude` が常に優先します。フォルダは正規化してディレクトリ境界で比較し、タグは Riebeckite の既存の正規化規則を使います。

```ts
timeline({
  basePath: "/timeline",
  include: {
    folders: ["Events", "Projects/History"],
    tags: ["release", "milestone"],
  },
  exclude: { tags: ["hidden"] },
});
```

`timeline: true` は日付付きノートを明示的に掲載し、`timeline: false` は明示的に除外します。ただし公開境界と `exclude` が優先されます。従来の「印を付けたノートだけ」の動作を再現するには `selection: "marked"` を指定します。旧 `key` オプションも維持し、この真偽値マーカーのキー名を変えられます（既定値: `"timeline"`）。

## インライン Obsidian 記法

どちらの記法もイベントの入力順を保持します。日付ラベルは文字列なので、`2026年`、`17th century`、`Before launch` のような値を日付へ変換する必要はありません。

````md
```timeline
[line-3, body-2, active-color-text-accent]
+ 2026-01-01
+ 開発開始
+ **Riebeckite** の開発を開始しました。

+ Before launch
+ 初回リリース
+ 詳細は [[release-notes]] を参照してください。
```

```timeline-labeled
date: 2026-06-01
title: 初回リリース
content:
最初のバージョンを公開しました。

date: 17th century
title: 歴史上の出来事
content:
本文は複数段落にできます。
```
````

空行と複数行本文を使えます。日付、タイトル、本文の Markdown は通常の Pipeline を通るため、リンク、インラインコード、Obsidian Wiki Link（対応プラグイン有効時）を使えます。HTML、URL、リンク解決、公開範囲は既存のサニタイズと公開境界に従います。

対応する Obsidian オプションは `line-2`〜`line-5`、`body-2`〜`body-4`、公式の `active-color-*` 値です。不明なオプションは無視し、壊れたブロックは推測して解釈せず元のコードブロックとして残します。元プラグインの JavaScript、footnote/node-link ヘルパー、独自 CSS 変数、インタラクティブ機能は対象外です。

## オプション

| オプション | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `basePath` | `string` | `"/timeline"` | 生成ページのパス。空文字列で無効化します。 |
| `include` / `exclude` | `{ folders?: string[]; tags?: string[] }` | — | 自動選択の条件。 |
| `selection` | `"automatic" \| "marked"` | `"automatic"` | `"marked"` で旧来の明示選択にします。 |
| `key` | `string` | `"timeline"` | 旧来の明示真偽値マーカーのキー。 |
| `title` | `string` | `"Timeline"` | ページ見出しと title。 |
| `className` | `string` | `"rb-timeline"` | 生成ページのルートに追加する CSS class。 |

## 実行例

[Timeline を開く](/timeline)
