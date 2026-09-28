# Riebeckite

> [English](./README.md)

Riebeckite は、Markdown と Obsidian 形式のノートを Web サイトとして公開するための拡張可能なコンテンツフレームワークです。コンテンツの読み込み、解釈、拡張、表示、ビルドを分けて扱うため、サイト固有の要件が増えても Markdown の処理を一つの巨大な実装にまとめずに済みます。

このリポジトリは pnpm のモノレポで、フレームワークの Core、CLI、HonoX/Vite 統合、Plugin、Theme、参照用の HonoX アプリケーションを収録しています。この文書はエントリポイントです。同梱のアプリケーションを起動する手順を示し、設定や拡張は各ドキュメントへ案内します。

## 必要な環境

- Node.js（LTS）
- pnpm

依存関係は pnpm workspace で管理します。インストールと実行には pnpm を使ってください。

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

1. [Getting Started](./docs/ja/getting-started.md): 最小構成のプロジェクトと開発の流れ
2. [Configuration](./docs/ja/configuration.md): `riebeckite.config.ts`、コンテンツディレクトリ、テーマ
3. [Content System](./docs/ja/content-system.md): ソース、manifest、グラフ
4. [Plugin System](./docs/ja/plugin-system.md) と [Theme System](./docs/ja/theme-system.md): サイトを拡張する前に読む章

個々の Plugin と Theme は各パッケージの README（`packages/plugins/*/README_ja.md`、`packages/themes/*/README_ja.md`）で説明しています。英語版は [README.md](./README.md) と [英語ドキュメント一覧](./docs/en/README.md) から読めます。

## リポジトリ構成

| パス | 役割 |
| --- | --- |
| [`packages/core`](./packages/core) | コンテンツの契約、Pipeline、Plugin・Theme API、診断、観測機能 |
| [`packages/cli`](./packages/cli) | Node.js 向け CLI とビルド時ツール |
| [`packages/integrations/honox`](./packages/integrations/honox) | HonoX と Vite の統合 |
| [`packages/plugins`](./packages/plugins) | コンテンツ、表示、公開を拡張するプラグイン |
| [`packages/themes`](./packages/themes) | 組み込み CSS テーマとトークン実装 |
| [`apps/web`](./apps/web) | 参照用の HonoX アプリケーション |
| [`docs/en`](./docs/en/README.md) / [`docs/ja`](./docs/ja/README.md) | 英語・日本語ドキュメント |

Core、Plugin、Integration、Theme を変更する前に、[リポジトリ開発ガイド](./docs/ja/development.md) と該当する設計資料を読んでください。Core にフレームワーク固有、または個別パッケージ固有の逆向き依存を追加しないことが重要です。
