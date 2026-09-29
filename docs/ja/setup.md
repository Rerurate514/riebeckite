# セットアップガイド

この資料は、Riebeckite をはじめて触る人向けに、環境の準備からブログの公開までを順番に並べたものです。パソコンの操作に慣れていなくても、上から順に進めれば最後までたどり着けるように書いています。

扱うのは次の3つです。

1. このリポジトリを自分のパソコンで動かす
2. riebeckite で新しいサイトを作る
3. Cloudflare Workers へ公開する

> **いまの公開状況**
> Riebeckite の本体パッケージ（`@riebeckite/*`）はまだ npm に公開されていません。そのため、いまは「このリポジトリを clone して使う」のが現実的な方法です。npm に公開されたあとは、`npx create-riebeckite` だけで新しいサイトを作れるようになります。この資料では、公開後も同じ手順が使えるように書き分けています。

## この資料の使い方

全部を一度にやる必要はありません。目的に合わせて、次の場所から読み始めてください。

|やりたいこと|読む章|
|---|---|
|とりあえず動くブログを1つ公開したい|[1章](#1-このリポジトリをパソコンで動かす) → [3章](#3-cloudflare-workers-へ公開する)|
|0から自分のサイトを作りたい|[1章](#1-このリポジトリをパソコンで動かす) → [2章](#2-riebeckite-で新しいサイトを作る)|
|開発に参加したい|[1章](#1-このリポジトリをパソコンで動かす) → [Repo Development](./development.md)|

## 用意するもの

|必要なもの|何に使うか|入手方法|
|---|---|---|
|Node.js（LTS版）|コマンドを動かす土台|[nodejs.org](https://nodejs.org/ja) からインストール|
|pnpm|パッケージ（部品）を入れる道具|Node.js を入れたあと `npm install -g pnpm`|
|Git|リポジトリを取得する|[git-scm.com](https://git-scm.com/)|
|Cloudflare アカウント|サイトを公開する場所|[cloudflare.com](https://www.cloudflare.com/)（3章で使います）|
|GitHub アカウント|自動公開を使う場合のみ|[github.com](https://github.com/)（3章の方法Bで使います）|

コマンド3つ（Node.js・pnpm・Git）が入ったか確認します。ターミナル（Windows なら PowerShell、Mac ならターミナル）を開いて、次を1行ずつ実行してください。

```sh
node -v
pnpm -v
git --version
```

それぞれ `v24.11.1` のような文字が出れば成功です。「コマンドが見つかりません」と出たら、その道具のインストールが済んでいません。

## 1. このリポジトリをパソコンで動かす

### 1-1. リポジトリを取得する

好きなフォルダで次を実行します。

```sh
git clone https://github.com/Rerurate514/riebeckite.git
cd riebeckite
```

`riebeckite` フォルダができて、その中に移動できていれば成功です。

### 1-2. 部品をインストールする

```sh
pnpm install
```

初回は数分かかります。途中で止まって見えても、待っていれば終わります。

### 1-3. コマンドをビルドする（最初の落とし穴）

`riebeckite` コマンドは、リポジトリに入っているプログラムをビルドしないと動きません。ここを飛ばして先に進むと、次のエラーで止まります。

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '...\packages\cli\dist\cli.js'
```

これが出たら、次を実行してください。これが正解の対処です。

```sh
pnpm build
```

これは CLI と見本サイトの両方をビルドします。CLI だけビルドしたいときはこちらです。

```sh
pnpm --filter @riebeckite/cli build
```

### 1-4. 見本サイトを起動する

```sh
pnpm dev
```

しばらくすると、ターミナルに `http://localhost:5173` のような URL が表示されます。ブラウザで開くと見本サイトが見えます。止めるときはそのターミナルで `Ctrl + C` を押します。

### 1-5. 表示する記事を用意する

新しく clone した直後は、記事が1つもないのでページが表示されません。リポジトリ直下に `content` フォルダを作り、その中に `index.md` を作って次のように書きます。

```md
---
title: はじめまして
publish: true
---

# はじめまして

最初の記事です。
```

`title`（記事のタイトル）と `publish: true`（公開する印）は必須です。どちらかが欠けると、ページに出てきません。この2行を書いたファイルを `content` に足していけば、記事が増えます。

### 1-6. 状態を確認する

うまくいかないときは、次の2つのコマンドで原因を調べられます。

```sh
pnpm exec riebeckite check
```

設定が正しいかを確認します。正しければ `Riebeckite configuration is valid.` と表示されます。

```sh
pnpm exec riebeckite doctor
```

より詳しい健康診断です。記事の書き忘れなどがあると `✗`（バツ）が付きます。バツの内容を直せば消えていきます。記事がまだ無い状態ではバツが出ますが、1-5 の記事を1つ作れば減ります。

## 2. riebeckite で新しいサイトを作る

ここからは、このリポジトリとは別に、自分のサイトを新しく作る手順です。1章が終わっている（`pnpm build` 済み）ことが前提です。

### 2-1. ひな形を生成する

リポジトリのルートで、次のように実行します。`my-site` の部分は好きな名前に変えてください。

```sh
pnpm exec riebeckite init ../my-site
```

`../my-site` は「1つ上のフォルダに `my-site` を作る」という意味です。中身のあるフォルダを指定すると、間違えて上書きしないようエラーで止まります。上書きしたいときだけ `--force` を付けます。

### 2-2. 何が生成されるか

主なものは次のとおりです。

|生成物|役割|
|---|---|
|`riebeckite.config.ts`|サイト名や URL、使う機能を書く設定ファイル。最初にここを直します|
|`content/`|記事（Markdown）を置く場所|
|`app/`|サイトの見た目とルーティング。`routes/` と `components/` が中心|
|`vite.config.ts`|ビルドの設定。通常は触りません|
|`package.json`|使う部品とコマンドの一覧|
|`README.md`|このサイト専用の短いメモ|

### 2-3. 設定を自分のサイト用に変える

`riebeckite.config.ts` を開き、`site` の部分を自分の情報に書き換えます。

```ts
site: {
  title: "わたしのブログ",
  description: "日々のメモを書いています",
  baseUrl: "https://example.com",
  locale: "ja",
},
```

`title` はサイト名、`description` は説明、`baseUrl` は公開する URL です。`baseUrl` は、サイトマップや RSS に載る URL になるので、3章で公開したあとに実際の URL へ直すと確実です。`locale` は言語（日本語なら `"ja"`）です。

### 2-4. 記事を書く

`content/` の中に `.md` ファイルを追加します。書式は 1-5 と同じで、先頭に次の2行を入れます。

```md
---
title: 記事のタイトル
publish: true
---
```

ファイル名がそのまま URL の一部になります。`content/first-post.md` なら `/first-post` で見られます。

### 2-5. 部品をインストールする（公開状況に注意）

生成された `package.json` は `@riebeckite/core@^0.0.3` などの部品を参照しますが、これらはまだ npm に公開されていません。そのため、いま `npm install` を実行すると、部品が見つからず失敗します。

- **npm 公開後**: サイトのフォルダで `npm install` を実行するだけで使えます。
- **いま試したい場合**: このリポジトリの [external-site フィクスチャ](../../tests/external-site/README.md) と同じ方法で、各部品を tarball に固めて読み込ませる必要があります。手順は同 README にまとまっています。少し上級者向けです。

いま動くブログが1つほしいだけなら、新しいサイトを作らず、1章の見本サイトをそのまま使って3章で公開するのが一番の近道です。

### 2-6. 新しいサイトでの日常的なコマンド

インストールが済んだあとは、サイトのフォルダで次を使います。

```sh
npx riebeckite dev           # 開発サーバーを起動する
npx riebeckite check         # 設定が正しいか確認する
npx riebeckite doctor        # 詳しい健康診断
npx riebeckite build         # 公開用のファイルを dist/ に書き出す
```

## 3. Cloudflare Workers へ公開する

### 3-1. 公開の仕組み

Riebeckite は、ビルドした時点で全ページを静的なファイルとして書き出します（この方式を SSG と呼びます）。公開とは、その `dist/` フォルダの中身を Cloudflare Workers の静的アセットとして置くだけです。サーバー側で動かすプログラムは不要で、そのぶん料金も構成もシンプルになります。ページビュー計測を追加したい場合は、別途デプロイする Worker があります（[Analytics](./analytics.md) を参照）。

### 3-2. 方法A: 手元のパソコンから公開する（おすすめ）

Cloudflare の画面で細かく設定する必要がなく、一番わかりやすい方法です。

1. [Cloudflare](https://www.cloudflare.com/) でアカウントを作る。
2. サイトのフォルダで wrangler（Cloudflare の公開用コマンド）を入れます。

   ```sh
   npm install -D wrangler
   ```

3. 配布物である `templates/cloudflare/wrangler.jsonc` をサイト直下にコピーし、`name` を自分だけの Worker 名に変えます。`assets` の `directory` が `./dist` になっていることを確認します。
4. ビルドして、Cloudflare にログインし、公開します。

   ```sh
   npx riebeckite build
   npx wrangler login
   npx wrangler deploy
   ```

5. 最後に表示される URL（`https://<name>.<account>.workers.dev` の形）をブラウザで開きます。表示されれば公開成功です。この URL を `riebeckite.config.ts` の `baseUrl` に書き、もう一度ビルドして公開し直すと、サイトマップなどが正しい URL になります。

公開前に、実際にアップロードせず確認することもできます。

```sh
npx wrangler deploy --dry-run   # 設定とファイルを検証するだけ
npx wrangler dev                # 公開したときと同じ内容を手元で表示する
```

**このリポジトリの見本サイトを公開する場合**は、wrangler と `wrangler.jsonc` がすでに用意されています。ルートで次を実行します。Worker 名は `apps/web/wrangler.jsonc` の `name` で変えられます。

```sh
pnpm build
pnpm --filter @riebeckite/web exec wrangler login
pnpm --filter @riebeckite/web exec wrangler deploy
```

### 3-3. 方法B: GitHub に push したら自動で公開する

サイトの更新のたびに手元で公開コマンドを打つのが面倒なら、GitHub Actions で自動化できます。配布物である [Cloudflare デプロイテンプレート](../../templates/cloudflare/README_ja.md) を使います。

1. `templates/cloudflare/wrangler.jsonc` をサイトのルートにコピーし、`name` を変える。
2. `templates/cloudflare/.github/workflows/deploy.yml` を、サイトのリポジトリの同じパスへコピーする。
3. Cloudflare で **Workers Scripts: Edit** 権限の API トークンを作り、GitHub リポジトリの Settings → Secrets and variables → Actions に次を登録する。
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
4. `main` ブランチに push するか、Actions タブから手動で実行する。

この方法では、最初の `npm install` で作られる `package-lock.json` をコミットしておく必要があります。GitHub Actions の `npm ci` がこれをそのまま使います。詳しい前提と流れは[テンプレートの README](../../templates/cloudflare/README_ja.md)にまとまっています。

## うまくいかないときは

|症状|原因|対処|
|---|---|---|
|`Cannot find module ... cli.js` と出る|CLI がまだビルドされていない|`pnpm build` を実行する|
|`riebeckite` コマンドが見つからない|同上、または違うフォルダにいる|`pnpm build`、そのあとリポジトリのルートにいるか確認|
|記事が表示されない|`content/` が空、または `publish: true` や `title` が無い|frontmatter の2行を確認する|
|`npm install` で `@riebeckite/*` が 404 になる|本体がまだ npm に無い|1章の見本サイトを使う、または公開を待つ|
|ページが 404 になる|ファイル名と URL がずれている|ファイル名と `content/` の場所を確認する|
|公開したのに 404 になる|ビルド結果が `dist/` に出ていない|`npx riebeckite build` を実行し、`wrangler.jsonc` の `directory` を確認する|
|`doctor` で Content に `✗` が出る|記事に問題がある|表示されたメッセージのとおりに直す|
|古い内容が残る|差分ビルドが古い状態を持っている|`npx riebeckite build --full` で作り直す|

## 用語のかんたん説明

- **リポジトリ**: プログラムとファイルを1つにまとめた置き場。ここでは Riebeckite 本体のことです。
- **依存パッケージ**: プログラムが動くために必要な部品。`npm install` でまとめて入ります。
- **ビルド**: 書いたプログラムを、実際に動かせる形に変換すること。
- **dev サーバー**: 手元のパソコンだけでサイトを表示する仕組み。`npx riebeckite dev` で起動します。
- **SSG / 静的アセット**: あらかじめ全ページをファイルとして作っておき、そのまま配る方式。
- **Cloudflare Workers**: サイトを公開する場所。ここでは静的なファイルを置くだけに使います。
- **wrangler**: Cloudflare に公開するためのコマンド。
- **frontmatter**: Markdown ファイルの先頭に `---` で囲んで書く設定（`title` や `publish` など）。
- **npm / npx**: 部品を入れたり、コマンドを動かしたりする道具。

## 関連資料

- [Getting Started](./getting-started.md) — 起動とビルドの最短手順
- [利用ガイド](./guide.md) — 設定とデプロイを含む全体手順
- [CLI](./cli.md) — 各コマンドの詳しい説明
- [Repository Development](./development.md) — このリポジトリ自体の開発に参加する場合
- [Cloudflare デプロイテンプレート](../../templates/cloudflare/README_ja.md) — 自動公開の詳細