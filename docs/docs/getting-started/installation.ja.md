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
| Git | サイトをリポジトリとして管理するために使う |
| GitHub アカウント | GitHub Actions で自動デプロイするときに使う |
| Cloudflare アカウント | デプロイするときに使う |

`npm` は Node.js に同梱されているため、別途インストールする必要はありません。Git と GitHub アカウントは自動デプロイでのみ使います。手元から Cloudflare へ直接公開する場合は、後から用意しても構いません。これらは [デプロイ](./deployment.ja.md) で使います。

次のコマンドで、ツールが使えることを確認します。

```bash
node -v
npm -v
git --version
```

`node -v` が `v20.19` 以降か `v22.12` 以降なら準備できています。古い場合は Node.js を更新してください。コマンドが見つからない場合は、そのツールをインストールしてからターミナルを開き直してください。Git が入っていない場合は [git-scm.com](https://git-scm.com/) からインストールできます。

## サイトを作る

サイトを作るフォルダで、生成器を実行します。

```bash
npx create-riebeckite
```

`npx` は `create-riebeckite` をダウンロードして一度だけ実行するため、グローバルには何もインストールしません。CLI は次の順に確認します。

1. **Project name**：作るフォルダ名。既定値は `my-riebeckite-site`。好みで `my-site` などに変えられます
2. **Preset**：サイトの構成。迷ったら `starter` のまま。比較は [プリセット](./presets.ja.md)
3. **追加のプロジェクトファイルのカスタマイズ**：任意です。エディタやツール用の生成ファイルを変える必要がなければ、既定値のまま進めます。
4. **Content source**：`This project` は `content/` をサイト内に置く最も簡単な形です。`Separate GitHub repository` は既存の Vault 向けの高度な構成です。詳細は [Content Repositories](../guides/content-repositories.ja.md)
5. **デプロイ設定**：`Cloudflare Workers`、`GitHub Actions`、`Not now` から選びます。`Cloudflare Workers` はインストール後に `Deploy now?` と確認されるため、その場で初回公開まで進められます。`GitHub Actions` は push ごとの自動公開です。`Not now` はデプロイの設定を省略します。詳細は [デプロイ](./deployment.ja.md)
6. **依存パッケージを今すぐインストール**：既定は yes です。生成したプロジェクトを確認してからインストールしたいときは no を選びます。

プロンプトに答える代わりに、コマンドラインで同じ設定を渡すこともできます。

```bash
npx create-riebeckite my-site --preset starter
```

- 既存のディレクトリへ生成する場合、既存ファイルと衝突すると停止します。上書きしてよいと分かっている場合だけ `--force` を使います。
- 利用できる[[glossary/preset|プリセット]]は `npx create-riebeckite --list-presets` で確認できます。
- フォルダ名を渡すと非対話で実行されます。プリセット、コンテンツの取得元、デプロイ、インストールの質問は省略され、依存関係もインストールされません。`dev` の前に、フォルダ内で `npm install` を実行してください（下記参照）。

プロンプトでインストールしなかった場合は、フォルダへ移動してパッケージを入れます。

```bash
cd my-site
npm install
```

`@riebeckite/*` は npm で公開されているため、これだけで足ります。最初のインストールには少し時間がかかることがあります。npm が脆弱性を報告した場合は `npm audit` で内容を確認してください。ビルド用の推移的依存関係に由来するものも多く含まれます。`npm audit fix --force` は、変更されるバージョンを確認してからでないと実行しないでください。

この手順では npm を使います。pnpm 10 以降を使う場合、`pnpm install` がビルドスクリプトの無視を報告することがあります。`pnpm approve-builds` を実行し、内容を確認して信頼できる package を承認してから `dev` を起動してください。

## 生成されるファイル

| ファイルやフォルダ | 役割 |
| --- | --- |
| `riebeckite.config.ts` | サイト名、URL、言語、[[glossary/theme|テーマ]]、[[glossary/plugin|プラグイン]]の設定。最初に編集するファイル |
| `content/` | Markdown を置く場所 |
| `app/` | 生成サイトの見た目とルーティング。主に `routes/` と `components/` を編集する |
| `public/` | favicon、ヘッダーのロゴ、リンクプレビュー画像など、そのまま配信する静的ファイル。差し替えは [サイトのアイコンとロゴ](../guides/branding.ja.md) |
| `vite.config.ts` | ビルド設定。通常は変更しない |
| `package.json` | 依存パッケージと `riebeckite` コマンド |
| `README.md` | 生成されたサイト向けの短い説明 |

生成されるファイルはプリセットによって変わります。`empty` は空のアプリケーションシェル、`starter` はサンプルノートをつないだ実用的なサイト、`showcase` はリファレンス・描画例・ローカル fixture を加えた構成です。詳しくは [プリセット](./presets.ja.md) を参照してください。

通常の最初の構成は、サイトとコンテンツが同じリポジトリにある形です。

```text
my-site/
├─ content/
├─ app/
├─ riebeckite.config.ts
└─ package.json
```

コンテンツを別リポジトリに分ける構成は、必要になってから [Content Repositories](../guides/content-repositories.ja.md) を読めば十分です。

## 生成されたディレクトリを確認する

生成されたサイトのフォルダ構成は次のとおりです。

```text
my-site/
├─ content/               Your Markdown files
├─ public/                Static files
├─ app/                   Generated app code (rarely edited)
├─ riebeckite.config.ts   Site configuration
├─ package.json
├─ vite.config.ts
├─ tsconfig.json
├─ README.md
└─ dist/                  Production build output (after build)
```

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
| `description` | SEO とフィードで使う概要 |
| `baseUrl` | サイトを公開する URL。[[glossary/sitemap|サイトマップ]]やフィードに反映されるため、デプロイ後に実際の URL を設定する |
| `locale` | サイトの言語（日本語なら `"ja"`、英語なら `"en"`） |

生成された設定のうち `content`、`theme`、`plugins` は、すでにプリセットに合った値になっています。各フィールドの詳しい説明は [設定](../reference/configuration.ja.md) を参照してください。

## 開発サーバーを起動する

```bash
npm exec riebeckite dev
```

ターミナルに `http://localhost:5173` のような URL が表示されます。ブラウザで開いてください。サーバーの起動中は Markdown とアプリケーションの編集が反映されます。開発サーバーは `content/` を読み込み、`dist/` は作りません。ビルド出力は `build` の実行後にだけ作られます。止めるときは `Ctrl + C` を押します。起動しない場合は `npm exec riebeckite doctor` を実行し、[CLI リファレンス](../reference/cli.ja.md) を参照してください。

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
