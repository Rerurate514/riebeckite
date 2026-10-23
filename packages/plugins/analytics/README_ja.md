# @riebeckite/plugin-analytics

<!-- Generated from docs/docs/plugins/analytics.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Riebeckite 向けの、ストレージや実行環境に依存しないアクセス解析の基盤です。Cloudflare、Worker、データベース、特定ベンダーの実装は含みません。

[English](./README.md)

## 設計

- `AnalyticsEvent` は型付きの `page_view` を持ち、プロバイダ固有のイベント型を加えた union 型へ拡張できます。
- `AnalyticsProvider` は対応する機能（capability）を明示し、`capture` と `query` を提供します。クエリはコンテンツ別のページビューと人気コンテンツを対象にし、ISO 8601 形式の期間を任意で指定できます。
- 未対応のクエリは `UnsupportedAnalyticsQueryError` で明示されます。テストやローカル用途には `MemoryAnalyticsProvider` を用意しています。
- 認証情報・ストレージ・ランタイムバインディングなどのプロバイダ設定は、プロバイダの内部に留まります。ブラウザへ渡すのは `AnalyticsPublicConfig` だけです。

## 使い方

```ts
import { analytics, MemoryAnalyticsProvider } from "@riebeckite/plugin-analytics";

export default {
  plugins: [
    analytics({
      provider: new MemoryAnalyticsProvider(),
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

コンテンツ ID は執筆側の責務です。公開ノート間で `id` が重複している場合は [`@riebeckite/plugin-diagnostics`](../diagnostics/README_ja.md) が報告し（`duplicate-content-id` / `invalid-content-id`）、プラグイン自身の `validateAnalyticsOptions` が `check` 時に検証します。

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

- `analytics()` / `analyticsPlugin()`
- `initAnalytics`（`@riebeckite/plugin-analytics/client`）
- `MemoryAnalyticsProvider`
- イベント、クエリ／結果、プロバイダ／機能、公開設定の型
- `UnsupportedAnalyticsQueryError` と機能確認ヘルパー

## 関連リンク

- [プラグイン API](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.ja.md)
