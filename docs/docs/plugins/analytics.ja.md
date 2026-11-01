---
date: 2026-10-08
title: Analytics
---
# Analytics

公開した記事のページビューを計測し、結果を照会するためのプラグインです。サイト側で 1 ドキュメントにつき 1 件の `page_view` を送信し、保存先は Analytics プロバイダに任せます。収集サーバーやデータベースは含みません。

[English](./analytics.md)

## できること

- 読者が公開記事を開いたときに `page_view` を送信します。
- URL ではなく frontmatter の安定した `id` で記事を識別します。
- 設定した `collectorUrl` へイベントを送ります。
- ページビューや人気記事を読むためのプロバイダ契約を提供します。

どの記事が読まれているかを知りたいときに使います。サイト側のこのプラグインと、JSON の `POST` を受け付ける収集サーバーの 2 つが必要です。収集サーバーには [Analytics のセットアップ](../guides/analytics/setup.ja.md) の Cloudflare Worker を使うか、自前のエンドポイントを用意します。

## クイックスタート

1. プラグインをインストールします。

```sh
npm install @riebeckite/plugin-analytics
```

2. 計測したい記事に安定した `id` を付けます。

```yaml
---
id: guide-1
---
```

3. プラグインを有効にし、収集先を指定します。

```ts
import { defineConfig } from "@riebeckite/core";
import { analytics, MemoryAnalyticsProvider } from "@riebeckite/plugin-analytics";

export default defineConfig({
  plugins: [
    analytics({
      provider: new MemoryAnalyticsProvider(),
      publicConfig: { collectorUrl: "/analytics/events" },
    }),
  ],
});
```

4. ビルドして公開記事を開きます。ブラウザーは後述の「ブラウザでの計測」に示す `page_view` を送信します。

5. 設定を確認します。

```sh
npm exec riebeckite check
npm exec riebeckite doctor
```

`check` はプラグインの設定を検証します。`doctor` は安定した `id` を持たない公開コンテンツを `analytics-untracked` として報告します。ブラウザーの開発者ツールの Network パネルで、`collectorUrl` への `POST` を確認してください。収集サーバーがない場合、リクエストは失敗します。プラグイン自身はイベントを保存しません。

`MemoryAnalyticsProvider` はローカルのテスト用です。イベントを永続化しません。本番では実際のプロバイダを使ってください。

## 仕組み

- `AnalyticsEvent` は型付きの `page_view` を持ち、プロバイダ固有のイベント型を加えた union 型へ拡張できます。
- `AnalyticsProvider` は対応する機能（capability）を明示し、`capture` と `query` を提供します。クエリはコンテンツ別のページビューと人気コンテンツを対象にし、ISO 8601 形式の期間を任意で指定できます。
- 未対応のクエリは `UnsupportedAnalyticsQueryError` で明示されます。テストやローカル用途には `MemoryAnalyticsProvider` を用意しています。
- 認証情報・ストレージ・ランタイムバインディングなどのプロバイダ設定は、プロバイダの内部に留まります。ブラウザへ渡すのは `AnalyticsPublicConfig` だけです。

## 設定

```ts
import { analytics, MemoryAnalyticsProvider } from "@riebeckite/plugin-analytics";

const provider = new MemoryAnalyticsProvider();

export default {
  plugins: [
    analytics({
      provider,
      publicConfig: { collectorUrl: "/analytics/events" },
    }),
  ],
};
```

`collectorUrl` は公開してよい収集先 URL です。相対パスまたは HTTP(S) URL を指定し、JSON の `POST` を受け付けるコレクターを用意します。将来のプロバイダパッケージは、非公開のランタイム設定を使ってこのコレクターを提供できます。

## ブラウザでの計測

Core の安定コンテンツ ID（frontmatter の `id`）を持つ公開コンテンツにだけ、コンテンツ ID を示すマーカーを出力します。汎用の `publicConfig` 経由で登録された `initAnalytics` は、ブラウザでドキュメントごとに一度だけ次のようなイベントを送ります。

```json
{
  "type": "page_view",
  "contentId": "guide-1",
  "occurredAt": "2026-01-01T00:00:00.000Z",
  "path": "/guide",
  "lang": "ja"
}
```

`path` と `lang` は補助的なメタデータであり、ID ではありません。安定 ID を持たないコンテンツは計測しません。ビルド時と SSR 時は何もせず、同じドキュメント内での初期化も冪等です。SPA ナビゲーションを有効にすると、ルート遷移が成功するたびに追加のイベントを送信します。

コンテンツ ID は執筆側の責務です。公開ノート間で `id` が重複している場合は [`@riebeckite/plugin-diagnostics`](./diagnostics.ja.md) が報告し（`duplicate-content-id` / `invalid-content-id`）、プラグイン自身の `validateAnalyticsOptions` が `check` 時に検証します。

## プロバイダの取り決め

```ts
const result = await provider.query({
  type: "popular_content",
  limit: 10,
  timeRange: { from: "2026-01-01T00:00:00.000Z" },
});
```

機能（capability）は `capture`、`content_page_views`、`popular_content` です。すべてのクエリに対応しないプロバイダを実装する場合は、`assertAnalyticsQuerySupported(provider, query)` を呼び出してください。

## 診断

`@riebeckite/plugin-diagnostics` は、サイトで本プラグインが有効なとき、安定コンテンツ ID を持たない公開コンテンツを `analytics-untracked` として報告します。計測の抜けは `check` / `doctor` / ビルドの診断で確認できます。

## 主なエクスポート

- `analytics()` / `analytics()`
- `initAnalytics`（`@riebeckite/plugin-analytics/client`）
- `MemoryAnalyticsProvider`
- イベント、クエリ／結果、プロバイダ／機能、公開設定の型
- `UnsupportedAnalyticsQueryError` と機能確認ヘルパー

## 関連リンク

- [[plugin-api|プラグイン API]]
