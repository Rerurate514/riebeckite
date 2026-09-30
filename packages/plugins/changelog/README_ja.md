# @riebeckite/plugin-changelog

ローカル Git の履歴からビルド時に変更履歴を生成するプラグインです。公開ノートごとにコミット日・件名・作成者を並べた「変更履歴」セクションを追加し、サイト全体の変更履歴データセットも組み立てられます。クライアント JavaScript は不要です。

[English](./README.md)

## できること

`changelog()` は [`@riebeckite/plugin-diff`](../diff/README_ja.md) と同じ方法でローカル Git を読み取ります（`execFile` で `git` を実行し、失敗時は安全に縮退）。独自のファイルシステム層は作りません。

結果はマニフェストの `bodySlots` に出力します。公開エントリは `article.after-content` スロットに自分の履歴を受け取り、サイト側のレイアウトがそのスロットを描画するかどうかを決めます。プラグインは Plugin の境界を越えず、アプリケーションのルートも作りません。`siteWide` を有効にすると、`siteWideSlug` で指定したノートのスロットにサイト全体の変更履歴を書き込みます。そのノート（＝ルート）はアプリまたは作者が所有するもので、プラグインが作るものではありません。クライアントスクリプトは登録しません。

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
| `cwd` | `string` | `process.cwd()` | Git コマンドを実行するディレクトリ |
| `lookbackDays` | `number` | なし（全履歴） | 直近この日数以内のコミットだけを含める |
| `dateFormat` | `"iso" \| "long" \| "short"` | `"iso"` | 日付の表示形式 |
| `locale` | `string` | `"en"` | `"long"` / `"short"` のロケール |
| `perNote` | `boolean` | `true` | 公開ノートごとに履歴セクションを追加する |
| `siteWide` | `boolean` | `false` | サイト全体の変更履歴を生成して注入する |
| `siteWideSlug` | `string` | `"changelog"` | サイト全体の変更履歴を受け取るノート |
| `maxPerNote` | `number` | `10` | ノートごとに表示するコミット上限 |
| `maxSiteWide` | `number` | `50` | サイト全体で表示するコミット上限 |
| `showAuthor` | `boolean` | `true` | コミット作成者を表示する |
| `heading` | `boolean` | `true` | `<h2>` 見出しを描画する |
| `perNoteHeading` | `string` | `"Change history"` | ノートごとの見出し文言 |
| `siteWideHeading` | `string` | `"Changelog"` | サイト全体の見出し文言 |
| `className` | `string` | `"rr-changelog"` | ルート CSS クラス |

## 出力

`article.after-content` スロットに次のような断片を追加します。

```html
<section class="rr-changelog rr-changelog--note" data-changelog-note>
  <h2 class="rr-changelog__heading">Change history</h2>
  <ol class="rr-changelog__list">
    <li class="rr-changelog__item">
      <time class="rr-changelog__date" datetime="2026-09-30T09:00:00+09:00">2026-09-30</time>
      <span class="rr-changelog__subject">Fix the sidebar offset</span>
      <span class="rr-changelog__author">Author Name</span>
      <code class="rr-changelog__hash" title="…完全なハッシュ…">abc1234</code>
    </li>
  </ol>
</section>
```

`data-changelog-note` と `data-changelog-site` は、2 種類の断片をスタイリングと重複防止のために識別する属性です。

## アプリ側の接続（サイト全体の変更履歴）

サイト全体の一覧はページではなくデータです。ルートはアプリが所有します。プラグインは既存ノートの `article.after-content` スロットに書き込む（`siteWide: true` と `siteWideSlug`。その slug の公開ノートが必要）か、データセットを公開してアプリ自身に描画させます。

```ts
import {
  buildSiteChangelog,
  GitChangelogReader,
  renderSiteChangelog,
  resolveChangelogOptions,
} from "@riebeckite/plugin-changelog";

const options = resolveChangelogOptions({ lookbackDays: 90 });
const manifest = await content.getManifest();
const reader = new GitChangelogReader({ cwd: "./content" });
const commits = await reader.getRecentCommits();
const dataset = buildSiteChangelog({
  entries: manifest.publicEntries,
  commits,
  contentIndex: manifest.contentIndex,
  options,
});
const html = renderSiteChangelog(dataset, options);
```

参照アプリはマニフェストの `bodySlots` を `apps/web/app/components/article/article.tsx` で描画します。専用ルートでは公開された HTML をそのまま描画できます。

## 失敗時の挙動

`git` が無い、または `cwd` が Git リポジトリでない場合、プラグインは `changelog-git-unavailable` 警告診断とロガー警告を出し、ビルド成果物には何も加えません。履歴が取得できないことを理由にビルドが失敗することはなく、空のリポジトリでも同じです。

## スタイル

パッケージは安定した `.rr-changelog` ルートフックを持つ `style.css` を同梱します。テーマはプラグインを編集せずに見た目を変更できます。

```ts
import "@riebeckite/plugin-changelog/style.css";
```

## 公開 API

- `changelog(options?)` — プラグインファクトリ
- `changelogPlugin` — `changelog` の別名
- `resolveChangelogOptions(options?)` — 既定値を適用
- `GitChangelogReader` — Git 履歴リーダー（`getFileHistory`、`getRecentCommits`、`isAvailable`）
- `buildNoteChangeHistory(entry, commits, options)` — ノート単位のデータセット
- `buildSiteChangelog({ entries, commits, contentIndex, options })` — サイト全体のデータセット
- `renderNoteChangeHistory(history, options)` / `renderSiteChangelog(changelog, options)` — HTML レンダラ
- `filterChangelogCommits(commits, options)` / `formatChangelogDate(date, options)` / `resolveLookbackSince(days, now?)` — 純粋な補助関数
- 型: `ChangelogOptions`、`ResolvedChangelogOptions`、`ChangelogCommit`、`ChangelogRecord`、`NoteChangeHistory`、`SiteChangelog`、`SiteChangelogEntry`、`SiteChangelogNote`、`ChangelogDateFormat`、`GitChangelogReaderOptions`

## 関連資料

- [plugin-diff](../diff/README_ja.md) — リビジョン履歴と行差分
- [プラグインシステム](../../../docs/ja/reference/plugin-api.md)
