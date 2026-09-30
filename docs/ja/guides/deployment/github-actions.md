# GitHub Actions

`create-riebeckite --github-actions` は、Cloudflare Workers へデプロイするための `wrangler.jsonc` と `.github/workflows/deploy.yml` を生成します。

```bash
npx create-riebeckite my-site --github-actions
```

## 必要なもの

- `package-lock.json` を commit すること（workflow は `npm ci` を使います）
- site repository の secret `CLOUDFLARE_API_TOKEN`
- site repository の secret `CLOUDFLARE_ACCOUNT_ID`

## trigger

生成 workflow は次で動きます。

- `main` への push
- `workflow_dispatch`
- `repository_dispatch` の `content-updated`

別リポジトリの content に push しても、それだけでは site repository の workflow は動きません。content repository 側に `notify-site.yml` を置き、`SITE_DISPATCH_TOKEN` で site repository へ `repository_dispatch` を送る必要があります。

## workflow の流れ

1. site repository を checkout
2. 外部 content repository を使う場合は `content/` に checkout
3. Node.js 22 を設定
4. `npm ci`
5. `npm exec riebeckite check`
6. `npm exec riebeckite build`
7. `cloudflare/wrangler-action@v3` で deploy

private content repository を読む場合は、site repository に `RIEBECKITE_CONTENT_READ_TOKEN` を設定します。

詳しくは [Separate Content Repository](./separate-content-repository.md) を参照してください。
