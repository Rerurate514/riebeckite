# @riebeckite/analytics-cloudflare

`@riebeckite/plugin-analytics` のための独立した Cloudflare Worker 実行環境です。汎用プラグインには Cloudflare 固有コードを含めません。

## ストレージは必ず一つ選ぶ

- **D1**: UTC 日単位で集計し、原子的な upsert、コンテンツ別 PV、人気記事、日バケット単位の期間指定に対応します。生イベントは保存しません。時刻境界は日単位であり、サブ日精度ではありません。
- **KV**: 最小のベストエフォート集計のみです。原子的な加算や集計検索がないため、同時書き込みで欠損し得ます。読み取り API は対応能力として宣言せず、`UnsupportedAnalyticsQueryError` / HTTP 501 を返します。レポーティング用途には D1 を使ってください。

既定アダプターはありません。テンプレートの D1 または KV を一つだけ選び、静的サイト用の `wrangler.jsonc` や main は変更しません。

## プライバシーと検証

`POST /events` は 8 KiB 以下の JSON `page_view` だけを受け入れ、安全な content ID、ISO 時刻、長さを制限した `path` / `lang` を検証します。IP、Cookie、User-Agent、フィンガープリントは読まず保存しません。Origin は既定で拒否されるため、許可するサイト Origin を明示してください。

D1 スキーマはリクエスト中に実行せず、デプロイ前に `migrations/0001_analytics_page_views.sql` を `wrangler d1 execute` で明示適用してください。詳しい設定は各テンプレートの README を参照してください。
