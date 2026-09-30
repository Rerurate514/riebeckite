# @riebeckite/analytics-cloudflare

`@riebeckite/plugin-analytics` のための独立した Cloudflare Worker 実行環境です。汎用プラグインには Cloudflare 固有コードを含めません。

[English](./README.md)

## ストレージは必ず一つ選ぶ

- **D1**: UTC 日単位で集計し、原子的な upsert、コンテンツ別 PV、人気記事、日バケット単位の期間指定に対応します。生イベントは保存しません。時刻境界は日単位であり、サブ日精度ではありません。
- **KV**: 最小のベストエフォート集計のみです。原子的な加算や集計検索がないため、同時書き込みで欠損し得ます。読み取り API は対応能力として宣言せず、`UnsupportedAnalyticsQueryError` / HTTP 501 を返します。レポーティング用途には D1 を使ってください。

既定アダプターはありません。テンプレートの D1 または KV を一つだけ選び、静的サイト用の `wrangler.jsonc` や main は変更しません。

## レート制限は緩和策であり、認証ではない

Origin は認証ではないため、許可された `Origin` を偽装して `page_view` を直接 POST できます。任意の `rateLimit` 境界を渡すと、接続元 IP ごとの固定時間窓で回数を制限し、超過時に HTTP 429 を返します。

- **`D1AnalyticsRateLimiter` / `d1RateLimiter(db, { maxRequests, windowMs })`**: D1 に原子的なカウンターを持ち、isolate 間で共有します。デプロイ前に `migrations/0002_analytics_rate_limits.sql` を適用してください。
- **`MemoryAnalyticsRateLimiter`**: テストとローカル開発向けのプロセス内カウンターです。Worker の isolate は短命で共有されないため、分散したクライアントは制限できません。本番は D1 を使ってください。

レート制限は単一クライアントからの濫用を減らすだけで、偽造や分散アクセスを完全には防げません。収集した計測は信頼できないデータとして扱ってください。

## プライバシーと検証

`POST /events` は 8 KiB 以下の JSON `page_view` だけを受け入れ、安全な content ID、ISO 時刻、長さを制限した `path` / `lang` を検証します。Cookie、User-Agent、フィンガープリントは読み取りも保存もしません。Origin は既定で拒否されるため、許可するサイト Origin を明示してください。レート制限を設定した場合に限り、接続元 IP（`CF-Connecting-IP`）をレート制限キーとして読み取ります。D1 版はそのキーを有効な時間窓のあいだだけ保存します。

D1 スキーマはリクエスト中に実行せず、デプロイ前に `migrations/0001_analytics_page_views.sql` と `migrations/0002_analytics_rate_limits.sql` を `wrangler d1 execute` で明示適用してください。詳しい設定は各テンプレートの README を参照してください。
