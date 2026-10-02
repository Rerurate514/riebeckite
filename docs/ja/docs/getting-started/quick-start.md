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
- **Deployment** - 手元で試すだけなら `Not now`。後から追加できます。[Deployment](./deployment.md) を参照

成功すると `Created a starter Riebeckite site in my-site`（入力した名前が入る）と、次に実行するコマンドの一覧が表示されます。フォルダへ移動して package を入れます。

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

成功すると、公開用の静的ファイルが `dist/` に作られます。デプロイするフォルダです。ここでは Cloudflare や GitHub Actions は導入しません。

## 次に読むページ

- [Presets](./presets.md) - `starter`、`minimal`、`showcase`、`empty` を比較する
- [First Content](./first-content.md) - Markdown の書き方と確認方法をもう少し詳しく見る
- [Installation](./installation.md) - 要件とセットアップの詳しい解説
- [Obsidian Vault →](../guides/obsidian.md) - Obsidian Vault をコンテンツソースとして使う
- [Separate Content Repository →](../guides/content-repositories.md) - コンテンツを別リポジトリに分割