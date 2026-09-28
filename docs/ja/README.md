> 日本語ドキュメント · [English](../en/README.md) · [Agent documentation](../agents/README.md)

# Riebeckite Documentation

Riebeckite は、Markdown と Obsidian のノートを Web サイトとして公開するための、拡張可能な HonoX ベースのコンテンツフレームワークです。コンテンツの読み込み、解釈、拡張、表示、ビルドを一つの処理に混在させず、それぞれを交換可能な責務として扱います。

典型的には、コンテンツディレクトリを指定し、Markdown を扱う Plugin と Theme を設定して、HonoX/Vite integration 経由で開発・ビルドします。WikiLink、埋め込み、添付ファイル、コンテンツ間の関係、検索や SEO など、ノートを公開サイトに変換する際に必要となる機能を Plugin として組み合わせられます。

## はじめる前に

|目的|最初に読むドキュメント|
|---|---|
|フレームワークを順を追って使いたい|[利用ガイド](./guide.md)|
|プロジェクトを起動・ビルドしたい|[Getting Started](./getting-started.md)|
|設定項目を確認したい|[Configuration](./configuration.md)|
|既存コードの責務や依存方向を理解したい|[Architecture](./architecture.md)|
|Plugin または Theme を作成・変更したい|[Plugin System](./plugin-system.md) / [Theme System](./theme-system.md)|
|問題を調査したい|[Diagnostics](./diagnostics.md) / [Framework Inspector](./inspector.md)|
|このリポジトリ自体を開発したい|[Repository Development](./development.md)|

## 仕組みの全体像

```text
Markdown / assets
       │
       ▼
ContentSource ── ファイルの走査・読み込み・ソース情報
       │
       ▼
ContentManager ── コンテンツの解釈と処理の調整
       ├── Manifest       ページとメタデータの索引
       ├── Content Graph  WikiLink などから得る関係
       └── Pipeline       Markdown / HTML / metadata の変換
                    │
                    ▼
                 Plugins ── 機能の拡張
                    │
                    ▼
       HonoX / Vite integration ── アプリケーションとの接続
                    │
                    ▼
            Application / Cloudflare Workers

Build tooling
  ├── Incremental Build と Build State
  ├── Plugin-scoped Cache
  ├── Diagnostics と Doctor
  ├── Logger / Tracer / Profiler
  └── CLI: check / doctor / inspect / profile / build / dev
```

### 境界の考え方

- **Core** はコンテンツ処理と調整を担います。HonoX、Vite、特定の Plugin、Theme の実装詳細には依存しません。
- **Plugin** は Markdown、HTML、metadata、assets、クライアント動作、endpoint、SEO を拡張します。依存関係や実行順序は capability で宣言できます。
- **Integration** は Core を外部フレームワークやバンドラへ接続します。HonoX/Vite 固有の処理はここに置きます。
- **Theme** は表示上の設定群です。トークン、CSS、安定したフックを通じて見た目を提供し、コンテンツの解釈やビルド状態を所有しません。
- **Application** はルート、island、サイト固有コンポーネントなど、個別サイトだけに必要な実装を置く場所です。
- **CLI** は Node.js のビルド時ツールです。Cloudflare Workers のリクエスト処理から build state やファイルシステム cache を参照しません。

## ドキュメント一覧

### 導入と設定

|ドキュメント|内容|
|---|---|
|[利用ガイド](./guide.md)|インストールと設定から、コンテンツ、検証、ビルド、デプロイまでの手順|
|[Getting Started](./getting-started.md)|必要な環境、インストール、開発サーバー、通常・フルビルド、最小設定例|
|[Configuration](./configuration.md)|`riebeckite.config.ts`、Application Root、site、content、theme、plugins、検証と secret の扱い|
|[CLI](./cli.md)|`check`、`doctor`、`inspect`、`profile`、`build`、`dev` の用途、終了動作、パッケージング|

### コンテンツと拡張

|ドキュメント|内容|
|---|---|
|[Content System](./content-system.md)|`ContentSource`、logical path、`ContentManager`、public location（`ContentPublicLocation`）、Manifest、Content Graph、添付ファイル、公開判定、差分メタデータ|
|[Plugin System](./plugin-system.md)|Plugin、lifecycle、capability と依存関係、options validation、pipeline、renderer、assets、cache、observability|
|[Theme System](./theme-system.md)|Theme contract、color mode、タイポグラフィ、design token、CSS cascade、Plugin との境界、テーマパッケージ構成|
|[HonoX Integration](./honox-integration.md)|HonoX/Vite への接続、Application Root との役割分担、Cloudflare Workers と SSG の境界|

### ビルド・運用・調査

|ドキュメント|内容|
|---|---|
|[Build System](./build-system.md)|Incremental Build、Build State、フルビルド、Plugin Cache との違い、runtime との境界|
|[Observability](./observability.md)|Logger、Tracer、TraceSink、Profiler と計測の扱い|
|[Diagnostics](./diagnostics.md)|`check` と `doctor`、structured diagnostics、Inspector との使い分け|
|[Framework Inspector](./inspector.md)|設定、Plugin、コンテンツ、Graph、Build 状態を読み取り専用で確認する方法|

### 設計と開発者向け参照

|ドキュメント|内容|
|---|---|
|[Architecture](./architecture.md)|Core / Plugin / Integration / Theme / App の責務、依存方向、build-time と runtime の分離|
|[Framework Reference](./framework-reference.md)|Config、Content、Pipeline、Plugin、Theme、Diagnostics、Observability の主要公開 API|
|[Repository Development](./development.md)|monorepo 構成、コードの配置、品質確認、CLI smoke check、ESM、生成済み状態|

## 代表的な利用機能

Riebeckite では必要な Plugin を選んでサイトを構成します。リポジトリには次のような種類の機能があります。

- **Markdown とノート**: Obsidian Markdown、WikiLink、embed、attachment、Mermaid、Excalidraw、media。
- **記事体験**: syntax highlighting、コードブロックの強化、code tabs、diff、TOC、backlinks、recent posts、lightbox、auto card link。
- **ナビゲーション**: search、local graph、garden explorer、コンテンツ間のリンクグラフ。
- **公開と発見性**: SEO、RSS / Atom / JSON Feed、sitemap、`robots.txt`、Plugin による endpoint。
- **開発者体験**: 設定・Plugin options の検証、incremental build、Plugin Cache、diagnostics、doctor、structured logging、tracing、profiling、inspector。
- **表示**: 交換可能な Theme と、Theme/Plugin 間で共有する CSS contract。

利用可能な機能、設定値、実装上の制約は各 Plugin と Theme の package、および上記のシステム別ドキュメントで確認してください。

## 日常的なコマンド

プロジェクトの root で実行します。

```bash
pnpm exec riebeckite check    # 設定と Plugin 解決を確認
pnpm exec riebeckite doctor   # read-only の健全性診断
pnpm exec riebeckite inspect  # フレームワークが解釈した状態を表示
pnpm exec riebeckite dev      # 開発サーバーを起動
pnpm exec riebeckite build    # incremental build
pnpm exec riebeckite build --full
pnpm exec riebeckite profile  # trace ベースの性能レポート
```

`check`、`doctor`、`inspect`、`profile` は目的が異なります。状態を変更するビルド処理で診断を代用せず、詳細は [CLI](./cli.md) と [Diagnostics](./diagnostics.md) を参照してください。

## 読み進め方

初めて利用する場合は、[Getting Started](./getting-started.md) → [Configuration](./configuration.md) → [Content System](./content-system.md) の順が基本です。Plugin を追加する前に [Plugin System](./plugin-system.md)、見た目を変更する前に [Theme System](./theme-system.md) を読んでください。問題の切り分けには `check`、`doctor`、`inspect` を順に使います。

自動化ツールやコーディングエージェント向けには、短く規則中心の [Agent documentation](../agents/README.md) を用意しています。
