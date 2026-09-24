# @riebeckite/plugin-diff

Markdown note の Git ベースの diff と revision history を提供します。commit
history の取得・過去 revision の取得・それらの間の行単位 diff を行えます。

[English](./README_en.md)

## 概要

`createPostDiffApi()` はローカルの Git repository をラップし、あらゆる
Markdown file の revision history と line diff を提供します。rename / move
された note にも `git log --follow` で追従します。`createLineDiff()` は API
内部で使われる純粋な diff engine で、単体でも export されています。

`diff()` plugin は plugin list に `diff` を登録します。主要な interface は
programmatic API です。

## 使い方（plugin）

```ts
import { defineConfig } from "@riebeckite/core";
import { diff } from "@riebeckite/plugin-diff";

export default defineConfig({
  // ...
  plugins: [diff({ cwd: "./content" })],
});
```

`diff(options?)` は API と同じ `GitHistoryReaderOptions` を受け取ります。

## Programmatic API

```ts
import { createPostDiffApi } from "@riebeckite/plugin-diff";

const api = createPostDiffApi({ cwd: "./content" });

const history = await api.getHistory("notes/hello.md");
const previous = await api.getRevisionMarkdown("notes/hello.md", history[1].hash);
const current = await api.getCurrentDiff("notes/hello.md");
const compare = await api.compareRevisions({
  filePath: "notes/hello.md",
  fromHash: history[1].hash,
  toHash: history[0].hash,
});
```

- `getHistory(filePath)` — file の commit history（新しい順）を
  `DiffRevision[]` で返す
- `getRevisionMarkdown(filePath, hash)` — 指定 revision 時点の Markdown source。
  存在しなければ `null`
- `getCurrentDiff(filePath)` — 最新 revision とその直前の間の line diff。
  直前が無ければ空の source からの diff
- `compareRevisions({ filePath, fromHash, toHash })` — 任意の 2 つの revision
  間の line diff。`fromHash: null` は空の source からの diff

## オプション

`createPostDiffApi(options?)` は `GitHistoryReaderOptions` を受け取ります:

| オプション | 型 | デフォルト | 説明 |
| ---------- | -- | ---------- | ---- |
| `cwd` | `string` | `process.cwd()` | Git command を実行する working directory |

`cwd` が Git repository 内にない場合、API は throw せず空の結果（`[]` /
`null`）を返します。

## 型

| 型 | 説明 |
| -- | ---- |
| `DiffRevision` | commit metadata: `hash`, `shortHash`, `date`, `message`, `author` |
| `MarkdownRevision` | Markdown source 付きの `DiffRevision` |
| `PostDiff` | `from`, `to`, `lines` |
| `DiffLine` | 1 行分の diff: `{ type, content }` |
| `DiffLineType` | `"context" \| "added" \| "removed"` |
| `RevisionComparisonInput` | `{ filePath, fromHash: string \| null, toHash }` |

## エクスポート

- `diff(options?)` — plugin factory
- `createPostDiffApi(options?)` — programmatic API factory
- `createLineDiff(from, to)` — LCS ベースの line diff
- `GitMarkdownHistoryReader` — Git ベースの history reader class
- 上記の型

## 関連

- [Plugin ガイド](../../docs/plugins_jp.md)