# Riebeckite

> [English](./README.md)

Riebeckite は、Markdown と Obsidian 形式のノートを Web サイトとして公開するための拡張可能なコンテンツフレームワークです。コンテンツの読み込み、解釈、拡張、表示、ビルドを分けて扱うため、サイト固有の要件が増えても Markdown 処理を一つの巨大な実装にまとめずに済みます。

このリポジトリは pnpm のモノレポです。参照アプリケーションには HonoX、Vite、Cloudflare Workers を使います。一方、Core はそれらのフレームワーク固有の処理から独立したコンテンツ処理を持ちます。

## Riebeckite でできること

- Markdown とアセットを走査し、コンテンツの一覧と関係グラフを作る
- Markdown・HTML の変換、アセット、ブラウザ側の動作、エンドポイント、SEO、診断をプラグインで追加する
- 意味のある CSS トークン、安定したフック、配色モード、文字組みをテーマとして差し替える
- HonoX/Vite と接続し、開発、静的ビルド、デプロイ向けのアプリケーションを構成する
- 差分ビルド、プラグインキャッシュ、診断、Doctor、Inspector、ログ、トレース、プロファイルを使う

Obsidian Markdown、WikiLink と埋め込み、添付ファイル、Mermaid、Excalidraw、メディア、コードブロック、タブ、目次、被リンク、検索、ローカルグラフ、ノート探索、SEO、フィード、サイトマップなどのプラグインを用意しています。

## 処理の流れ

```text
Markdown とアセット
        │
        ▼
ContentSource ── ファイルを走査・読み込み、ソース情報を作る
        │
        ▼
ContentManager ── コンテンツを解釈し、処理を調整する
        ├── Manifest
        ├── Content Graph
        └── Pipeline
                     │
                     ▼
                  Plugins
                     │
                     ▼
        HonoX / Vite integration
                     │
                     ▼
       Application / Cloudflare Workers
```

Core は移植可能な処理の調整を担い、Plugin は再利用できる機能を追加します。Integration は Core を外部フレームワークへ接続し、Theme は表示を担当します。ルートとサイト固有のコンポーネントは Application に置きます。依存関係の規則は [アーキテクチャ](./docs/ja/architecture.md) を参照してください。

## 最初に実行するコマンド

リポジトリのルートで依存関係を入れ、参照アプリケーションの設定を確認します。

```bash
pnpm install
pnpm exec riebeckite check
pnpm exec riebeckite doctor
```

同梱のアプリケーションを開発・ビルドする場合は、次を実行します。

```bash
pnpm dev
pnpm build
```

CLI はアプリケーションディレクトリで実行します。主なコマンドは次のとおりです。

```bash
pnpm exec riebeckite check          # 設定とプラグインの解決を検証する
pnpm exec riebeckite doctor         # 状態を変更せずに健全性を診断する
pnpm exec riebeckite inspect        # フレームワークが解釈した状態を確認する
pnpm exec riebeckite dev            # 開発サーバーを起動する
pnpm exec riebeckite build          # 差分ビルドを実行する
pnpm exec riebeckite build --full   # 差分の再利用なしでビルドする
pnpm exec riebeckite profile        # トレースに基づく性能レポートを作る
```

`check`、`doctor`、`inspect` は目的が異なります。設定の検証、健全性診断、状態の確認を混同せず、自動化する前に [CLI リファレンス](./docs/ja/cli.md) を確認してください。

## リポジトリ構成

| パス | 役割 |
| --- | --- |
| [`packages/core`](./packages/core) | コンテンツ、Pipeline、Plugin・Theme API、診断、観測機能 |
| [`packages/cli`](./packages/cli) | Node.js 向け CLI とビルド時ツール |
| [`packages/integrations/honox`](./packages/integrations/honox) | HonoX と Vite の統合 |
| [`packages/plugins`](./packages/plugins) | コンテンツ、表示、公開を拡張するプラグイン |
| [`packages/themes`](./packages/themes) | 組み込み CSS テーマとトークン実装 |
| [`apps/web`](./apps/web) | 参照用の HonoX アプリケーション |
| [`docs/en`](./docs/en/README.md) | 英語ドキュメント |
| [`docs/ja`](./docs/ja/README.md) | 日本語ドキュメント |

## ドキュメントの読み方

[日本語ドキュメント一覧](./docs/ja/README.md) から必要な章を開けます。初めて扱う場合は、次の順で読むと全体をつかみやすくなります。

1. [Getting Started](./docs/ja/getting-started.md): ワークスペースの準備と最小設定
2. [Configuration](./docs/ja/configuration.md): `riebeckite.config.ts` の設定項目
3. [Content System](./docs/ja/content-system.md): ソース、manifest、グラフの扱い
4. [Plugin System](./docs/ja/plugin-system.md) または [Theme System](./docs/ja/theme-system.md): 機能や見た目を拡張する前に読む章

個別の Plugin と Theme の説明は、それぞれのパッケージにある README を参照してください。英語版は [README.md](./README.md) と [英語ドキュメント一覧](./docs/en/README.md) から読めます。

## 開発時のコマンド

ルートに定義されているスクリプトは次のとおりです。

```bash
pnpm lint       # Biome で lint を実行
pnpm format     # Biome で整形
pnpm check      # Biome の check と修正を実行
pnpm build      # CLI と参照 Web アプリケーションをビルド
```

Core、Plugin、Integration、Theme を変更する前に、[リポジトリ開発ガイド](./docs/ja/development.md) と該当する設計資料を読んでください。Core にフレームワーク固有、または個別パッケージ固有の逆向き依存を追加しないことが重要です。
