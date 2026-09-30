# サイト公開までの最短ガイド

新しい Riebeckite サイトを作り、最初の記事を書き、Cloudflare Workers に公開するまでの最短手順です。Riebeckite 本体のリポジトリを clone する必要はありません。

## 先に用意するもの

- Node.js（LTS）
- Cloudflare アカウント
- ターミナル（Windows は PowerShell、Mac はターミナル）

Node.js を入れたあと、次が動くか確認します。

```sh
node -v
npm -v
```

## 1. 新しいサイトを作る

サイトを置きたいフォルダで実行します。`my-site` は好きな名前に変えて構いません。

```sh
npx create-riebeckite my-site
cd my-site
npm install
```

迷ったら標準の `starter` のままで大丈夫です。小さく始めたい場合は `--preset minimal` を使います。

```sh
npx create-riebeckite my-site --preset minimal
```

## 2. サイト名を変える

`riebeckite.config.ts` の `site` を自分のサイトに合わせます。

```ts
site: {
  title: "わたしのブログ",
  description: "日々のメモを書いています",
  baseUrl: "https://example.com",
  locale: "ja",
},
```

`baseUrl` は、公開後に実際の URL へ直せば大丈夫です。

## 3. 最初の記事を書く

`content/first-post.md` を作ります。

```md
---
title: 最初の記事
publish: true
---

# 最初の記事

Riebeckite で作った最初の記事です。
```

`title` と `publish: true` は公開する記事に必要です。

## 4. 手元で表示する

```sh
npm exec riebeckite dev
```

`http://localhost:5173` のような URL が出たら、ブラウザで開きます。止めるときは `Ctrl + C` を押します。

## 5. 公開用にビルドする

```sh
npm exec riebeckite check
npm exec riebeckite doctor
npm exec riebeckite build
```

成功すると、公開用のファイルが `dist/` に作られます。

## 6. Cloudflare Workers に公開する

wrangler を入れます。

```sh
npm install -D wrangler
```

このリポジトリの [`templates/cloudflare/wrangler.jsonc`](../../templates/cloudflare/wrangler.jsonc) をサイト直下へコピーします。生成したサイトだけを手元に置いている場合は、リンク先の内容を新しい `wrangler.jsonc` に貼り付けても構いません。

`wrangler.jsonc` の `name` を自分だけの Worker 名に変えます。`assets.directory` は `./dist` のままにします。

```sh
npx wrangler login
npx wrangler deploy
```

最後に表示された URL を開き、サイトが見えれば公開成功です。その URL を `riebeckite.config.ts` の `baseUrl` に入れて、もう一度ビルド・公開します。

```sh
npm exec riebeckite build
npx wrangler deploy
```

## 次に読むもの

- [記事の書き方ガイド](./writing-content.md)
- [Obsidian のノートをサイトにするガイド](./obsidian-publishing.md)
- [Cloudflare Workers 公開ガイド](./cloudflare-deploy.md)
