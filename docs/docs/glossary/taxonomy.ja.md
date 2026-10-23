---
date: 2026-10-14
title: タクソノミー（Taxonomy）
sidebar:
  hidden: true
---

# タクソノミー（Taxonomy）

タグ、フォルダ、日付でコンテンツをまとめ、/tags/ のような一覧ページにする仕組みです。タクソノミーページはコンテンツコレクションから作られ、リンクにはpermalinkを使います。

## 軸

- `tags`：frontmatterの `tags` フィールドから。
- `folder`：ディレクトリ構造から。
- `date`：年、月、日で。

## タクソノミープラグインのオプション

タクソノミープラグインは `TaxonomyOptions`（`packages/plugins/taxonomy/src/types.ts`）を受け取り、タームの生成と描画を設定します。主なオプションは次のとおりです。

- `tags`（既定：`true`）：タグのタームページを生成する
- `folders`（既定：`true`）：フォルダのタームページを生成する
- `tagsBasePath`（既定：`"/tags"`）：タグページのパス接頭辞
- `foldersBasePath`（既定：`"/folders"`）：フォルダページのパス接頭辞
- `folderDepth`（既定：`0`）：フォルダのグループ化の深さ。`0` はフルパスを保つ
- `minEntries`（既定：`1`）：タームを生成するために必要な最小エントリ数
- `related`（既定：`true`）：タグのタームに関連タームのナビゲーションを表示するか
- `relatedLimit`（既定：`8`）：タグあたりの関連タームの最大数
- `feeds`：形式ごとのフィード生成（RSS、Atom、JSON）
- `dataEndpoint`（既定：`"/taxonomy/index.json"`）：アプリのルート向けJSONデータエンドポイント

```ts
// From packages/plugins/taxonomy/src/types.ts
export type TaxonomyOptions = {
  tags?: boolean;
  folders?: boolean;
  tagsBasePath?: string;
  foldersBasePath?: string;
  folderDepth?: number;
  minEntries?: number;
  related?: boolean;
  relatedLimit?: number;
  feeds?: TaxonomyFeedOptions;
  className?: string;
  dataEndpoint?: string;
  resolveTitle?: (context: TaxonomyTermContext) => string;
};
```

## タームの描画

タクソノミーのタームは `renderTaxonomyPage`（`packages/plugins/taxonomy/src/pages.ts`）が描画し、タームのタイトル、エントリ一覧、フィードリンク、関連タームのナビゲーションを持つ `TaxonomyPage` フラグメントを生成します。ページフラグメントはその後、サイトのルートとレイアウトで包まれます。
