# @riebeckite/webmention-cloudflare

[`@riebeckite/plugin-webmention`](../../plugins/webmention/README_ja.md) のための
Cloudflare Worker・D1・KV ランタイムです。汎用プラグインが storage の境界を定義し、
このパッケージがバインディングとストレージを所有します。

[English](./README.md)

## アーキテクチャ

`d1Storage` / `kvStorage` は汎用 `WebmentionProvider` を実装するため、同じ
サイトの Worker 内でプラグインの `endpoints` をマウントし、バインディング由来の
provider を渡せます。`createWorker` は別 Worker 配置向けの任意の単体レシーバーで、
入力を検証し、送信元がターゲットへリンクしていることを確認し、メンションを保存して
検証済みメンションのフィードを返します。D1 と KV は infrastructure にあり、
`@riebeckite/plugin-webmention` から import されることはありません。

## ストレージ adapter

- **`D1WebmentionStorage`**: 検証済み `(source, target)` ペアごとに 1 行を保持し、
  競合時は upsert します。`store` と `query`（ターゲット別・全件、`?since=` 対応）を
  サポートします。ターゲットは比較用の正規形で保存されます。
- **`KvWebmentionStorage`**: store 専用です。KV には一覧取得や原子的更新がないため、
  読み取りは意図的に `UnsupportedWebmentionQueryError` を投げ（Worker は `501`）、
  `query` capability を公開しません。KV のキーは 512 バイト上限のため、長い URL には
  D1 を使ってください。

既定の adapter はありません。Worker ごとに 1 つを明示的に選んでください。

## サイト Worker でプラグインを使う

```ts
import { webmention } from "@riebeckite/plugin-webmention";
import { d1Storage } from "@riebeckite/webmention-cloudflare";

export interface Env {
  WEBMENTION_DB: D1Database;
}

export const config = defineConfig({
  plugins: [webmention({ provider: d1Storage(env.WEBMENTION_DB) })],
});
```

`mountRiebeckiteEndpoints` が `POST /webmentions` と `GET /webmentions` をマウントし、
検証済みメンションはビルド時に記事の近くへ描画されます。

## 単体レシーバー

```ts
import { createWorker, d1Storage } from "@riebeckite/webmention-cloudflare";

interface Env {
  WEBMENTION_DB: D1Database;
}

export default {
  fetch: (request: Request, env: Env) =>
    createWorker({
      storage: d1Storage(env.WEBMENTION_DB),
      allowedTargets: ["https://www.example.com/"],
    }).fetch(request),
};
```

単体レシーバーは `allowedTargets` のターゲットしか知らず、content manifest を
持たないため、フィードの要素に記事サマリーは付きません。サイト Worker と同居する
場合はプラグインの `endpoints` を使い、公開 entry とメンションを対応付けてください。

## エンドポイントと検証

- `POST /webmentions` は `source` と `target` をフォームまたは JSON（8〜64 KiB 上限）
  で受け取り、ターゲットが許可された絶対 URL であることを要求し、保存前に送信元が
  リンクしていることを検証します。応答は `202`（受理）、`400`（`error` コード付き）、
  書き込み不能時の `503` です。
- `GET /webmentions?target=&limit=&since=` は
  `{ version, generatedAt, count, mentions }` を返します。`query` capability を持たない
  ストレージでは `501` を返します。

既定の送信元 fetcher は loopback とプライベートネットワーク宛てを拒否し、本文サイズを
制限し、タイムアウトします。Webmention の送信元はサーバーであるため
`allowMissingOrigin` は既定で `true` です。ブラウザ origin は明示的に列挙しない限り
拒否されます。

## D1 スキーマとデプロイ

Worker はリクエスト中に D1 をマイグレーションしてはいけません。デプロイ前にスキーマを
適用してください。

```sh
pnpm exec wrangler d1 execute WEBMENTION_DB --file node_modules/@riebeckite/webmention-cloudflare/migrations/0001_webmentions.sql
pnpm exec wrangler deploy
```

## 関連

- [@riebeckite/plugin-webmention](../../plugins/webmention/README_ja.md)
- [Analytics Cloudflare ランタイム](../analytics-cloudflare/README_ja.md)
