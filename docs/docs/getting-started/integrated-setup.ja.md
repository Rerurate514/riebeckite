---
date: 2026-11-05
title: 一体型セットアップ
sidebar:
  label: 一体型セットアップ
  order: 22
---
# 一体型セットアップ

一体型は、`content/` とサイト実装を1つのリポジトリに置く構成です。既定値で、最も間違いが少ない選択です。

公式サンプル: [Rerurate514/riebeckite-e2e-integrated](https://github.com/Rerurate514/riebeckite-e2e-integrated) — [integrated.riebeckite.dev](https://integrated.riebeckite.dev)

## 1. プロジェクトを作る

```sh
npx create-riebeckite my-site --preset starter --github-actions
cd my-site
npm install
```

`--github-actions` を付けると `wrangler.jsonc` と `.github/workflows/publish.yml` が生成されます。`npm install` は `package-lock.json` を作り、ワークフローはこのファイルがある場合に `npm ci` を使います。

## 2. Worker 名とドメインを設定する

`wrangler.jsonc` を編集します。

```jsonc
{
  "name": "my-site",
  "routes": [{ "pattern": "my-site.example.com", "custom_domain": true }]
}
```

Worker 名は Cloudflare アカウント内で一意にしてください。カスタムドメインの DNS レコードは自動で作られるため、同じホスト名の DNS レコードを別途追加しないでください。

`riebeckite.config.ts` に公開 URL を設定します。

```ts
site: {
  title: "My site",
  baseUrl: "https://my-site.example.com",
},
```

## 3. ローカルで動かす

```sh
npm exec riebeckite check
npm exec riebeckite dev
```

表示された URL をブラウザで開きます。`content/index.md` を編集し、ページが更新されることを確認してください。

## 4. ビルドする

```sh
npm exec riebeckite build
```

静的サイトは `dist/` に出力されます。`package-lock.json` はコミットし、`dist/` と `node_modules/` はコミットしません。

## 5. デプロイする

最初の手動デプロイ:

```sh
npm exec -- riebeckite publish run --execute
```

初回は Cloudflare のログインが開きます。自動デプロイには、GitHub リポジトリへ次を登録します。

- Secret `CLOUDFLARE_API_TOKEN`：Account の **Workers Scripts:Edit**、Zone の **Workers Routes:Edit**、Zone の **Zone:Read**
- Variable `CLOUDFLARE_ACCOUNT_ID`：Cloudflare のアカウント ID

生成されたワークフローは `main` への push ごとにデプロイします。詳しくは [Cloudflare Workers](../guides/deployment/cloudflare-workers.ja.md) と [GitHub Actions](../guides/deployment/github-actions.ja.md) を参照してください。

## 6. 確認する

```sh
curl -I https://my-site.example.com/
curl -I https://my-site.example.com/notes/writing
```

HTML、CSS、画像、404 ページ、`sitemap.xml`、`robots.txt` を確認します。カスタムドメインが開かない場合は、ルートがデプロイされていないか、同じホスト名を別の Worker が使っています。

## 次に読む

- [コンテンツの場所](./content-location.ja.md)
- [ディレクトリ分離型セットアップ](./separate-directories-setup.ja.md)
- [リポジトリ分離型セットアップ](./separate-repositories-setup.ja.md)
