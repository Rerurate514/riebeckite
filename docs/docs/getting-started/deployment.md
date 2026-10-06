# Deployment

Riebeckite は静的サイトを作ります。`npm exec riebeckite build` を実行すると、公開用のファイルが `dist/` に作られます。デプロイでは、この `dist/` を配信します。標準的な公開先として、ここでは [Cloudflare Workers](https://workers.cloudflare.com/) を使います。

デプロイには次の3つの方法があります。排他的な選択ではなく、後から追加できます。

| 方法 | 向いているケース |
| --- | --- |
| Local-first（手元から公開） | 最短で初回公開したい |
| GitHub Actions | push ごとに自動公開したい |
| Content Repository 分離 | Vault と Site を別リポジトリで管理したい |

Local-first は GitHub Actions の置き換えではありません。自動化が必要になったら GitHub Actions を追加します。

```text
Local-first
  → 手元から Cloudflare Workers へ公開する

GitHub Actions
  → push 時に自動で公開する

Content Repository 分離
  → site と content のリポジトリを分ける
```

このページでは Local-first、GitHub Actions、Custom Domain の設定を扱います。リポジトリ分離が必要な場合は、[Content Repositories](../guides/content-repositories.md) と [Separate Content Repository](../guides/deployment/separate-content-repository.md) を参照してください。

## 1. 手元から初回デプロイする（Local-first）

最短で初回公開する方法です。

1. [Cloudflare アカウント](https://www.cloudflare.com/)を用意します。

2. デプロイ設定で `Cloudflare Workers` を選んでサイトを作ります。

   ```bash
   npx create-riebeckite my-site
   ```

   `Cloudflare Workers` を選ぶと、生成されるサイトに Wrangler の依存と `wrangler.jsonc` が含まれ、依存関係のインストール後に `Deploy now?` と確認されます。`Yes` ならその場で build と deploy まで実行されます。`Later` の場合は生成だけを終え、後から次を実行します。

   ```bash
   npm run build
   npm exec riebeckite deploy
   ```

3. `riebeckite deploy` は `dist/` を Cloudflare Workers へ公開します。初回は Wrangler のログインがブラウザで開きます。`deploy` は build を行わないため、先に `riebeckite build` で `dist/` を作ります。Worker 名を変えたいときは、生成された `wrangler.jsonc` の `name` を編集します。`Not now` で生成した既存サイトでは、先に `npm install -D wrangler` を実行してください。

4. Wrangler が表示した URL、たとえば `https://<name>.<account>.workers.dev` を開きます。Riebeckite のサイトが表示されれば初回デプロイは成功です。

公開 URL が決まったら、`riebeckite.config.ts` の `site.baseUrl` をその URL に更新します。その後もう一度ビルドとデプロイを実行すると、サイトマップなどに正しい URL が入ります。

```bash
npm exec riebeckite build
npm exec riebeckite deploy
```

### Custom Domain を追加する

最初の Worker デプロイが終わったら、site repository で次を実行します。

```bash
npm exec riebeckite deploy domain
```

`example.com` のような apex domain、または `docs.example.com` のような subdomain を入力します。この command は hostname だけを受け付け、変更内容を表示して確認を取ってから `wrangler.jsonc` または `wrangler.json` を更新します。追加される Wrangler 設定は次のとおりです。

```jsonc
{
  "routes": [
    { "pattern": "docs.example.com", "custom_domain": true }
  ]
}
```

`Deploy now` を選ぶと、通常の `riebeckite deploy` の流れで公開します。後で公開する場合は `npm exec riebeckite deploy` を実行してください。Cloudflare Workers では、同じ Cloudflare account で active な zone にある Custom Domain の DNS record と TLS certificate を Cloudflare が作成します。Worker が site の origin になるこの構成では、既存 origin の前に置く Worker Route ではなく Custom Domain を使います。

この command は `wrangler.toml` を変更しません。TOML を使っている場合は、次の設定を手動で追加してください。

```toml
[[routes]]
pattern = "docs.example.com"
custom_domain = true
```

デプロイ前に、domain が同じ account の active な Cloudflare zone にあることを確認してください。既存の CNAME record、別 account の zone、同じ hostname にある Custom Domain ではない Worker Route は、先に解消が必要です。wildcard domain と URL path は Custom Domain に使えません。`workers.dev` URL も残したい場合は、必要に応じて TOML では `workers_dev = true`、JSON では `"workers_dev": true` を明示します。

Cloudflare で hostname が有効になったら、`site.baseUrl` を `https://docs.example.com` または apex domain の URL に変更し、もう一度 build と deploy を実行します。domain の設定は version control に残るため、GitHub Actions でも push ごとに同じ Worker 設定を deploy できます。

## 2. GitHub Actions で自動デプロイする

push のたびにデプロイしたい場合は、CLI がデプロイ設定を尋ねたところで `GitHub Actions` を選びます。コマンドラインから同じ選択をする場合は次のとおりです。

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

### 後から Local-first の Site へ追加する

すでに手元から公開している Site は、作り直さずに継続デプロイへ移行できます。Site の Directory で次を実行します。

```bash
npm exec riebeckite deploy setup
```

このコマンドは、Git Repository と GitHub Remote を検出し、GitHub CLI と Wrangler のログインを確認し、同じテンプレートから `.github/workflows/deploy.yml` を作成し、`CLOUDFLARE_ACCOUNT_ID` と `CLOUDFLARE_API_TOKEN` を Repository Secret として登録します。push の直前で止まるため、準備ができたら `git push` を実行します。再実行しても安全で、作成済みの workflow と登録済みの secret は検出され、そのまま維持されます。

## 3. 高度な構成: content を別リポジトリに分ける

site の実装と Markdown content を別リポジトリで管理したい場合があります。既存の Obsidian Vault を別 repo で管理している場合、編集者と開発者を分けたい場合、記事とサイト実装の更新サイクルを分けたい場合に有効です。

最初のサイトでは必須ではありません。必要になったら、まず [Content Repositories](../guides/content-repositories.md) を読んでください。具体的な GitHub Actions 構成は [Separate Content Repository](../guides/deployment/separate-content-repository.md) にまとめています。

## 次に読むページ

- [Guides →](../guides/README.md) — content、Obsidian、多言語、デプロイの詳しいガイド
- [Plugins →](../plugins/README.md) — やりたいことから機能を追加する
- [Themes →](../themes/README.md) — サイトの見た目を変える
