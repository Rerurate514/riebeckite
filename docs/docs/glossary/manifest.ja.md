---
date: 2026-10-14
title: マニフェスト（Manifest）
sidebar:
  hidden: true
---

# マニフェスト（Manifest）

ビルド時にすべてのコンテンツを記録するものです。エントリ、公開ビュー、検索用マップ、コンテンツグラフ、診断を持ちます。ページ生成、実行時のクエリ、増分ビルド、インスペクションはいずれもマニフェストから読みます。

## マニフェストが持つもの

| フィールド | 内容 |
| --- | --- |
| `entries` | 処理済みのすべての[コンテンツエントリ](./content-entry.md) |
| `publicEntries` | 公開してよいエントリ |
| `discoverableEntries` | 一覧やフィードに載せてよいエントリ |
| `bySlug`, `byPermalink`, `byAlias` | 検索用マップ |
| `graph` | [コンテンツグラフ](./content-graph.md) |
| `diagnostics` | 収集した警告とエラー |

## マニフェストの検索用マップ

`ContentManifest` は、アクセスパターンに応じた専用のビューをいくつか提供します。

| ビュー | 内容 | 典型的な用途 |
| --- | --- | --- |
| `bySlug` | `Map<string, ContentManifestEntry>` | slugでエントリを引く。 |
| `byPermalink` | `Map<string, ContentManifestEntry>` | permalink URLでエントリを引く。 |
| `byAlias` | `Map<string, ContentManifestEntry[]>` | エイリアス/リダイレクトパスでエントリを探す。 |
| `byRoutablePermalink` | `Map<string, ContentManifestEntry>` | ルーティング対象のエントリ（public + unlisted、draft/scheduledを除く）だけを引く。 |
| `byTag` | `Map<string, ContentManifestEntry[]>` | タクソノミーページ用にタグでエントリをグループ化する。 |
| `byAsset` | `Map<string, ContentManifestEntry[]>` | アセットマニフェスト生成用にアセットでエントリをグループ化する。 |
| `publicRedirects` | `Map<string, ContentRedirect & { slug: string }>` | 所有エントリのslug付きの公開リダイレクト。 |

これらのビューはビルド時に生成され、**純粋な射影**です。ファイルシステムにアクセスせず、マニフェスト上のエントリデータを読みます。たとえばpermalinkでエントリを引くには、次のようにします。

```ts
const entry = manifest.byPermalink.get("/blog/my-post/");
```

## グラフと診断

`graph` フィールドは `ContentGraph` インスタンスを保持し、`graph.outgoing(slug)`、`graph.incoming(slug)`、`graph.neighbors(slug)` などのクエリを可能にします。バックリンク表示、関連リンクのセクション、内部リンクの検証で使われます。

`diagnostics` フィールドは、コンテンツ処理中に収集された `Diagnostic` オブジェクトの配列です。各診断には `level`（`info`、`warn`、`error`）、`source`、`message`、`range`（ソース位置）が含まれます。下流の消費者（ページ生成、実行時のクエリ、インスペクション）はマニフェストだけを読み、ファイルシステムに触れる必要はありません。

---

## 段階を分ける境界

コンテンツ処理がマニフェストを作り、ページ生成、実行時のクエリ、[増分ビルド](./incremental-build.md)、インスペクションがそれを読みます。下流がファイルシステムに触れる必要はありません。
