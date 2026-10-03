# Deployment

Riebeckite は静的サイトを作ります。`npm exec riebeckite build` を実行すると、公開用のファイルが `dist/` に作られます。デプロイでは、この `dist/` を配信します。標準的な公開先として、ここでは [Cloudflare Workers](https://workers.cloudflare.com/) を使います。

デプロイは、次の3段階で考えると分かりやすくなります。

```text
1. 初回デプロイ
   ↓
   手元から Cloudflare Workers へ公開する

2. 自動デプロイ
   ↓
   GitHub Actions で push 時に公開する

3. 高度な構成
   ↓
   site と content のリポジトリを分ける
```

このページでは 1 と 2 を中心に扱います。リポジトリ分離が必要な場合は、[Content Repositories](../guides/content-repositories.md) と [Separate Content Repository](../guides/deployment/separate-content-repository.md) を参照してください。

## 1. 手元から初回デプロイする

1. [Cloudflare アカウント](https://www.cloudflare.com/)を用意します。

2. サイトのフォルダで Wrangler を入れます。

   ```bash
   npm install -D wrangler
   ```

3. ビルドしてデプロイします。

   ```bash
   npm exec riebeckite build
   npm exec riebeckite deploy
   ```

   `riebeckite deploy` は、`wrangler.jsonc` が無ければ `assets.directory` を `./dist` に設定して自動で作り、初回は Wrangler のログインを開いてから `dist/` を Cloudflare Workers へ公開します。Worker 名を変えたいときは、生成された `wrangler.jsonc` の `name` を編集します。Wrangler を直接使いたい場合は `npx wrangler login` と `npx wrangler deploy` でも同じです。

4. Wrangler が表示した URL、たとえば `https://<name>.<account>.workers.dev` を開きます。Riebeckite のサイトが表示されれば初回デプロイは成功です。

公開 URL が決まったら、`riebeckite.config.ts` の `site.baseUrl` をその URL に更新します。その後もう一度ビルドとデプロイを実行すると、サイトマップなどに正しい URL が入ります。

```bash
npm exec riebeckite build
npm exec riebeckite deploy
```

## 2. GitHub Actions で自動デプロイする

push のたびにデプロイしたい場合は、CLI がデプロイ設定を尋ねたところで `GitHub Actions + Cloudflare Workers` を選びます。コマンドラインから同じ選択をする場合は次のとおりです。

```bash
npx create-riebeckite my-site --github-actions
```

この option は次のファイルを追加します。

- `wrangler.jsonc`
- `.github/workflows/deploy.yml`

生成された workflow は `npm ci` で依存 package を入れ、`npm exec riebeckite check`、`npm exec riebeckite build`、`cloudflare/wrangler-action@v3` によるデプロイを順に実行します。

GitHub の Settings → Secrets and variables → Actions に、次の secret を追加します。

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

`npm install` で作られた `package-lock.json` も commit してください。その後、`main` へ push するか、Actions タブから workflow を手動実行します。

## 3. 高度な構成: content を別リポジトリに分ける

site の実装と Markdown content を別リポジトリで管理したい場合があります。既存の Obsidian Vault を別 repo で管理している場合、編集者と開発者を分けたい場合、記事とサイト実装の更新サイクルを分けたい場合に有効です。

最初のサイトでは必須ではありません。必要になったら、まず [Content Repositories](../guides/content-repositories.md) を読んでください。具体的な GitHub Actions 構成は [Separate Content Repository](../guides/deployment/separate-content-repository.md) にまとめています。

## 次に読むページ

- [Guides →](../guides/README.md) — content、Obsidian、多言語、デプロイの詳しいガイド
- [Plugins →](../plugins/README.md) — やりたいことから機能を追加する
- [Themes →](../themes/README.md) — サイトの見た目を変える
