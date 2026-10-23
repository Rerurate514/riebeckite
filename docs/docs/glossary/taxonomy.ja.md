---
date: 2026-10-14
title: Taxonomy
sidebar:
  hidden: true
---

# Taxonomy

/tags/ のような一覧ページへ、tag、folder、dateでコンテンツをまとめる仕組みです。Taxonomyページはcontent collectionから作られ、リンクにはpermalinkを使います。

## 軸

- `tags`：frontmatterの`tags`fieldから。
- `folder`：ディレクトリ構造から。
- `date`：年・月・日で。

## taxonomyプラグインのオプション

taxonomyプラグインは`TaxonomyOptions`（`packages/plugins/taxonomy/src/types.ts`）を受け入れ、termの生成とレンダリングを構成します。主なオプションには以下があります：

- `tags`（既定: `true`）：tag termページを生成
- `folders`（既定: `true`）：folder termページを生成
- `tagsBasePath`（既定: `"/tags"`）：tagページのパスプレフィックス
- `foldersBasePath`（既定: `"/folders"`）：folderページのパスプレフィックス
- `folderDepth`（既定: `0`）：folderグループの深さ；`0`の場合はフルパスを保持
- `minEntries`（既定: `1`）：termが生成されるために最低限必要なエントリ数
- `related`（既定: `true`）：tag term用のrelated-termナビゲーションを表示するか
- `relatedLimit`（既定: `8`）：tagあたりのrelated termの最大数
- `feeds`：RSS, Atom, JSONによるper-format feed生成
- `dataEndpoint`（既定: `"/taxonomy/index.json"`）：app routesのためのJSONデータエンドポイント

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

## termのレンダリング

taxonomy termは`renderTaxonomyPage`（`packages/plugins/taxonomy/src/pages.ts`）によってレンダリングされ、`TaxonomyPage`フラグメントを生成します。これにはtermのタイトル、entryリスト、feedリンク、related-termナビゲーションが含まれます。ページフラグメントはthenサイトのrouteとlayoutによってラップされます。
