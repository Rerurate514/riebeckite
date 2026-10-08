# @riebeckite/plugin-diff

<!-- Generated from docs/docs/plugins/diff.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

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

`diff(options?)` は API と同じ `GitHistoryReaderOptions` を受け取ります。プラグイン一覧には `diff` として登録されますが、履歴を取得する中心的な入口はプログラムから呼ぶ API です。リビジョンパネルは最初の比較だけをビルド時に描画し、選択した比較はブラウザで計算します。各リビジョンを一度だけ埋め込むため、全組み合わせの差分を出力しません。

| API | 返す内容 |
| --- | --- |
| `getHistory(filePath)` | 新しい順の `DiffRevision[]` |
| `getRevisionMarkdown(filePath, hash)` | その時点の Markdown。なければ `null` |
| `getCurrentDiff(filePath)` | 最新と一つ前のリビジョンの差分 |
| `compareRevisions({ filePath, fromHash, toHash })` | 指定した二つのリビジョンの差分。`fromHash: null` なら空の本文との差分 |

`cwd` は Git リポジトリを探すためのコンテンツルートで、既定値はビルド内の `config.content.directory`、それ以外では `process.cwd()` です。相対パスは `process.cwd()` 基準で解決されます。Git リポジトリ外を指定しても例外は投げず、空の結果を返します。

## オプションと型

| オプション | 型 | 既定値 | 内容 |
| --- | --- | --- | --- |
| `cwd` | `string` | `config.content.directory`、なければ `process.cwd()` | Git ワークツリーを探すコンテンツルート |

- `DiffRevision`: `hash`、`shortHash`、`date`、`message`、`author` を持つコミット情報
- `MarkdownRevision`: `DiffRevision` とその時点の Markdown 本文
- `PostDiff`: `from`、`to`、`lines` を持つ差分
- `DiffLine`: `{ type, content }` 形式の 1 行
- `DiffLineType`: `"context" | "added" | "removed"`
- `RevisionComparisonInput`: `{ filePath, fromHash: string | null, toHash }`

## 公開 API

- `diff(options?)`、`createPostDiffApi(options?)`
- `createLineDiff(from, to)`、`GitMarkdownHistoryReader`
- `DiffRevision`、`MarkdownRevision`、`PostDiff`、`DiffLine`、`DiffLineType`、`RevisionComparisonInput`

## 関連資料

- [プラグインシステム](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.ja.md)
