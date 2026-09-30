# Deployment

Riebeckite はビルド結果として `dist/` を作ります。Cloudflare Workers では、この `dist/` を静的アセットとして配信します。通常のサイトでは runtime 用の `main` は不要です。

## 手元からデプロイする

```bash
npm install -D wrangler
npm exec riebeckite build
npx wrangler login
npx wrangler deploy
```

`wrangler.jsonc` の基本形は次の通りです。

```jsonc
{
  "name": "riebeckite-site",
  "compatibility_date": "2026-03-10",
  "compatibility_flags": ["nodejs_compat"],
  "assets": { "directory": "./dist" }
}
```

公開 URL が決まったら `riebeckite.config.ts` の `site.baseUrl` を更新します。

## GitHub Actions を使う

```bash
npx create-riebeckite my-site --github-actions
```

この option は `wrangler.jsonc` と `.github/workflows/deploy.yml` を生成します。workflow は `npm ci` を使うため、`package-lock.json` を commit してください。必要な secret は `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` です。

別リポジトリの content を使う場合は、content repository への push だけでは site repository の workflow は動きません。`notify-site.yml` が `repository_dispatch` を送る構成が必要です。詳しくは [Separate Content Repository](../guides/deployment/separate-content-repository.md) を参照してください。
