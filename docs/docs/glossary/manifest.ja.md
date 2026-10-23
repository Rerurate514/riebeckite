---
date: 2026-10-14
title: Manifest
sidebar:
  hidden: true
---

# Manifest

すべてのコンテンツを記録するビルド時の一覧です。entry、公開ビュー、検索用の対応表、content graph、diagnosticを持ちます。ページ生成、実行時のquery、incremental build、inspectionはいずれもmanifestを読みます。

## manifestの検索用ビュー

`ContentManifest`は、異なるアクセスパターンに対応する専門的なビューをいくつか提供します。これらのビューはビルド時に生成され、ファイルシステムへのアクセスを必要とせず、manifestからentryデータをprojectionしたものです。

| ビュー | 内容 | 典型的な使用目的 |
| --- | --- | --- |
| `bySlug` | `Map<string, ContentManifestEntry>` | slugでentryを検索する。 |
| `byPermalink` | `Map<string, ContentManifestEntry>` | permlink URLでentryを検索する。 |
| `byAlias` | `Map<string, ContentManifestEntry[]>` | エイリアス/redirectパスによってentryを検索する。 |
| `byRoutablePermalink` | `Map<string, ContentManifestEntry>` | public + unlisted entryのみを検索（draft/scheduledを除く）。 |
| `byTag` | `Map<string, ContentManifestEntry[]>` | タグによってentryをグループ化してtaxonomyページを作成する。 |
| `byAsset` | `Map<string, ContentManifestEntry[]>` | assetによってentryをグループ化してassetマニフェストを生成する。 |
| `publicRedirects` | `Map<string, ContentRedirect & { slug: string }>` | 公開redirectと owning entryのslug。 |

エントリデータを検索する例：

```ts
const entry = manifest.byPermalink.get("/blog/my-post/");
```

## graphとdiagnostics

`graph`フィールドは`ContentGraph`インスタンスを保持し、`graph.outgoing(slug)`、`graph.incoming(slug)`、`graph.neighbors(slug)`などの問い合わせを可能にします。backlink表示、関連リンクセクション、内部リンク検証に使用されます。

`diagnostics`フィールドは`Diagnostic`オブジェクトの配列で、コンテンツ処理中に収集されます。各diagnosticには`level`（`info`、`warn`、`error`）、`source`、`message`、`range`（ソース位置）が含まれます。ページ生成、実行時のquery、inspectionはすべてmanifestから読み込みのみを行い、ファイルシステムに触れる必要はありません。

## manifestが持つもの

| field | 内容 |
| --- | --- |
| `entries` | 処理済みのすべてのContent Entry |
| `publicEntries` | 公開して安全なentry |
| `discoverableEntries` | 一覧やfeedに載せてよいentry |
| `bySlug`, `byPermalink`, `byAlias` | 検索用の対応表 |
| `graph` | content graph |
| `diagnostics` | 集めた警告とエラー |

段階を分ける境界

コンテンツ処理がmanifestを作り、ページ生成、実行時のquery、incremental build、inspectionがそれを読みます。後段がファイルシステムに触れる必要はありません。