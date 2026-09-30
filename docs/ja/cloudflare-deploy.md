# Cloudflare Workers 公開ガイド

Riebeckite で作ったサイトを Cloudflare Workers に公開する手順だけに絞ったガイドです。

## 前提

サイトのフォルダで、次のコマンドが成功していることを確認します。

```sh
npm install
npm exec riebeckite build
```

ビルドに成功すると `dist/` フォルダが作られます。Cloudflare Workers には、この `dist/` の中身を公開します。

## 1. Cloudflare アカウントを作る

[cloudflare.com](https://www.cloudflare.com/) でアカウントを作ります。最初は無料枠で十分です。

## 2. wrangler を入れる

サイトのフォルダで実行します。

```sh
npm install -D wrangler
```

wrangler は、Cloudflare Workers に公開するための公式コマンドです。

## 3. wrangler.jsonc を置く

このリポジトリの [`templates/cloudflare/wrangler.jsonc`](../../templates/cloudflare/wrangler.jsonc) を、サイトのルートにコピーします。生成したサイトだけを手元に置いている場合は、リンク先の内容を新しい `wrangler.jsonc` に貼り付けても構いません。

`name` を自分だけの Worker 名に変えます。`assets.directory` は `./dist` のままにします。

```jsonc
{
  "name": "my-riebeckite-site",
  "assets": {
    "directory": "./dist"
  }
}
```

## 4. Cloudflare にログインする

```sh
npx wrangler login
```

ブラウザが開いたら、Cloudflare にログインして許可します。

## 5. 公開する

```sh
npx wrangler deploy
```

最後に `https://<name>.<account>.workers.dev` のような URL が表示されます。ブラウザで開いて、サイトが見えれば成功です。

## 6. baseUrl を公開 URL に合わせる

公開できたら、`riebeckite.config.ts` の `baseUrl` を実際の URL に変えます。

```ts
site: {
  baseUrl: "https://my-riebeckite-site.example.workers.dev",
},
```

そのあと、もう一度ビルドして公開します。

```sh
npm exec riebeckite build
npx wrangler deploy
```

## 公開せずに確認する

```sh
npx wrangler deploy --dry-run
npx wrangler dev
```

`--dry-run` は設定とファイルの検証だけを行います。`wrangler dev` は、公開時に近い状態で手元に表示します。

## GitHub Actions で自動公開したい場合

手元で毎回 `npx wrangler deploy` を実行する代わりに、GitHub に push したら公開する構成も使えます。詳しい手順は [Cloudflare デプロイテンプレート](../../templates/cloudflare/README_ja.md) を参照してください。

## 次に読むもの

- [サイト公開までの最短ガイド](./quick-publish.md)
- [利用ガイド](./guide.md)
- [CLI](./cli.md)
