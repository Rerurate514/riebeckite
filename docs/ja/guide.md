# 利用ガイド

このガイドは、Riebeckite でサイトを公開する流れを、インストールからデプロイまで順に説明します。動作する例として参照用アプリケーション [`apps/web`](../../apps/web) を使います。各手順の背景となる考え方は、必要に応じてリンク先のドキュメントを参照してください。

## これから行うこと

1. 依存関係をインストールする
2. サイトを設定する
3. コンテンツを追加する
4. 開発サーバーを起動する
5. 状態を確認する
6. ビルドする
7. プレビューしてデプロイする
8. サイトを拡張する
9. 独自プロジェクトで使う

## はじめに

- Node.js（LTS）と pnpm が必要です。
- コマンドはリポジトリのルートで実行します。コンテンツとアプリケーションは分かれています。Markdown は `content/`、HonoX アプリケーションは `apps/web` にあります。
- Riebeckite には scaffold コマンドがあります。`npx create-riebeckite my-site` で、そのまま install・build できる単体サイトを生成できます。参照用アプリケーションと E2E フィクスチャは、さらに作り込んだサイトの例として引き続き有用です。

## 1. 依存関係をインストールする

```bash
pnpm install
```

workspace の各パッケージをインストールし、互いにリンクします。インストール後は CLI を `pnpm exec riebeckite` で実行できます。

## 2. サイトを設定する

サイトの挙動は、リポジトリのルートにある `riebeckite.config.ts` で決まります。最初に触る項目は次のとおりです。

| 項目 | 内容 |
| --- | --- |
| `site.title`、`site.description`、`site.author`、`site.baseUrl`、`site.locale` | ページ、SEO、フィードで使うメタデータ |
| `content.directory` | Markdown のルート。`appRoot`（`apps/web`）基準で解決するため、`../../content` はリポジトリの `content/` を指す |
| `content.exclude` | 除外する Glob パターン。テンプレートや非公開フォルダなど |
| `content.filters.publishStrategy` | `"explicit"` は `publish: true` の項目だけを公開する。`"selective"` は `private: true` または `draft: true` 以外を公開する |
| `theme` | 表示。`defaultTheme({...})` で配色モード、文字組み、レイアウトを指定する |
| `plugins` | Obsidian Markdown、WikiLink、検索、SEO などの機能 |

自分のノートを公開する場合は、`content.directory` を変更し、必要な範囲だけ設定を残します。

```ts
// riebeckite.config.ts
export default defineConfig({
  site: { title: "My notes", baseUrl: "https://example.com" },
  content: {
    directory: "../../content",
    filters: { publishStrategy: "explicit" },
  },
  theme: defaultTheme(),
  plugins: [obsidianMarkdown(), media(), attachment()],
});
```

設定項目の全体、ファイルシステム上のルートの扱い、Obsidian Vault をサイトの外に置く方法は [Configuration](./configuration.md) を参照してください。

## 3. コンテンツを追加する

Markdown ファイルを設定したコンテンツディレクトリに置きます。参照用の設定では `title` が必須で、explicit 戦略では `publish: true` が必要です。

```md
---
title: 最初のノート
publish: true
tags:
  - notes
created: 2026-09-28
modified: 2026-09-28
---

本文です。[[別のノート]] のようにリンクし、![[attachments/diagram.png]] のように画像を埋め込みます。
```

参照用アプリケーションが参照する frontmatter は次のとおりです。

| キー | 効果 |
| --- | --- |
| `title` | ページのタイトル。参照用の診断設定では必須 |
| `id` | analytics プラグインが使う安定 content ID。ない場合は公開されるが計測されない |
| `publish` | explicit 戦略で項目を公開する |
| `private`、`draft` | selective 戦略で項目を除外する |
| `noindex` | 一覧やサイト内インデックスから除外する |
| `tags` | タグページと一覧に反映する |
| `created`、`modified`、`published`、`date` | 並び順と SEO の日時 |

WikiLink、埋め込み、Mermaid、Excalidraw、コードブロックは設定済みの Plugin が処理します。バイナリの添付ファイルは自動では配信用にコピーされません。公開するファイルだけをコピーする prebuild 手順をサイト側に追加してください。`obsidianMarkdown()`、`attachment()`、`media()` は Vault 内の任意のファイルをコピーしないためです。

## 4. 開発サーバーを起動する

```bash
pnpm dev
```

`apps/web` 向けに添付アセットを準備したあと、Vite/HonoX の開発サーバーを起動します。ターミナルに表示された URL を開いてください。サーバーの実行中は Markdown とアプリケーションの変更が反映されます。

## 5. 状態を確認する

ここに挙げるコマンドは読み取り専用で、いつ実行しても安全です。ビルドの前に解決済みの状態を確認するために使います。

```bash
pnpm exec riebeckite check                  # 設定と Plugin の解決を検証する
pnpm exec riebeckite doctor                 # 環境、設定、Plugin、コンテンツを診断する
pnpm exec riebeckite inspect config         # コンテンツディレクトリを含む解決済みのルートを確認する
pnpm exec riebeckite inspect content --list # 読み込まれたコンテンツの論理パスを確認する
pnpm exec riebeckite inspect graph          # WikiLink の関係を確認する
pnpm exec riebeckite inspect plugins        # 解決済みの Plugin を確認する
pnpm exec riebeckite inspect build          # ビルド状態を確認する
```

`check`、`doctor`、`inspect` はそれぞれ別の問いに答えるコマンドで、互いに代用できません。パスが誤っているときは、`doctor` がコンテンツ検査の失敗を報告し、`inspect config` が解決済みのディレクトリを、`inspect content --list` が実際に読み込まれた論理パスを示します。詳しくは [Diagnostics](./diagnostics.md) と [Framework Inspector](./inspector.md) を参照してください。

## 6. ビルドする

```bash
pnpm build
```

`packages/cli` を先にビルドし、続けて `apps/web` を Cloudflare Workers 向けに `apps/web/dist` へビルドします。ビルドは差分方式で、変更のないコンテンツを再利用します。

```bash
pnpm exec riebeckite build          # 差分ビルド
pnpm exec riebeckite build --full   # 差分の再利用なしでビルド
pnpm exec riebeckite profile        # トレースに基づく性能レポート
```

添付ファイルのコピー手順を変更したときなど、意図的に差分の再利用を避けたい場合に `--full` を使います。詳しくは [Build system](./build-system.md) を参照してください。

## 7. プレビューとデプロイ

```bash
pnpm --filter @riebeckite/web preview   # ビルド結果を wrangler dev でローカル配信する
pnpm --filter @riebeckite/web deploy    # ビルドして Cloudflare Workers へデプロイする
```

デプロイ設定は `apps/web/wrangler.jsonc` にあり、`assets.directory` が `./dist` を指します。最初のデプロイの前に、worker 名、compatibility flags、バインディングを確認してください。

リポジトリの外のサイトでは、[Cloudflare デプロイテンプレート](../../templates/cloudflare/README_ja.md) を出発点にします。汎用の `wrangler.jsonc` と、check・build を行い生成された `dist/` を Workers Static Assets としてデプロイする GitHub Actions ワークフローを提供します。Riebeckite はコンテンツのルートと Plugin のエンドポイントを事前生成するため、runtime の `main` を持たない静的アセットのみの構成が参照用アプリケーションと同じ形になります。`CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` をリポジトリのシークレットに設定し、テンプレートの Worker 名を変更してください。最初のデプロイの前に `npx wrangler deploy --dry-run` でローカル検証できます。

ページビュー計測は任意の独立した Worker です。サイトに `@riebeckite/plugin-analytics` を設定し、`templates/analytics-cloudflare`（D1 または KV）のコレクタを専用リポジトリとしてデプロイします。[Analytics](./analytics.md) を参照してください。

## 8. サイトを拡張する

- **Plugin を追加する**: パッケージを参照し、`plugins` 配列に登録します。設定できる項目は `packages/plugins/*/README_ja.md` を参照してください。Plugin は Markdown・HTML の変換、アセット、ブラウザ側の動作、エンドポイント、SEO、診断を追加できます。
- **表示を変える**: `theme` の値やテーマのオプションを変更します。[Theme system](./theme-system.md) を参照してください。
- **ルートと island を追加する**: サイト固有のページはアプリケーション（`apps/web/app/routes`、`app/islands`）に置きます。HonoX と Vite の API はアプリケーションか integration に留め、Plugin には入れません。

## 独自プロジェクトで使う

単体サイトを生成し、install・build します。

```bash
npx create-riebeckite my-site
cd my-site
npm install
npm exec riebeckite check
npm exec riebeckite build
```

scaffolder は生成直後の状態で `check` と `build` を通る自己完結のサイトを書き出します。生成対象のファイルが既にあるディレクトリには `--force` なしでは上書きしません。

生成されるサイトは、E2E フィクスチャ [`tests/external-site/fixture/site`](../../tests/external-site/fixture/site) と同じ site application contract に従います。フィクスチャはサイト内 extension と外部 Vault を追加しているため、それらが必要な場合の参照実装になります。主要なファイルは次のとおりです。

| ファイル | 役割 |
| --- | --- |
| `package.json` | `honox`、`hono`、`vite`、`@riebeckite/*` パッケージを宣言する |
| `riebeckite.config.ts` | サイト、コンテンツ、テーマ、Plugin の設定 |
| `app/config.ts` | `content.directory` をアプリケーションルート基準で一度だけ解決する |
| `app/content.ts` | 解決済みの設定から `ContentManager` を構築する |
| `app/server.ts` | `mountRiebeckiteEndpoints` で HonoX アプリケーションに Riebeckite のエンドポイントを載せる |
| `vite.config.ts` | `riebeckiteVite()` と HonoX の Vite Plugin を登録する |

このフィクスチャは Obsidian Vault を兄弟ディレクトリの `vault/` に置き、`content.directory` をそこへ向けています。Vault を Obsidian デスクトップアプリでも使う場合は、この構成を推奨します。解決の規則と責務の境界は、[Configuration](./configuration.md) の外部 Vault の節と [HonoX Integration](./honox-integration.md) を参照してください。

## トラブルシューティング

| 症状 | 確認する箇所 |
| --- | --- |
| コンテンツが表示されない | explicit 戦略での `publish: true`、`content.exclude` のパターン、`inspect content --list` |
| ファイルはあるのにページが 404 になる | `inspect graph` または `inspect content --list` で解決済みの permalink を確認する |
| あるページのアクセス解析に表示が出ない | コンテンツに安定 `id` がない。`doctor` と diagnostics が `analytics-untracked` として報告する |
| ブラウザのイベントがコレクタに届かない | サイトの `collectorUrl` と Worker の許可 Origin を両方確認する |
| デプロイ後に添付ファイルが 404 になる | prebuild のコピー手順がビルド前に実行され、`public/assets/attachments/` を対象にしているか |
| `doctor` がコンテンツの失敗を報告する | `inspect config` で解決済みのコンテンツディレクトリとその存在を確認する |
| ビルド結果が古い | 差分の再利用なしで `riebeckite build --full` を実行する |

## 次に読むもの

概念と拡張 API は [Content system](./content-system.md)、[Plugin system](./plugin-system.md)、[Theme system](./theme-system.md) へ進んでください。リポジトリ自体の開発手順は [Repository Development](./development.md) を参照してください。
