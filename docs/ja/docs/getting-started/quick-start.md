# クイックスタート

 emptyフォルダから、Riebeckite サイトをブラウザで確認してビルドするまでの最短手順です。最初から内部構造を理解する必要はありません。

## 要件

簡単な要件：[Installation](./installation.md#requirements)。Node.js (LTS)、ターミナルが必要です。約5分で終わります。

## 1. サイトを作る

インタラクティブ生成器を実行します。

```bash
npx create-riebeckite
```

プロンプトに次のように答えます（推奨される回答）：

- **Project name** — 既定値の `my-site` のまま Enter を押します
- **Preset** - 迷ったら `starter` のまま。[Presets](./presets.md) を参照
- **Content source** - `This project` を選んで Markdown をサイトのフォルダ内に残します
- **Deployment** - 最短で公開するなら `Cloudflare Workers`。依存関係のインストール後に `Deploy now?` と聞かれ、`Yes` でそのまま初回公開、`Later` で後回しにできます。push ごとの自動公開は `GitHub Actions`、後回しは `Not now`。[Deployment](./deployment.md) を参照

成功すると `Created a starter Riebeckite site in my-site`（入力した名前が入る）と、次に実行するコマンドの一覧が表示されます。`Cloudflare Workers` を選んだ場合は、生成の一部として依存関係が自動でインストールされます。それ以外を選んだ場合は、フォルダへ移動して package を入れます。

```bash
cd my-site
npm install
```

`npm install` は、生成されたサイトの package を入れます。生成されるサイトは、まずは1つのリポジトリとして考えれば十分です。`@riebeckite/*` パッケージは npm から入るので、これだけで足ります。

## 2. 開発を開始する

```bash
npm exec riebeckite dev
```

生成されたアプリによって開発サーバーが起動します。 **ターミナルに表示されたローカル URL をブラウザで開いてください。** Riebeckite のサイトが表示されれば成功です。

編集中はこのコマンドを起動したままにします。止めるときは `Ctrl + C` を押します。

## 3. 最初のページを編集

`content/index.md` を編集します。たとえば見出しを `# My Digital Garden` に変更します。ファイルを保存するとブラウザで変更が反映されます。

## 4. もう一つページを作る

`content/hello.md` を作成します。`publish: true` が必須です。

```md
---
publish: true
---

# Hello

This is my second page.
```

`/hello` で表示されます。

## 5. ページをリンクする

`content/index.md` に `[[hello]]`（Obsidian WikiLink）を追加します。starter preset は `@riebeckite/plugin-obsidian-markdown` を有効にしています。生成されたコンテンツ自体が `[[guide]]`、`[[examples]]` を使しています。リンクをクリックして確認してください。

## 6. サイトをビルドする

```bash
npm exec riebeckite build
```

成功すると、公開用の静的ファイルが `dist/` に作られます。デプロイでは、この `dist/` を配信します。

## 7. Cloudflare Workers へ公開する

生成時に `Cloudflare Workers` を選んだサイトには Wrangler の依存と `wrangler.jsonc` がすでに含まれているため、追加の準備は要りません。ビルドして公開します。

```bash
npm run build
npm exec riebeckite deploy
```

`Deploy now?` で `Yes` を選んだ場合は、生成直後に build と deploy まで自動で実行され、`https://<name>.<account>.workers.dev` のような URL が表示されます。`Later` を選んだ場合や、後から更新を公開する場合は上の2コマンドを実行します。初回は Wrangler のログインがブラウザで開きます。`Not now` で生成した既存サイトでは、先に `npm install -D wrangler` を実行してください。

公開 URL が決まったら、`riebeckite.config.ts` の `site.baseUrl` をその URL に更新し、もう一度ビルドとデプロイを実行すると、サイトマップなどに正しい URL が入ります。

```bash
npm exec riebeckite build
npm exec riebeckite deploy
```

push のたびに自動デプロイしたい場合は [Deployment](./deployment.md) の GitHub Actions へ進んでください。Content を別リポジトリに分けたい場合は [Separate Content Repository →](../guides/content-repositories.md) を参照してください。

## 次に読むページ

- [Deployment](./deployment.md) - Cloudflare Workers への公開と GitHub Actions による自動化
- [Presets](./presets.md) - `starter`、`minimal`、`showcase`、`empty` を比較する
- [First Content](./first-content.md) - Markdown の書き方と確認方法をもう少し詳しく見る
- [Installation](./installation.md) - 要件とセットアップの詳しい解説
- [Obsidian Vault →](../guides/obsidian.md) - Obsidian Vault をコンテンツソースとして使う
- [Separate Content Repository →](../guides/content-repositories.md) - コンテンツを別リポジトリに分割