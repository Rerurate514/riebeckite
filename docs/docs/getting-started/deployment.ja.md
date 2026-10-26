---
date: 2026-10-08
title: デプロイ
sidebar:
  label: デプロイ
  order: 50
---
# デプロイ

Riebeckite は静的サイトを生成します。`npm exec riebeckite build` を実行すると、公開用のファイルが `dist/` に出力されます。デプロイとは、このフォルダを配信することです。標準的な公開先として、ここでは [Cloudflare Workers](https://workers.cloudflare.com/) の静的アセットを使います。

デプロイには次の3つの方法があります。どれか1つを選ぶものではなく、必要に応じて後から追加できます。

| 方法 | 向いているケース |
| --- | --- |
| Local-first（手元から公開） | 最短で初回公開したい |
| GitHub Actions | push のたびに自動デプロイしたい |
| Content Repository の分離 | Vault とサイトを別リポジトリで管理したい |

Local-first は GitHub Actions の代わりではありません。自動化したくなったら GitHub Actions を追加します。

```text
Local-first
  → 手元から Cloudflare Workers へ公開する

GitHub Actions
  → push 時に自動で公開する

Content Repository の分離
  → サイトとコンテンツのリポジトリを分ける
```

この入門ページでは、Local-first、GitHub Actions、独自ドメインの設定を扱います。リポジトリを分けた構成が必要な場合は、[Content Repositories](../guides/content-repositories.ja.md) と [Separate Content Repository](../guides/deployment/separate-content-repository.ja.md) を参照してください。

## 1. 手元から初回デプロイする（Local-first）

最短で公開する方法です。

1. [Cloudflare アカウント](https://www.cloudflare.com/)を用意します。

2. デプロイ先に `Cloudflare Workers` を選んで、サイトを生成します。

   ```bash
   npx create-riebeckite my-site
   ```

   `Cloudflare Workers` を選ぶと、生成されるサイトに Wrangler の依存と `wrangler.jsonc` が含まれます。依存関係のインストール後に `Deploy now?` と確認されます。`Yes` ならその場でビルドとデプロイまで実行されます。`Later` の場合は生成だけを終え、後から次を実行します。

   ```bash
   npm run build
   npm exec riebeckite deploy
   ```

3. `riebeckite deploy` は `dist/` を Cloudflare Workers へ公開し、初回は Wrangler のログインをブラウザで開きます。`deploy` コマンドはビルドを行わないため、先に `riebeckite build` で `dist/` を作ってください。Worker 名を変えたいときは、生成された `wrangler.jsonc` の `name` を編集します。`Not now` で生成した既存のサイトでは、先に `npm install -D wrangler` を実行してください。

4. Wrangler が表示した URL、たとえば `https://<name>.<account>.workers.dev` を開きます。Riebeckite のサイトが表示されれば、初回デプロイは成功です。

公開 URL が決まったら、`riebeckite.config.ts` の `site.baseUrl` をその URL に更新します。その後、もう一度ビルドとデプロイを実行すると、サイトマップなどに正しい URL が入ります。

```bash
npm exec riebeckite build
npm exec riebeckite deploy
```

### 独自ドメインを割り当てる

最初の Worker デプロイが終わったら、サイトのリポジトリで次を実行します。

```bash
npm exec riebeckite deploy domain
```

`example.com` のような apex ドメイン、または `docs.example.com` のようなサブドメインを入力します。このコマンドはホスト名だけを受け付け、変更内容を表示して確認を取ってから `wrangler.jsonc` または `wrangler.json` を更新します。追加される Wrangler の設定は次のとおりです。

```jsonc
{
  "routes": [
    { "pattern": "docs.example.com", "custom_domain": true }
  ]
}
```

`Deploy now` を選ぶと、通常の `riebeckite deploy` の流れで公開します。後で公開する場合は `npm exec riebeckite deploy` を実行してください。Cloudflare Workers では、同じ Cloudflare アカウントで有効な zone にある Custom Domain を使います。DNS レコードと TLS 証明書は Cloudflare が作成します。Worker がサイトの配信元になるこの構成では、既存の配信元の前に置く Worker Route ではなく、Custom Domain を使ってください。

このコマンドは `wrangler.toml` を変更しません。TOML を使っている場合は、次の設定を手動で追加してください。

```toml
[[routes]]
pattern = "docs.example.com"
custom_domain = true
```

デプロイ前に、ドメインが同じアカウントの有効な Cloudflare zone にあることを確認してください。既存の CNAME レコードがある場合、zone が別アカウントにある場合、同じホスト名に Custom Domain 以外の Worker Route がある場合は、先に解消が必要です。ワイルドカードドメインと URL パスは Custom Domain に使えません。`workers.dev` の URL も残したい場合は、必要に応じて TOML では `workers_dev = true`、JSON では `"workers_dev": true` を明示します。

Cloudflare でホスト名が有効になったら、`site.baseUrl` を `https://docs.example.com` または apex ドメインの URL に変更します。その後、もう一度ビルドとデプロイを実行してください。ドメインの設定はバージョン管理に残るため、GitHub Actions でも push のたびに同じ Worker の設定をデプロイできます。

## 2. GitHub Actions で自動デプロイする

push のたびにデプロイしたい場合は、CLI がデプロイ設定を尋ねたところで `GitHub Actions` を選びます。コマンドラインから同じ選択をする場合は次のとおりです。

```bash
npx create-riebeckite my-site --github-actions
```

このオプションは次のファイルを追加します。

- `wrangler.jsonc`
- `.github/workflows/deploy.yml`

生成されたワークフローは `npm ci` で依存パッケージをインストールします。その後、`npm exec riebeckite check` と `npm exec riebeckite build` を実行し、`cloudflare/wrangler-action@v3` でデプロイします。

GitHub の Settings → Secrets and variables → Actions で、次のシークレットを追加します。

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

`npm install` で作られた `package-lock.json` もコミットしてください。その後、`main` へ push するか、Actions タブからワークフローを手動で実行します。

### 手元公開のサイトに後から GitHub Actions を追加する

すでに手元から公開しているサイトは、作り直さずに継続的デプロイへ移行できます。サイトのディレクトリで次を実行します。

```bash
npm exec riebeckite deploy setup
```

このコマンドは、Git リポジトリと GitHub のリモートを検出し、GitHub CLI と Wrangler のログインを確認します。同じテンプレートから `.github/workflows/deploy.yml` を作成し、`CLOUDFLARE_ACCOUNT_ID` と `CLOUDFLARE_API_TOKEN` をリポジトリのシークレットとして登録します。push の直前で止まるため、準備ができたら `git push` を実行してください。再実行しても安全で、作成済みのワークフローと登録済みのシークレットは検出され、そのまま維持されます。

GitHub のワークフロー、アクセス、デプロイ用シークレットを変更せずに確認するには、次を実行します。

```bash
npm exec -- riebeckite doctor --github
```

## 3. 応用: コンテンツを別リポジトリに分ける

サイトの実装と Markdown のコンテンツを別リポジトリで管理したい場合があります。既存の Obsidian Vault を別のリポジトリで管理している場合、編集者と開発者を分けたい場合、記事とサイト実装の更新サイクルを分けたい場合に有効です。

最初のサイトでは必須ではありません。必要になったら、まず [Content Repositories](../guides/content-repositories.ja.md) を読んでください。具体的な GitHub Actions の構成は [Separate Content Repository](../guides/deployment/separate-content-repository.ja.md) にまとめています。

## 次に読むページ

- [ガイド →](../guides/README.ja.md)：コンテンツ、Obsidian、多言語、デプロイの詳しいガイド
- [プラグイン →](../plugins/README.ja.md)：やりたいことから機能を追加する
- [テーマ →](../themes/README.ja.md)：サイトの見た目を変える
