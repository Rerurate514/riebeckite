---
date: 2026-10-08
title: インストール
sidebar:
  label: インストール
  order: 20
---
# インストール

このページでは、何も入っていない状態から Riebeckite のサイトを起動するまでを説明します。Riebeckite の知識は前提にしません。Riebeckite のリポジトリを clone する必要もありません。

> **ドキュメントのバージョン:** このサイトは `main` ブランチを説明しています。npm の `latest` タグは古い場合があります。`npx create-riebeckite` と `npm exec riebeckite` が導入するバージョンは `npm view @riebeckite/cli version` で確認してください。ここに書かれた機能が見つからない場合、公開済みパッケージがその機能より前のものです。次のリリースを待つか、ソースからビルドしてください。

## 必要なもの

| 項目 | 用途 |
| --- | --- |
| Node.js | `^20.19.0` または `>=22.12.0`。Riebeckite のコマンドを動かす |
| npm | パッケージのインストールに使う。Node.js に同梱されています |
| ターミナル | コマンドを実行する。Windows なら **PowerShell**、macOS なら **ターミナル** |
| Git | 任意。リポジトリ履歴と GitHub デプロイで使う |
| GitHub アカウント | GitHub Actions で自動デプロイするときに使う |
| Cloudflare アカウント | デプロイするときに使う |

`npm` は Node.js に同梱されているため、別途インストールする必要はありません。Git と GitHub アカウントは任意で、リポジトリ履歴と自動デプロイに使います。手元から Cloudflare へ直接公開する場合は、後から用意しても構いません。詳しくは [デプロイ](./deployment.ja.md) を参照してください。

次のコマンドで、ツールが使えることを確認します。

```bash
node -v
npm -v
```

`node -v` が `^20.19.0` または `>=22.12.0` に一致すれば準備できています（例: `v20.19.0`、`v22.12.0`、`v24`）。古い場合や `v21` のような非対応バージョンの場合は Node.js を更新してください。コマンドが見つからない場合は、そのツールをインストールしてからターミナルを開き直してください。Git が入っていない場合は [git-scm.com](https://git-scm.com/) からインストールできます。

## サイトを作る

サイトを作るフォルダで、生成器を実行します。

```bash
npx create-riebeckite
```

`npx` は `create-riebeckite` をダウンロードして一度だけ実行するため、グローバルには何もインストールしません。CLI は次の順に確認します。

1. **Project name**：作るフォルダ名。既定値は `my-riebeckite-site`。好みで `my-site` などに変えられます
2. **What would you like to build?**（[[glossary/preset|プリセット]]）：サイトの構成。迷ったら `Starter site`（`starter` プリセット）のまま。比較は [プリセット](./presets.ja.md)
3. **Add optional feature packs?**：追加のプラグインを入れる機能パックを選ぶ場合は `Yes`。既定は `No` です。非対話で追加する場合は `--features <names>` を使用します。[プリセット](./presets.ja.md) で利用可能な packs を参照してください
4. **Customize extra project files?**：エディタやツール用の生成ファイルを変える場合は `Yes`。既定の `No` でも既定のプロジェクトファイルは生成されます
5. **Where will you write content?**：`This project` は `content/` をサイト内に置く最も簡単な形です。`Separate GitHub repository` は既存の Vault 向けの高度な構成です。詳細は [Content Repositories](../guides/content-repositories.ja.md)
6. **Set up deployment?**：`Cloudflare Workers`、`GitHub Actions`、`Not now` から選びます。`Cloudflare Workers` はインストール後に `Deploy now?` と確認されるため、その場で初回公開まで進められます。`GitHub Actions` は `main` への push ごとの自動公開です。`Not now` はデプロイの設定を省略します。詳細は [デプロイ](./deployment.ja.md)
7. **Install dependencies now?**：既定は `Yes` です。生成したプロジェクトを確認してからインストールしたいときは `No` を選びます。

プロンプトに答える代わりに、コマンドラインで同じ設定を渡すこともできます。

```bash
npx create-riebeckite my-site --preset starter
```

- 生成されたトップレベルの名前が既存のエントリと衝突する場合、コマンドは停止します。上書きしたい場合は `--force` を追加してください。
- ターゲットフォルダにあるその他のファイルは `--force` なしで許可されます。
- 利用できる[[glossary/preset|プリセット]]は `npx create-riebeckite --list-presets` で確認できます。
- フォルダ名を渡すと非対話で実行されます。プリセット、コンテンツの取得元、デプロイ、インストールの質問は省略され、依存関係もインストールされません。`dev` の前に、フォルダ内で `npm install` を実行してください（下記参照）。

プロンプトでインストールしなかった場合は、フォルダへ移動してパッケージを入れます。

```bash
cd my-riebeckite-site
npm install
```

`@riebeckite/*` は npm で公開されているため、これだけで足ります。最初のインストールには少し時間がかかることがあります。npm が脆弱性を報告した場合は `npm audit` で内容を確認してください。ビルド用の推移的依存関係に由来するものも多く含まれます。`npm audit fix --force` は、変更されるバージョンを確認してからでないと実行しないでください。

この手順では npm を使います。pnpm 10 以降を使う場合、`pnpm install` がビルドスクリプトの無視を報告することがあります。`pnpm approve-builds` を実行し、内容を確認して信頼できる package を承認してから `dev` を起動してください。

最近の npm 11 では依存パッケージのインストールスクリプトが実行されないことがあります。`npm install` が `Ignored build scripts: esbuild` と表示した場合は、`npm approve-scripts esbuild` で承認してから `npm install` を再実行してください。

## 生成されるファイル

| ファイルやフォルダ | 役割 |
| --- | --- |
| `riebeckite.config.ts` | サイト名、URL、言語、[[glossary/theme|テーマ]]、[[glossary/plugin|プラグイン]]の設定。最初に編集するファイル |
| `content/` | Markdown を置く場所 |
| `app/` | 生成サイトの見た目とルーティング。主に `routes/` と `components/` を編集する |
| `public/` | そのままコピーされた静的ファイル：`favicon.ico` と `riebeckite-logo.png`。同梱の favicon とヘッダーロゴはプレースホルダーなので、サイトのブランドに合わせて置き換えてください。`starter` プリセットはリンクプレビュー（OG）画像を生成しませんが、`blog` プリセットは生成します。[サイトのアイコンとロゴ](../guides/branding.ja.md) を参照してください |
| `vite.config.ts` | ビルド設定。通常は変更しない |
| `package.json` | 依存パッケージと `riebeckite` コマンド |
| `README.md` | 生成されたサイト向けの短い説明 |
| `.gitignore`、`.editorconfig`、`.gitattributes`、`biome.json` | 既定のプロジェクトファイル。`Customize extra project files?` のプロンプトまたは `--utilities` で変更できる |

生成されるファイルはプリセットによって変わります。`empty` は空のアプリケーションシェル、`starter` はサンプルノートをつないだ実用的なサイト、`showcase` はリファレンス・描画例・ローカル fixture を加えた構成です。詳しくは [プリセット](./presets.ja.md) を参照してください。

## 生成されたディレクトリを確認する

生成されたサイトのフォルダ構成は次のとおりです。

```text
my-site/
├─ content/               あなたの Markdown ファイル
├─ public/                静的ファイル
├─ app/                   生成されたアプリコード（通常は編集しない）
├─ riebeckite.config.ts   サイト設定
├─ package.json
├─ vite.config.ts
├─ tsconfig.json
├─ biome.json             既定のプロジェクトファイル
├─ .editorconfig
├─ .gitattributes
├─ .gitignore
├─ README.md
└─ dist/                  本番ビルドの出力（build 後）
```

コンテンツを別リポジトリに分ける構成は、必要になってから [Content Repositories](../guides/content-repositories.ja.md) を読めば十分です。

## サイト設定を確認する

`riebeckite.config.ts` を開き、`site` ブロックを編集します。

```ts
site: {
  title: "My Blog",
  description: "Notes from my days",
  baseUrl: "https://example.com",
  locale: "ja",
},
```

| フィールド | 意味 |
| --- | --- |
| `title` | サイト名 |
| `description` | SEO と、有効にした場合のフィードで使う概要 |
| `baseUrl` | サイトを公開する URL。[[glossary/sitemap|サイトマップ]]と、有効にしたフィードに反映されるため、デプロイ後に実際の URL を設定する |
| `locale` | サイトの言語（日本語なら `"ja"`、英語なら `"en"`） |

生成された設定のうち `content`、`theme`、`plugins` は、すでにプリセットに合った値になっています。各フィールドの詳しい説明は [設定](../reference/configuration.ja.md) を参照してください。

## 開発サーバーを起動する

```bash
npm exec riebeckite dev
```

ターミナルに `http://localhost:5173` のような URL が表示されます。ポート 5173 が使用中の場合は Vite が次の空きポートを選ぶため、表示された URL をブラウザで開いてください。サーバーの起動中は Markdown とアプリケーションの編集が反映されます。開発サーバーは `content/` を読み込み、`dist/` は作りません。ビルド出力は `build` の実行後にだけ作られます。止めるときは `Ctrl + C` を押します。起動しない場合は `npm exec riebeckite doctor` を実行し、[CLI リファレンス](../reference/cli.ja.md) を参照してください。

## 日常的に使うコマンド

サイトのフォルダ内で実行します。

```bash
npm exec riebeckite check  # 設定を検証する
npm exec riebeckite dev    # 開発サーバーを起動する
npm exec riebeckite build  # 公開用ファイルを dist/ に出力する
```

増分キャッシュを使わずに作り直す場合は、`npm exec -- riebeckite build --full` を実行します。

最初に動作を確認するだけなら、`check`、`dev`、`build` で足ります。あとから問題が見つかった場合は、`check`、`doctor`、`inspect` などの読み取り専用の診断コマンドも使えます。詳しくは [CLI リファレンス](../reference/cli.ja.md) を参照してください。

## 次に読むページ

- [最初のコンテンツ →](./first-content.ja.md)
