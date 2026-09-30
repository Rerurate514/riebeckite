<p align="center">
  <img src="./assets/logos/riebeckite-logo-horizontal.png" alt="Riebeckite" width="480" />
</p>

# Riebeckite

> [English](./README.md)

Riebeckite は、Markdown と Obsidian 形式のノートを Web サイトとして公開するための拡張可能なコンテンツフレームワークです。コンテンツの読み込み、解釈、拡張、表示、ビルドを分けて扱うため、サイト固有の要件が増えても Markdown の処理を一つの巨大な実装にまとめずに済みます。

このリポジトリは pnpm のモノレポで、フレームワークの Core、CLI、HonoX/Vite 統合、Plugin、Theme、参照用の HonoX アプリケーションを収録しています。この文書はエントリポイントです。同梱のアプリケーションを起動する手順を示し、設定や拡張は各ドキュメントへ案内します。

## 必要な環境

- Node.js（LTS）
- pnpm

依存関係は pnpm workspace で管理します。インストールと実行には pnpm を使ってください。

環境構築に慣れていない場合は、先に [セットアップガイド](./docs/ja/setup.md) を読んでください。Node.js や Git の入れ方から、画面を表示するところまで順番に説明しています。

## 新しいサイトを作成する

公式の preset から単体のサイトを
[`create-riebeckite`](./packages/create-riebeckite) で生成できます。

```bash
npx create-riebeckite my-site
cd my-site
npm install
npm exec riebeckite build
```

| オプション | 内容 |
| --- | --- |
| `[directory]` | 生成先ディレクトリ（既定はカレントディレクトリ） |
| `--preset <name>` | 使用するスターター構成（既定は `starter`） |
| `--force` | 空でないディレクトリにも展開する |
| `--list-presets` | 利用可能な preset と説明を一覧表示する |

各 preset は自己完結のスターターで、小さいものから順に次のとおりです。

| Preset | 内容 |
| --- | --- |
| `empty` | 空のアプリケーションシェル（Plugin・Theme・コンテンツなし） |
| `minimal` | 最小構成のサイト（Obsidian Markdown、minimal Theme、1 ページ） |
| `starter` | 標準のスターター（Obsidian Markdown、カラーモード、7 言語、サイトヘッダー） |
| `rich` | 公開・閲覧向け Plugin に加え、エコシステムを紹介するページ付き |
| `full` | ブログ一式（検索・メディア・関連記事などの Plugin とビルドガイド） |
| `max` | `full` に図表・ナレッジ系 Plugin とサンプルページを追加 |
| `ultra` | 全 Plugin カタログと Theme リファレンスページを同梱 |

`starter` から始めて、サイトに必要なものだけを追加してください。このリポジトリの参照アプリケーションは、完全にカスタマイズした例として役立ちます。詳しい手順は [Getting Started](./docs/ja/getting-started.md) を参照してください。

## 参照アプリケーションを起動する

```bash
pnpm install     # workspace の依存関係をインストールする
pnpm dev         # アセットを準備して開発サーバーを起動する
```

`pnpm dev` は `apps/web` 向けに添付アセットを準備したあと、Vite/HonoX の開発サーバーを起動します。ターミナルに表示された URL を開いてください。サーバーの実行中は `content/` とアプリケーションの変更が自動で反映されます。

## ビルド・プレビュー・デプロイ

```bash
pnpm build                              # CLI と参照アプリケーションをビルドする
pnpm --filter @riebeckite/web preview   # ビルド結果をローカルで確認する
pnpm --filter @riebeckite/web deploy    # ビルドして Cloudflare Workers へデプロイする
```

`pnpm build` は `packages/cli` を先にビルドし、続けて `apps/web` を Cloudflare Workers 向けにビルドします。ビルド結果は `apps/web/dist` に出力され、デプロイ設定は `apps/web/wrangler.jsonc` にあります。

## 設定を検証する

問題を調べる前に、リポジトリのルートで読み取り専用のコマンドを実行します。

```bash
pnpm exec riebeckite check      # 設定と Plugin の解決を検証する
pnpm exec riebeckite doctor     # 状態を変更せずに健全性を診断する
pnpm exec riebeckite inspect    # フレームワークが解釈した状態を確認する
```

`check`、`doctor`、`inspect` はそれぞれ別の問いに答えるコマンドで、互いに代用できません。使い方と自動化の注意点は [CLI リファレンス](./docs/ja/cli.md) を参照してください。

## よく使うコマンド

| コマンド | 内容 |
| --- | --- |
| `pnpm dev` | 参照アプリケーションの開発サーバーを起動する |
| `pnpm build` | CLI と参照アプリケーションをビルドする |
| `pnpm exec riebeckite build --full` | 差分の再利用なしでビルドする |
| `pnpm exec riebeckite profile` | トレースに基づく性能レポートを作る |
| `pnpm --filter @riebeckite/web preview` | ビルド結果をローカルで配信する |
| `pnpm --filter @riebeckite/web deploy` | 参照アプリケーションを Cloudflare Workers へデプロイする |
| `pnpm lint` / `pnpm format` / `pnpm check` | Biome による lint・整形・修正を実行する |

## 次に読むもの

[日本語ドキュメント一覧](./docs/ja/README.md) から始めてください。よく使う入口は次のとおりです。

1. [サイト公開までの最短ガイド](./docs/ja/quick-publish.md): 新しいサイトを作って公開するまでの最短手順
2. [Obsidian のノートをサイトにするガイド](./docs/ja/obsidian-publishing.md): Vault を公開サイトのコンテンツとして使う手順
3. [記事の書き方ガイド](./docs/ja/writing-content.md): frontmatter、Markdown、画像、下書きの基本
4. [利用ガイド](./docs/ja/guide.md): インストールからデプロイまでの全体手順
5. [Configuration](./docs/ja/configuration.md): `riebeckite.config.ts`、コンテンツディレクトリ、テーマ

個々の Plugin と Theme は各パッケージの README（`packages/plugins/*/README_ja.md`、`packages/themes/*/README_ja.md`）で説明しています。英語版は [README.md](./README.md) と [英語ドキュメント一覧](./docs/en/README.md) から読めます。

## リポジトリ構成

| パス | 役割 |
| --- | --- |
| [`packages/core`](./packages/core) | コンテンツの契約、Pipeline、Plugin・Theme API、診断、観測機能 |
| [`packages/cli`](./packages/cli) | Node.js 向け CLI とビルド時ツール |
| [`packages/create-riebeckite`](./packages/create-riebeckite) | 新しいサイトを生成する（`npx create-riebeckite`） |
| [`packages/integrations/honox`](./packages/integrations/honox) | HonoX と Vite の統合 |
| [`packages/plugins`](./packages/plugins) | コンテンツ、表示、公開を拡張するプラグイン |
| [`packages/themes`](./packages/themes) | 組み込み CSS テーマとトークン実装 |
| [`apps/web`](./apps/web) | 参照用の HonoX アプリケーション |
| [`docs/en`](./docs/en/README.md) / [`docs/ja`](./docs/ja/README.md) | 英語・日本語ドキュメント |

Core、Plugin、Integration、Theme を変更する前に、[リポジトリ開発ガイド](./docs/ja/development.md) と該当する設計資料を読んでください。Core にフレームワーク固有、または個別パッケージ固有の逆向き依存を追加しないことが重要です。
