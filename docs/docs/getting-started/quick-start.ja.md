---
date: 2026-10-08
title: クイックスタート
sidebar.label: クイックスタート
sidebar.order: 20
---
# クイックスタート

空のフォルダから Riebeckite サイトを作り、ブラウザで確認してビルドするまでの最短手順です。最初から内部構造を理解する必要はありません。

## 要件

簡単な要件：[Installation](./installation.ja.md#必要なもの)。Node.js (LTS)、ターミナルが必要です。約5分で終わります。

## 1. サイトを作る

インタラクティブ生成器を実行します。

```bash
npx create-riebeckite
```

プロンプトに次のように答えます（推奨される回答）。

- **Project name**：既定値の `my-riebeckite-site` のまま Enter を押します
- **What would you like to build?**（[[glossary/preset|プリセット]]）：迷ったら `Starter site`（`starter` プリセット）のまま。記事、タグ、シリーズを公開するなら `Blog` を選びます。[Presets](./presets.ja.md) を参照
- **Customize extra project files?**：変更する必要がなければ `No` のまま Enter を押します。既定のプロジェクトファイルは生成されます
- **Where will you write content?**：`This project` ならサイト内の `content/`、`Separate directory in this repository` ならサイトの隣の Vault（例：`../vault`）、`Separate GitHub repository` なら別リポジトリにコンテンツを置きます
- **Set up deployment?**：まず手元で試すなら、既定値の `Not now` のまま Enter を押します。すぐに公開準備まで進めたい場合だけ `Cloudflare Workers` を選びます。依存関係のインストール後に `Deploy now?` と聞かれ、`Yes` でそのまま初回公開、`Later` で後回しにできます。`main` への push ごとの自動公開は `GitHub Actions`。[Deployment](../guides/deployment/README.ja.md) を参照
- **Install dependencies now?**：既定値の `Yes` のまま Enter を押すと、生成されたサイトの package もインストールされます

成功すると `Created a starter Riebeckite site in my-riebeckite-site`（入力した名前が入る）と、次に実行するコマンドの一覧が表示されます。インストールの質問に既定値の `Yes` で答えた場合、package はインストール済みです。フォルダへ移動します。

```bash
cd my-riebeckite-site
```

`No` を選んだ場合は、先にそのフォルダで `npm install` を実行してください。`npm install` は、生成されたサイトの package を入れます。生成されるサイトは、まずは1つのリポジトリとして考えれば十分です。`@riebeckite/*` パッケージは npm から入るので、これだけで足ります。

最初に触ることが多いファイルは、本文を書く `content/index.md` と、`site.title`、`site.baseUrl`、`content.directory` を設定する `riebeckite.config.ts` です。

## 2. 開発を開始する

まず、生成された設定を検証します。

```bash
npm exec riebeckite check
```

次に、開発サーバーを起動します。

```bash
npm exec riebeckite dev
```

生成されたアプリによって開発サーバーが起動します。 **ターミナルに表示されたローカル URL をブラウザで開いてください**。 Riebeckite のサイトが表示されれば成功です。開発サーバーは `content/` を読み込み、`dist/` は作りません。ビルド出力は `build` の実行後にだけ作られます。起動しない場合は `npm exec riebeckite doctor` を実行してください。

編集中はこのコマンドを起動したままにします。止めるときは `Ctrl + C` を押します。

Windows では、関連する編集をまとめて保存し、サーバーの再起動が終わってから再読み込みしてください。複数のファイルを続けて保存すると Vite のサーバーが何度も再起動し、一時的に `transport was disconnected` と表示されることがあります。再起動後に再読み込みすれば解消します。

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

`content/index.md` に `[[hello]]`（Obsidian [[glossary/wikilink|WikiLink]]）を追加します。starter preset は `@riebeckite/plugin-obsidian-markdown` を有効にしています。生成されたコンテンツ自体が `[[guide]]`、`[[examples]]` を使っています。リンクをクリックして確認してください。

## 6. サイトをビルドする

```bash
npm exec riebeckite build
```

成功すると、公開用の静的ファイルが `dist/` に作られます。デプロイでは、この `dist/` を配信します。

## 7. サイトを公開する

公開の方法は、ステップ 1 で選んだデプロイの選択肢で決まります。

- **`Cloudflare Workers` を選んだ場合**：Wrangler はすでにインストールされています。ビルドして公開します。
  ```bash
  npm exec riebeckite build
  npm exec -- riebeckite publish run --execute
  ```

- **`GitHub Actions` を選んだ場合**：生成されたワークフローが `main` へのプッシュごとにサイトを公開します。コミットしてプッシュすれば実行されます。詳しくは [Deployment](../guides/deployment/README.ja.md) を参照してください。

- **`Not now` を選んだ場合**：`dist/` のビルド出力は任意の静的ホストで使えます。プロバイダー固有の手順は [Deployment](../guides/deployment/README.ja.md) を参照してください。

## 次に読むページ

- [Deployment](../guides/deployment/README.ja.md) - Cloudflare Workers への公開と GitHub Actions による自動化
- [プロジェクト構成](./project-structure.ja.md) - 一体型・ディレクトリ分離型・リポジトリ分離型を比較し、`content.directory` を決める
- [一体型](./integrated-setup.ja.md)・[ディレクトリ分離型](./separate-directories-setup.ja.md)・[リポジトリ分離型](./separate-repositories-setup.ja.md) - 公式サンプル付きの完全な手順
- [Presets](./presets.ja.md) - `starter`、`digital-garden`、`blog`、`writer`、`docs`、`portfolio`、`minimal`、`empty` を比較する
- [First Content](./first-content.ja.md) - Markdown の書き方と確認方法をもう少し詳しく見る
- [Installation](./installation.ja.md) - 要件とセットアップの詳しい解説
- [サイトのアイコンとロゴ →](../guides/branding.ja.md) - アイコン・ヘッダーのロゴ・リンクプレビュー画像を差し替える
- [Obsidian Vault →](../guides/obsidian.ja.md) - [[glossary/obsidian-vault|Obsidian Vault]] を[[glossary/content-source|コンテンツソース]]として使う
- [Separate Content Repository →](../guides/deployment/separate-content-repository.ja.md) - コンテンツを別リポジトリに分割
