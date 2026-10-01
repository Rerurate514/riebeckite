# @riebeckite/plugin-diff

ローカル Git リポジトリから、Markdown ノートの履歴と行単位の差分を取得するプラグインです。

[English](./README.md)

## できること

中心となる API は `createPostDiffApi()` です。リネームや移動後のファイルも `git log --follow` で追跡し、履歴、指定リビジョンの本文、任意の二つのリビジョン間の差分を返します。`createLineDiff()` は単独でも使える純粋な差分関数です。

## 設定と利用例

```ts
import { defineConfig } from "@riebeckite/core";
import { createPostDiffApi, diff } from "@riebeckite/plugin-diff";

export default defineConfig({ plugins: [diff({ cwd: "./content" })] });

const api = createPostDiffApi({ cwd: "./content" });
const history = await api.getHistory("notes/hello.md");
const current = await api.getCurrentDiff("notes/hello.md");
```

| API | 返す内容 |
| --- | --- |
| `getHistory(filePath)` | 新しい順の `DiffRevision[]` |
| `getRevisionMarkdown(filePath, hash)` | その時点の Markdown。なければ `null` |
| `getCurrentDiff(filePath)` | 最新と一つ前のリビジョンの差分 |
| `compareRevisions(input)` | 指定した二つのリビジョンの差分 |

`cwd` は Git リポジトリを探すためのコンテンツルートで、既定値はビルド内の `config.content.directory`、それ以外では `process.cwd()` です。相対パスは `process.cwd()` 基準で解決されます。Git リポジトリ外を指定しても例外は投げず、空の結果を返します。

## 公開 API

- `diff(options?)`、`createPostDiffApi(options?)`
- `createLineDiff(from, to)`、`GitMarkdownHistoryReader`
- `DiffRevision`、`MarkdownRevision`、`PostDiff`、`DiffLine`、`DiffLineType`、`RevisionComparisonInput`

## 関連資料

- [プラグインシステム](../../../docs/ja/docs/reference/plugin-api.md)

