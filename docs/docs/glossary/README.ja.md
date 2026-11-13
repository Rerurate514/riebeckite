---
date: 2026-10-14
title: 用語集
sidebar:
  label: 用語集
  order: 70
---

# 用語集

Riebeckite が使う概念をカテゴリ別にまとめた用語集です。各項目は短い定義と用語ノートへのリンクを示し、詳しい説明はリンク先にあります。

## コンテンツと公開

- [Content](./content.ja.md)：Markdown とプラグインの処理を経た、公開先を持つコンテンツ。
- [Content Source](./content-source.ja.md)：コンテンツを見つけて読む抽象。既定ではファイルシステムか Obsidian Vault を読む。
- [Content Manager](./content-manager.ja.md)：エントリをマニフェストにまとめ、公開先とグラフを解決する。
- [Content Entry](./content-entry.ja.md)：slug で識別される、解決済みのコンテンツ 1 件。
- [Content ID](./content-id.ja.md)：slug や permalink と独立にノートを指す、frontmatter の安定 ID。
- [Content Collection](./content-collection.ja.md)：タグ、フォルダ、日付などでまとめた、クエリ用のエントリ集合。
- [Content Graph](./content-graph.ja.md)：解決済みリンクから作る、エントリ間の関係の網。
- [Content Index](./content-index.ja.md)：WikiLink を解決するための、名前からノートへの対応表。
- [Content Dependency](./content-dependency.ja.md)：あるエントリの出力が別のエントリに依存するという記録。
- [Manifest](./manifest.ja.md)：全コンテンツのビルド時の台帳。エントリ、公開ビュー、グラフ、診断を持つ。
- [Slug](./slug.ja.md)：ノートの内部キー。公開 URL ではない。
- [Logical Path](./logical-path.ja.md)：コンテンツルートからの相対パス。公開パスとは別に保つ。
- [Permalink](./permalink.ja.md)：ノートの正規公開 URL。リンクやフィードの唯一の出所。
- [Public Path](./public-path.ja.md)：permalink のパス部分。サイトのオリジンは含まない。
- [Public Location](./public-location.ja.md)：slug、permalink、リダイレクト、メタデータをまとめた公開先。
- [Redirect](./redirect.ja.md)：正規 permalink を指す追加 URL。古いアドレスを生かす。
- [Page](./page.ja.md)：URL で提供する、ルーティング可能なコンテンツ。
- [Page Type](./page-type.ja.md)：プラグインが公開パスと本文を添えて提供するページの種類。
- [Publication Boundary](./publication-boundary.ja.md)：何を公開して安全かを決める規則。
- [Routable](./routable.ja.md)：URL で提供するエントリの公開ビュー。unlisted も含む。
- [Discoverable](./discoverable.ja.md)：一覧やフィードに載せてよいエントリの公開ビュー。
- [Unlisted](./unlisted.ja.md)：URL では提供するが、一覧やフィードには載せない公開状態。
- [Publish](./publish.ja.md)：公開サイトに含めるかの判定。公開戦略と frontmatter で決める。
- [Draft](./draft.ja.md)：公開判定でサイトから外したコンテンツ。処理は続く。
- [Visibility](./visibility.ja.md)：公開ページの見せ方。一覧に載せるか unlisted にするか。
- [Pipeline](./pipeline.ja.md)：mdast、remark、hast、rehype を通す変換パイプライン。
- [Content Query](./content-query.ja.md)：タグや日付などでエントリを選ぶ仕組み。
- [WikiLink](./wikilink.ja.md)：ノートをつなぐ `[[link]]` 記法。解決できないリンクは診断に残る。
- [Embed](./embed.ja.md)：別のノートの内容を現在のページに取り込む記法。
- [Block ID](./block-id.ja.md)：ブロックを直接リンク・埋め込みするための短い識別子。
- [Alias](./alias.ja.md)：ノートの別名。WikiLink の解決に使う。
- [Attachment](./attachment.ja.md)：アセットとして配信する、コンテンツ以外のファイル。
- [Frontmatter](./frontmatter.ja.md)：ファイル先頭の YAML。型付きメタデータと安定 ID を置く。
- [Taxonomy](./taxonomy.ja.md)：タグやフォルダで一覧ページを作る仕組み。
- [Series](./series.ja.md)：順序を持つコンテンツの集合。frontmatter の `series` で設定する。
- [Folder Page](./folder-page.ja.md)：フォルダを表すページ。配下のパスはそれぞれ保つ。

## プラグインと拡張

- [Plugin](./plugin.ja.md)：コンテンツ処理や描画、診断などを拡張するパッケージ。
- [Plugin cache](./plugin-cache.ja.md)：プラグインごとのビルド時キャッシュ。保存できるのは JSON の値だけ。
- [Plugin dependency](./plugin-dependency.ja.md)：`requires` で宣言する、プラグインのケイパビリティ要求。
- [Capability](./capability.ja.md)：プラグインが提供または要求できる、名前付きの機能。
- [Lifecycle hook](./lifecycle-hook.ja.md)：`setup` から `dispose` まで、決まった順に実行されるフック。
- [Content hook](./content-hook.ja.md)：コンテンツ処理の各段階に参加するフック。
- [Hook context](./hook-context.ja.md)：フックに渡る `config`、`cache`、`logger` などのサービス。
- [Renderer](./renderer.ja.md)：コンテンツをプラグイン固有の HTML に変換する。
- [Endpoint](./endpoint.ja.md)：プラグインが宣言する、再利用可能な HTTP の振る舞い。
- [Client entry](./client-entry.ja.md)：ブラウザで実行する初期化コードの宣言。
- [Island](./island.ja.md)：サーバー描画の中に置く、ハイドレーション可能なコンポーネント。
- [Plugin site component](./plugin-component.ja.md)：プラグインが公開する `PluginSiteComponent<Props>` の Hono JSX コンポーネントと CSS。
- [Asset](./asset.ja.md)：`assets` 配列で宣言する、スタイルシートなどの静的リソース。
- [Head tag](./head-tag.ja.md)：ページの `<head>` とメタデータ。インテグレーションが組み立てる。
- [Diagnostics](./diagnostics.ja.md)：Core とプラグインが出す構造化された指摘。`doctor` と Development Inspector が集約する。
- [Diagnostic code](./diagnostic-code.ja.md)：問題の種類を表す安定した識別子。
- [Diagnostic severity](./diagnostic-severity.ja.md)：error、warning、info の 3 段階の深刻度。
- [Plugin options](./plugin-options.ja.md)：プラグインファクトリに渡す設定値。`validateOptions` で検証する。

## テーマ

- [Theme](./theme.ja.md)：色、タイポグラフィ、余白、レイアウトを担う表示層。
- [Design Token](./design-token.ja.md)：色や余白などの名前付きの値。CSS 変数として公開する。
- [Semantic Token](./semantic-token.ja.md)：意味で参照するデザイントークン。テーマを差し替えられる。
- [Color Mode](./color-mode.ja.md)：light、dark、system のうち有効な配色。
- [Typography](./typography.ja.md)：フォント、サイズ、行間の組版設定。
- [CSS Contract](./css-contract.ja.md)：コンポーネントが依存してよい CSS フックとカスケード順。
- [Theme Root](./theme-root.ja.md)：トークンと属性をページ全体に適用するセレクタ。
- [Presentation Layer](./presentation-layer.ja.md)：テーマが担う表示の責務。
- [Article Layout](./article-layout.ja.md)：`article`、`sidebar`、`full-width` の記事レイアウト。
- [stylesheets](./user-css.ja.md)：最後に読み込む追加 CSS。サイト作者の最終調整に使う。

## ビルドと運用

- [Build](./build.ja.md)：コンテンツ処理から出力までを行う一連の処理。
- [Full Build](./full-build.ja.md)：増分状態を使わず、すべてを最初から処理するビルド。
- [Incremental Build](./incremental-build.ja.md)：変わった部分だけを再生成するビルド。
- [Build State](./build-state.ja.md)：前回ビルドの記録。エントリ、フィンガープリント、依存関係を持つ。
- [Build Dependency](./build-dependency.ja.md)：ビルド間でどの入力に依存するかを宣言する取り決め。
- [Output Dependency](./output-dependency.ja.md)：コンテンツの変更で再生成が必要な出力を決める。
- [Fingerprint](./fingerprint.ja.md)：入力やファイルを識別するハッシュ。
- [Cache](./cache.ja.md)：`.riebeckite/` に保存する、再利用可能なビルドデータ。
- [Cache Invalidation](./cache-invalidation.ja.md)：依存関係が変わったキャッシュを捨てる処理。
- [Cache Version](./cache-version.ja.md)：永続キャッシュのスキーマバージョン。
- [Persistent Cache](./persistent-cache.ja.md)：コンテンツごとの処理結果をビルド間で保存するキャッシュ。
- [Output Cache](./output-cache.ja.md)：描画済みの出力を増分 SSG 用に保存するキャッシュ。
- [Output Inventory](./output-inventory.ja.md)：生成物をパスで記録した一覧。
- [Generated Output](./generated-output.ja.md)：プラグインが生成する、コンテンツ以外の出力。
- [SSG](./ssg.ja.md)：ビルド時に静的ファイルを書き出す仕組み。
- [Deterministic Build](./deterministic-build.ja.md)：同じ入力から同じ出力を得るビルド。
- [Check](./check.ja.md)：設定とプラグインの構成を検証する CLI コマンド。
- [Doctor](./doctor.ja.md)：環境からビルド状態まで診断する CLI コマンド。
- [Inspector](./inspector.ja.md)：解決済みの状態を閲覧する CLI コマンド。
- [Profiler](./profiler.ja.md)：ビルドのどこに時間がかかるかを計測する。
- [Trace Span](./trace-span.ja.md)：ビルド作業の計測単位。
- [Logger](./logger.ja.md)：構造化されたイベントとスパンを出力するチャネル。
- [Orphan](./orphan.ja.md)：どこからも参照されていないコンテンツやアセット。
- [Unused Asset](./unused-asset.ja.md)：どのコンテンツからも参照されていないアセット。

## 設定と配信

- [Preset](./preset.ja.md)：よくある構成をまとめた、設定の準備済みオプション群。
- [Config](./config.ja.md)：コンテンツ、公開、プラグイン、テーマを制御する設定。
- [Root](./root.ja.md)：パス解決の基準になるディレクトリ。
- [Publish Strategy](./publish-strategy.ja.md)：すべて公開するか、指定したものだけ公開するかの設定。
- [Localization](./localization.ja.md)：複数言語のコンテンツを配信する l10n プラグイン。
- [Translation](./translation.ja.md)：同じコンテンツの言語違いを結び付ける対応。
- [Language Switcher](./language-switcher.ja.md)：ページの言語版を切り替える操作要素。
- [Locale](./locale.ja.md)：言語と地域の識別子。`en` や `ja`。
- [Hreflang](./hreflang.ja.md)：言語別 URL を検索エンジンに伝えるメタデータ。
- [Feed](./feed.ja.md)：公開コンテンツを並べた RSS、Atom、JSON Feed。
- [Deployment](./deployment.ja.md)：ビルド済みのサイトを配信先へ置く段階。
- [Integration](./integration.ja.md)：Core を HonoX や Vite につなぐパッケージ。
- [Runtime](./runtime.ja.md)：ビルド後にページを配信し、クエリに答える段階。
- [Site Config](./site-config.ja.md)：サイトの基本情報。SEO、フィード、ロケールを駆動する。
- [Navigation](./navigation.ja.md)：ヘッダーとフッターのリンクを描画する仕組み。
- [Route](./route.ja.md)：ページへ解決する URL パス。
- [Sitemap](./sitemap.ja.md)：検索エンジン向けの URL 一覧。
- [Search](./search.ja.md)：ビルド時に作る検索インデックス。

## オーサリングと統合

- [Obsidian Vault](./obsidian-vault.ja.md)：既存の Vault を、そのままコンテンツディレクトリとして読める。
- [Tag](./tag.ja.md)：コンテンツをまとめる共通ラベル。`/tags/<slug>` に一覧を作る。
- [Shortcode](./shortcode.ja.md)：`remark-directive` 記法を使うショートコード機構。
- [Callout](./callout.ja.md)：`:::callout` などで作るコールアウトボックス。
- [Sidenote](./sidenote.ja.md)：記事末尾の脚注、または Tufte 風のマージンノート。
- [Backlink](./backlink.ja.md)：現在のノートにリンクしている公開ノートの一覧。
- [Site](./site.ja.md)：ルート、フレーム、メタデータを所有するサイトアプリケーション。
- [UI](./ui.ja.md)：`@riebeckite/honox/ui` の UI プリミティブ。小さな構造の契約。
