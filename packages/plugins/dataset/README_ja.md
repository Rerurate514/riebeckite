# @riebeckite/plugin-dataset

<!-- Generated from docs/docs/plugins/dataset.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

公開済みコンテンツグラフを、スキーマバージョン付きの NDJSON としてビルド時に書き出すプラグインです。

[English](./README.md)

## できること

`dataset()` は `data/` ディレクトリ（`directory` オプションで変更できます）に3つの生成ファイルを書き出します。

- `pages.ndjson`：公開ノート1件につき1行の JSON オブジェクト — `{ slug, permalink, title, tags, date }`
- `links.ndjson`：解決済みノート間リンク1件につき1行 — `{ sourceSlug, sourcePermalink, targetSlug, targetPermalink, raw, embed }`
- `index.json`：`{ schemaVersion, generator, pages, links }` — データセットのスキーマバージョンと件数

データセットは `manifest.discoverableEntries` を読むため、unlisted・draft・予約公開のノートは出力に現れません。送り元・送り先のどちらかでも公開ノートでないリンクは除外され、画像・添付ファイル・未解決のウィキリンクも `links.ndjson` には含まれません。`slug` は内部の識別子、`permalink` は公開URLという区別を維持します。

出力は決定的です。レコードは slug 順に並び、ファイルにタイムスタンプは含まれないため、同じ vault を2回ビルドすると同一のファイルが得られます。

## インストール

```sh
npm install @riebeckite/plugin-dataset
```

## 設定と配置

```ts
import { defineConfig } from "@riebeckite/core";
import { dataset } from "@riebeckite/plugin-dataset";

export default defineConfig({
  plugins: [dataset()],
});
```

| オプション | 型 | 既定値 | 内容 |
| --- | --- | --- | --- |
| `directory` | `string` | `data` | サイトルートからの出力ディレクトリ。空・`.`・`..` のセグメントは使えません |

## 公開 API

- `dataset()`：プラグインファクトリ
- `buildDatasetPages(entries)`：公開エントリからページレコードを構築
- `buildDatasetLinks(entries)`：公開ノート間のリンクレコードを構築
- `buildDatasetOutputs(entries, directory)`：生成出力のプレビルド
- `buildDatasetIndex(pages, links)`：`DatasetIndex` レコード
- `toNdjson(records)`：NDJSON へのシリアライズ
- 定数：`DATASET_SCHEMA_VERSION`、`DEFAULT_DATASET_DIRECTORY`、`DATASET_GENERATOR`
- 型：`DatasetPage`、`DatasetLink`、`DatasetIndex`、`DatasetPluginOptions`

## 関連資料

- [プラグインシステム](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.ja.md)
