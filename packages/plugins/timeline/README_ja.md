# @riebeckite/plugin-timeline

<!-- Generated from docs/docs/plugins/timeline.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

[English](./README.md)

`timeline: true` を付けた公開ノートから、時系列の 1 ページを生成します。すべての
日付付きノートを並べる Archive と違い、公開したい履歴だけを選べます。

## インストール

```bash
pnpm add @riebeckite/plugin-timeline
```

## 使い方

```ts
import { timeline } from "@riebeckite/plugin-timeline";

export default {
  plugins: [timeline()],
};
```

対象のノートに印を付けます。

```md
---
title: 初回リリース
date: 2026-01-15
timeline: true
---
```

ページは `/timeline` に生成されます。日付は `date`、`published`、`created` の順で
最初に有効な値を使い、古い順に並びます。公開一覧に載せられるノートだけが対象です。

## 実行例

[Timeline を開く](/timeline)

## オプション

| オプション | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `basePath` | `string` | `"/timeline"` | 生成ページのパス。空文字列で無効化します。 |
| `key` | `string` | `"timeline"` | 対象を選ぶ真偽値の frontmatter キー。 |
| `title` | `string` | `"Timeline"` | ページ見出しと title。 |
| `className` | `string` | `"rb-timeline"` | ルート CSS クラス。 |
