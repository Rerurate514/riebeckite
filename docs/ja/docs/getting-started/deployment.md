---
title: Deployment
sidebar:
  label: Deployment
  order: 50
---
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

3. サイト直下に `wrangler.jsonc` を作ります。

   ```jsonc
   {
     "$schema": "node_modules/wrangler/config-schema.json",
     "name": "my-site",
     "compatibility_date": "2026-06-09",
     "compatibility_flags": ["nodejs_compat"],
     "assets": { "directory": "./dist" }
   }
   ```

   `name` は自分の Worker 名に変えてください。`assets.directory` は、Riebeckite のビルド結果である `./dist` のままにします。他のフィールドはそのままにしておきます。内容は [templates/cloudflare/wrangler.jsonc](https://github.com/Rerurate514/riebeckite/blob/main/templates/cloudflare/wrangler.jsonc) と同じです。

4. ビルドして、ログインし、デプロイします。

   ```bash
   npm exec riebeckite build
   npx wrangler login
   npx wrangler deploy
   ```

5. Wrangler が表示した URL、たとえば `https://<name>.<account>.workers.dev` を開きます。Riebeckite のサイトが表示されれば初回デプロイは成功です。

公開 URL が決まったら、`riebeckite.config.ts` の `site.baseUrl` をその URL に更新します。その後もう一度ビルドとデプロイを実行すると、サイトマップなどに正しい URL が入ります。

## 2. GitHub Actions で自動デプロイする

push のたびにデプロイしたい場合は、GitHub Actions 用のファイルを作って進めます。まだサイトを作っていないなら、作るときから指定します。

```bash
npx create-riebeckite my-site --github-actions
```

この option は次のファイルを追加します。

- `wrangler.jsonc`
- `.github/workflows/deploy.yml`

生成された workflow は `npm ci` で依存 package を入れ、`npm exec riebeckite check`、`npm exec riebeckite build`、`cloudflare/wrangler-action@v3` によるデプロイを順に実行します。

すでに `my-site` を作っている場合、このコマンドは既存ファイルと衝突して停止します（[Installation](./installation.md) を参照）。`--force` を付ければ生成ファイルを上書きできますが、自分で変更したファイルも置き換わるため、その旨を確認できたときだけ使ってください。

次に、次の3つを用意します。

1. サイトのリポジトリを GitHub へ push する
2. Cloudflare の API トークンと Account ID を用意する
3. GitHub リポジトリの Secret に登録する

手順は [GitHub Actions](../guides/deployment/github-actions.md) にまとめています。特に `package-lock.json` は commit してください。生成 workflow の `npm ci` はこのファイルがないと実行できません。

準備ができたら、`main` へ push するか、Actions タブから workflow を手動実行します。

## 3. 高度な構成: content を別リポジトリに分ける

site の実装と Markdown content を別リポジトリで管理したい場合があります。既存の Obsidian Vault を別 repo で管理している場合、編集者と開発者を分けたい場合、記事とサイト実装の更新サイクルを分けたい場合に有効です。

最初のサイトでは必須ではありません。必要になったら、まず [Content Repositories](../guides/content-repositories.md) を読んでください。具体的な GitHub Actions 構成は [Separate Content Repository](../guides/deployment/separate-content-repository.md) にまとめています。

## 次に読むページ

- [Guides →](../guides/README.md) — content、Obsidian、多言語、デプロイの詳しいガイド
- [Plugins →](../plugins/README.md) — やりたいことから機能を追加する
- [Themes →](../themes/README.md) — サイトの見た目を変える
