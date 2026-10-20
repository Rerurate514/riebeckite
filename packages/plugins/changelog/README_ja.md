# @riebeckite/plugin-changelog

<!-- Generated from docs/docs/plugins/changelog.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

ローカル Git の履歴からビルド時に変更履歴を生成するプラグインです。公開ノートごとにコミット日・件名・作成者を並べた「変更履歴」セクションを追加し、サイト全体の変更履歴データセットも組み立てられます。クライアント JavaScript は不要です。

[English](./README.md)

## できること

`changelog()` は [`@riebeckite/plugin-diff`](../diff/README_ja.md) と同じ方法でローカル Git を読み取ります（`execFile` で `git` を実行し、失敗時は安全に縮退）。独自のファイルシステム層は作りません。

結果はプラグインの組み込み HTML レンダラーを通じて公開されます。公開エントリはそれぞれ変更履歴セクションを受け取り、サイト側のレイアウトが描画するかどうかを決めます。`siteWide` を有効にすると、サイト全体の変更履歴データセットがビルドされ、アプリが自身で描画できます。プラグインは manifest entry に markup を注入しません。描画する変更履歴セクションは Site が選びます。クライアントスクリプトは登録しません。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { changelog } from "@riebeckite/plugin-changelog";

export default defineConfig({
  // ...
  plugins: [
    changelog({
      // ノートのリポジトリ上のパスが見えるよう、コンテンツのルートを指定します。
      cwd: "./content",
      lookbackDays: 180,
      dateFormat: "iso",
    }),
  ],
});
```

## オプション

| オプション | 型 | 初期値 | 説明 |
| --- | --- | --- | --- |
| `cwd` | `string` | `config.content.directory`、無ければ `process.cwd()` | Git リポジトリを探すためのコンテンツルート |
| `lookbackDays` | `number` | なし（全履歴） | 直近この日数以内のコミットだけを含める |
| `dateFormat` | `"iso" \| "long" \| "short"` | `"iso"` | 日付の表示形式 |
| `locale` | `string` | `"en"` | `"long"` / `"short"` のロケール |
| `perNote` | `boolean` | `true` | 公開ノートごとに履歴セクションを追加する |
| `siteWide` | `boolean` | `false` | サイト全体の変更履歴データセットを生成する |
| `siteWideSlug` | `string` | `"changelog"` | サイト全体の変更履歴に対応する slug |
| `maxPerNote` | `number` | `10` | ノートごとに表示するコミット上限 |
| `maxSiteWide` | `number` | `50` | サイト全体で表示するコミット上限 |
| `showAuthor` | `boolean` | `true` | コミット作成者を表示する |
| `heading` | `boolean` | `true` | `<h2>` 見出しを描画する |
| `perNoteHeading` | `string` | `"Change history"` | ノートごとの見出し文言 |
| `siteWideHeading` | `string` | `"Changelog"` | サイト全体の見出し文言 |
| `className` | `string` | `"rr-changelog"` | ルート CSS クラス |

## 表示

各ノートの変更履歴セクションはビルド時の HTML として公開されます。`perNote` が有効な場合、記事の後に表示されます。サイト全体の変更履歴データセットはビルドされ、アプリが renderer を通じて描画できます。

`data-changelog-note` と `data-changelog-site` は、2 種類の断片をスタイリングと重複防止のために識別する属性です。

## アプリ側の接続（サイト全体の変更履歴）

サイト全体の一覧はページではなくデータです。ルートはアプリが所有します。プラグインはデータセットを生成し、アプリがエクスポートされた renderer を使って描画します。

## 失敗時の挙動

`git` を起動できない場合は `changelog-git-unavailable` 警告診断、コンテンツディレクトリが Git ワーキングツリーの外にある場合は `changelog-content-outside-repository` 警告診断を出し、どちらの場合もロガー警告を伴い、ビルド成果物には何も加えません。履歴が取得できないことを理由にビルドが失敗することはなく、空のリポジトリでも同じです。

## スタイル

パッケージは安定した `.rr-changelog` ルートフックを持つ `style.css` を同梱します。テーマはプラグインを編集せずに見た目を変更できます。

```ts
import "@riebeckite/plugin-changelog/style.css";
```

## 公開 API

- `changelog(options?)`：プラグインファクトリ
- `changelogPlugin`：`changelog` の別名
- `resolveChangelogOptions(options?)`：既定値を適用
- `GitChangelogReader`：Git 履歴リーダー（`getFileHistory`、`getRecentCommits`、`isAvailable`）
- `buildNoteChangeHistory(entry, commits, options)`：ノート単位のデータセット
- `buildSiteChangelog({ entries, commits, contentIndex, options })`：サイト全体のデータセット
- `renderNoteChangeHistory(history, options)` / `renderSiteChangelog(changelog, options)`：HTML レンダラ
- `filterChangelogCommits(commits, options)` / `formatChangelogDate(date, options)` / `resolveLookbackSince(days, now?)`：純粋な補助関数
- 型: `ChangelogOptions`、`ResolvedChangelogOptions`、`ChangelogCommit`、`ChangelogRecord`、`NoteChangeHistory`、`SiteChangelog`、`SiteChangelogEntry`、`SiteChangelogNote`、`ChangelogDateFormat`、`GitChangelogReaderOptions`

## 関連資料

- [plugin-diff](../diff/README_ja.md)：リビジョン履歴と行差分
- [プラグインシステム](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.ja.md)
