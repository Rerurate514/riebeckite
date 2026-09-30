> 日本語ドキュメント · [English](../en/README.md) · [Agent documentation](../agents/README.md)

<p align="center">
  <img src="../../assets/logos/riebeckite-logo-horizontal.png" alt="Riebeckite" width="360" />
</p>

# Riebeckite Documentation

Riebeckite は、Markdown と Obsidian のノートを Web サイトとして公開するための、拡張可能な HonoX ベースのコンテンツフレームワークです。コンテンツの読み込み、解釈、拡張、表示、ビルドを一つの処理に混在させず、それぞれを交換可能な責務として扱います。

典型的には、コンテンツディレクトリを指定し、Markdown を扱う Plugin と Theme を設定して、HonoX/Vite integration 経由で開発・ビルドします。WikiLink、埋め込み、添付ファイル、コンテンツ間の関係、検索や SEO など、ノートを公開サイトに変換する際に必要となる機能を Plugin として組み合わせられます。

## はじめる前に

|目的|最初に読むドキュメント|
|---|---|
|はじめてで、環境準備から公開まで通して知りたい|[セットアップガイド](./setup.md)|
|フレームワークを順を追って使いたい|[利用ガイド](./guide.md)|
|プロジェクトを起動・ビルドしたい|[Getting Started](./getting-started.md)|
|設定項目を確認したい|[Configuration](./configuration.md)|
|既存コードの責務や依存方向を理解したい|[Architecture](./architecture.md)|
|Plugin または Theme を作成・変更したい|[Plugin System](./plugin-system.md) / [Theme System](./theme-system.md)|
|テーマやプラグインをはじめて作る|[はじめてのテーマ作成](./theme-tutorial.md) / [はじめてのプラグイン作成](./plugin-tutorial.md)|
|テーマやプラグインを細部まで作り込む|[テーマ作成の詳細](./theme-in-depth.md) / [プラグイン作成の詳細](./plugin-in-depth.md)|
|記事とサイトを別々の場所で管理したい|[記事とサイトのリポジトリ分離](./content-and-site-repos.md)（詳細編: [分離運用の詳細](./content-and-site-repos-in-depth.md)）|
|問題を調査したい|[Diagnostics](./diagnostics.md) / [Framework Inspector](./inspector.md)|
|このリポジトリ自体を開発したい|[Repository Development](./development.md)|
|テストを書く・実行する|[Testing](./testing.md)|

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
|[セットアップガイド](./setup.md)|はじめての人向けに、リポジトリの環境構築、新しいサイトの作成、Cloudflare Workers への公開を順番に説明|
|[利用ガイド](./guide.md)|インストールと設定から、コンテンツ、検証、ビルド、デプロイまでの手順|
|[Getting Started](./getting-started.md)|必要な環境、最小設定例、インストール、コンテンツの確認、開発サーバー、通常・フルビルド|
|[記事とサイトのリポジトリ分離](./content-and-site-repos.md)|記事（Obsidian Vault など）とサイトを別リポジトリや別フォルダで管理し、`content.directory` で外部の Vault を参照する方法|
|[リポジトリ分離の詳細編](./content-and-site-repos-in-depth.md)|root の解決規則、パターン比較、private Vault の CI 取得（追加 checkout / submodule）、assets のコピー、認証とトラブルシューティング|
|[Configuration](./configuration.md)|`riebeckite.config.ts`、Application Root、site、content、theme、plugins、検証と secret の扱い|
|[CLI](./cli.md)|`check`、`doctor`、`inspect`、`profile`、`build`、`dev` の用途、終了動作、パッケージング|

### コンテンツと拡張

|ドキュメント|内容|
|---|---|
|[Content System](./content-system.md)|`ContentSource`、logical path、`ContentManager`、public location（`ContentPublicLocation`）、Manifest、Content Graph、添付ファイル、公開判定、差分メタデータ|
|[Plugin System](./plugin-system.md)|Plugin、lifecycle、capability と依存関係、options validation、pipeline、renderer、assets、cache、observability|
|[Theme System](./theme-system.md)|Theme contract、color mode、タイポグラフィ、design token、CSS cascade、Plugin との境界、テーマパッケージ構成|
|[はじめてのテーマ作成](./theme-tutorial.md)|`defineTheme` を使った最小テーマ、セマンティック token と stable hook を使う CSS、配布用パッケージ化、検証手順|
|[はじめてのプラグイン作成](./plugin-tutorial.md)|`definePlugin` を使った最小プラグイン、assets と pipeline、配布用パッケージ化、代表的な拡張ポイント、検証手順|
|[テーマ作成の詳細](./theme-in-depth.md)|`defineTheme` の contract、Common config、design token 一覧、color mode、stable hook、CSS cascade、配布用パッケージの詳細|
|[プラグイン作成の詳細](./plugin-in-depth.md)|拡張ポイント一覧、capability、content pipeline、renderer、client entries、Plugin Cache、配布用パッケージの詳細|
|[HonoX Integration](./honox-integration.md)|HonoX/Vite への接続、Application Root との役割分担、Cloudflare Workers と SSG の境界|
|[Analytics](./analytics.md)|ブラウザのページビュー計測（`@riebeckite/plugin-analytics`）と、独立デプロイの Cloudflare Worker コレクタ（`@riebeckite/analytics-cloudflare`）|

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
|[Testing](./testing.md)|unit test の配置、実行と更新、golden file、パッケージのテスト用メタデータ|

## 代表的な利用機能

Riebeckite では必要な Plugin を選んでサイトを構成します。リポジトリには次のような種類の機能があります。

- **Markdown とノート**: Obsidian Markdown、WikiLink、embed、attachment、Mermaid、Excalidraw、media。
- **記事体験**: syntax highlighting、コードブロックの強化、code tabs、diff、TOC、backlinks、recent posts、lightbox、auto card link。
- **ナビゲーション**: search、local graph、garden explorer、コンテンツ間のリンクグラフ。
- **公開と発見性**: SEO、RSS / Atom / JSON Feed、sitemap、`robots.txt`、Plugin による endpoint。
- **アクセス解析**: 安定 content ID をキーにしたストレージ非依存のページビュー計測と、D1/KV を備えた独立 Cloudflare Worker コレクタ。
- **開発者体験**: 設定・Plugin options の検証、incremental build、Plugin Cache、diagnostics、doctor、structured logging、tracing、profiling、inspector。
- **表示**: 交換可能な Theme と、Theme/Plugin 間で共有する CSS contract。実行時のカラーモード切り替え（`@riebeckite/plugin-color-mode`）も含みます。

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

初めて利用する場合は、[Getting Started](./getting-started.md) → [Configuration](./configuration.md) → [Content System](./content-system.md) の順が基本です。Plugin を追加する前に [Plugin System](./plugin-system.md)、見た目を変更する前に [Theme System](./theme-system.md) を読んでください。テーマやプラグインを初めて作る場合は [はじめてのテーマ作成](./theme-tutorial.md) と [はじめてのプラグイン作成](./plugin-tutorial.md) が、記事とサイトを別々に管理したい場合は [記事とサイトのリポジトリ分離](./content-and-site-repos.md) が参考になります。各入門を読み終えて細部を作り込むときは、対応する詳細編（[テーマ作成の詳細](./theme-in-depth.md)・[プラグイン作成の詳細](./plugin-in-depth.md)・[リポジトリ分離の詳細編](./content-and-site-repos-in-depth.md)）を参照してください。問題の切り分けには `check`、`doctor`、`inspect` を順に使います。

自動化ツールやコーディングエージェント向けには、短く規則中心の [Agent documentation](../agents/README.md) を用意しています（英語のみの提供です）。
