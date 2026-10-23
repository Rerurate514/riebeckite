---
date: 2026-10-14
title: 用語集
sidebar:
  label: 用語集
  order: 70
---

# 用語集

Riebeckiteが使う概念をカテゴリ別にまとめた用語集です。各項目は短い定義と用語ノートへのリンクを示し、リンク先のページで詳しく説明します。

## コンテンツと公開

- [Content](./content.ja.md) — Markdownのパースとプラグインの処理を経たコンテンツです。frontmatter、描画済みHTML、解決済みの公開先を持つため、Riebeckiteは生のファイルではなく処理済みの単位を扱います。
- [Content Source](./content-source.ja.md) — パイプラインの他の部分のためにコンテンツを見つけて読む抽象です。標準の実装はファイルシステムかObsidian Vaultを読むため、`ContentManager` がファイルシステムを直接走査することはありません。
- [Content Manager](./content-manager.ja.md) — 走査済みのエントリを完成したマニフェストに変えるコンポーネントです。公開先を解決し、Markdownとプラグインのパイプラインを実行し、コンテンツグラフとクエリ用インデックスを構築します。
- [Content Entry](./content-entry.ja.md) — マニフェスト内でslugにより識別される、解決済みのコンテンツ1件です。permalink、公開先、frontmatter、公開状態、HTML、プラグインが提供したデータを持ちます。
- [Content ID](./content-id.ja.md) — frontmatterに書く安定した識別子で、slugやpermalinkとは独立にノートを指します。ファイル移動やURL変更をまたいで残るため、外部参照のキーに向いています。
- [Content Collection](./content-collection.ja.md) — クエリ用に作られるコンテンツエントリのまとまりで、タグ、フォルダ、日付、frontmatterフィールドなどの種類で定義します。タクソノミーページ、アーカイブ、シリーズ一覧はコレクションから作られます。
- [Content Graph](./content-graph.ja.md) — 解決済みのWikiLinkとMarkdownリンクから作られる、コンテンツエントリ間の関係の網です。どのノートがどれをリンクしているかに答え、バックリンクや近傍のクエリを支えます。
- [Content Index](./content-index.ja.md) — WikiLinkと埋め込みを解決するための、小文字化した名前からノートへの対応表です。複数のノートに一致する名前は載せず、誤った解決を避けて診断として報告します。
- [Content Dependency](./content-dependency.ja.md) — あるエントリの出力が別のエントリに依存することを示す記録です。依存先が変わると依存元を再処理し、派生コンテンツの正しさを保ちます。
- [Manifest](./manifest.ja.md) — すべてのコンテンツを記録するビルド時の台帳で、エントリ、公開ビュー、検索用マップ、コンテンツグラフ、診断を持ちます。ページ生成、実行時のクエリ、増分ビルド、インスペクションはいずれもマニフェストから読みます。
- [Slug](./slug.ja.md) — ノートの内部的な検索キーで、コンテンツインデックス、マニフェスト、コンテンツグラフが使います。公開URLではないため、利用側は解決済みの公開先からpermalinkを読みます。
- [Logical Path](./logical-path.ja.md) — コンテンツルート内でのコンテンツファイルの位置を、ルートからの相対で表したものです。Riebeckiteは論理パスを安定して保ち、公開パスへは別にマッピングします。
- [Permalink](./permalink.ja.md) — ノートの正規の公開URLとして解決された値です。リンク、フィード、サイトマップ、メタデータの唯一の出所で、slugから再計算せず公開先の解決から得ます。
- [Public Path](./public-path.ja.md) — サイトのオリジンを付ける前の、ノートの公開URLのパス部分です。permalinkを解決した後にリンクが使う値です。
- [Public Location](./public-location.ja.md) — ノートをどこに公開するかを表し、内部slugと正規のpermalinkに任意のリダイレクトとメタデータを組み合わせます。マニフェストがエントリごとに公開する解決済みの結果です。
- [Redirect](./redirect.ja.md) — ノートの正規permalinkを指す追加のURLで、通常は古いアドレスを生かすために使います。リダイレクトは解決済みの公開先の一部で、permalinkを置き換えません。
- [Page](./page.ja.md) — サイトがURLで提供する、ルーティング可能なコンテンツです。Markdownかプラグインのページ種別から作られ、インテグレーションがルートを通じて描画します。
- [Page Type](./page-type.ja.md) — プラグインが独自の公開パスと本文を添えて提供するページの種類で、通常のMarkdownではないページに使います。インテグレーションがルートを解決し、アプリケーションが最終HTMLを組み立てます。
- [Publication Boundary](./publication-boundary.ja.md) — どのコンテンツを公開して安全かを決める規則です。Riebeckiteは公開戦略とfrontmatterを適用し、公開可否の判定を散在させず一箇所に集めます。
- [Routable](./routable.ja.md) — URLで提供するエントリを示す公開ビューで、非公開（unlisted）のエントリも含みます。ルーティングと出力生成は、検出可能ビューではなくこのビューを使います。
- [Discoverable](./discoverable.ja.md) — 一覧、フィード、ナビゲーションに載せてよいエントリを示す公開ビューです。ルーティング対象でも非公開（unlisted）のページはURLで提供しつつ、このビューには含めません。
- [Unlisted](./unlisted.ja.md) — URLでは提供しつつ、一覧やフィードには載せない公開状態です。ルーティング対象だが検出可能ではないため、共有リンクや下書きに近いページに向きます。
- [Publish](./publish.ja.md) — コンテンツを公開サイトに含めるかどうかの判定で、公開戦略と `published` や `visibility` などのfrontmatterで制御します。公開されたコンテンツは公開境界のビューに入ります。
- [Draft](./draft.ja.md) — 公開判定によって公開サイトから外されるコンテンツです。処理は続けられますが、公開されるまでルーティング対象と検出可能のビューから除外されます。
- [Visibility](./visibility.ja.md) — 公開したページの見せ方を調整するfrontmatterフィールドです。ページを下書きにせず、一覧に載せるか非公開（unlisted）にするかを分けます。
- [Pipeline](./pipeline.ja.md) — Markdownをmdastへパースし、remarkプラグインで変換し、hastへブリッジし、rehypeプラグインでHTMLを変換する処理パイプラインです。Coreが駆動し、プラグインが拡張します。
- [Content Query](./content-query.ja.md) — 一覧やプラグインデータのために、タグ、フォルダ、日付、frontmatterフィールドでコンテンツエントリを選択・絞り込むことです。タクソノミー、シリーズ、関連記事で使います。
- [WikiLink](./wikilink.ja.md) — ノート同士をつなぎ、コンテンツグラフに関係を作る `[[link]]` 記法です。Riebeckiteはコンテンツインデックスを通じて解決し、解決できないリンクは診断として残ります。
- [Embed](./embed.ja.md) — 別のノートの内容を現在のページに取り込む記法で、ノートの埋め込みやブロックの埋め込みがあります。埋め込みはリンクと同様に解決され、コンテンツ依存関係として追跡されます。
- [Block ID](./block-id.ja.md) — 段落やブロックに付ける短い識別子で、見出しなしでそのブロックを直接リンク・埋め込みできるようにします。
- [Alias](./alias.ja.md) — ノートの別名で、マニフェストに追加の検索キーとして記録します。slugやpermalinkを変えずにWikiLinkを同じノートへ解決しますが、同じ名前を2回使うと曖昧になります。
- [Attachment](./attachment.ja.md) — コンテンツツリー内でコンテンツエントリではなくアセットとして配信されるファイルです。添付ファイルは論理パスを保ったまま公開URLに対応し、何を公開して安全かは公開境界が決めます。
- [Frontmatter](./frontmatter.ja.md) — コンテンツファイル先頭のYAMLブロックで、title、date、tags、visibilityなどの型付きメタデータにパースされます。slugとは独立にノートを識別する安定したidもここに置きます。
- [Taxonomy](./taxonomy.ja.md) — タグ、フォルダ、日付でコンテンツをまとめ、/tags/ のような一覧ページにする仕組みです。タクソノミーページはコンテンツコレクションから作られ、リンクにはpermalinkを使います。
- [Series](./series.ja.md) — 順序を持ってまとまるコンテンツの集合で、frontmatterのseriesフィールドで設定します。シリーズ一覧は同じseries値のコンテンツコレクションから作られます。
- [Folder Page](./folder-page.ja.md) — 単一ファイルではなくフォルダを表すページで、folder-pagesプラグインが扱います。ディレクトリにエントリと公開URLを与えつつ、配下はそれぞれのパスを保ちます。

## プラグインと拡張

- [Plugin](./plugin.ja.md) — Riebeckiteのプラグインは、定められた契約を通じて、コンテンツの解釈、変換、描画、診断、ビルド時の処理、エンドポイント、ブラウザでの動作を拡張します。
- [Plugin cache](./plugin-cache.ja.md) — 各プラグインは `context.cache` を通じて、プラグインごとに再生成可能なビルド時キャッシュを持ちます。保存できるのはプラグインの名前空間に限定されたJSONシリアライズ可能な値だけです。
- [Plugin dependency](./plugin-dependency.ja.md) — プラグインは `requires` でケイパビリティの要求を宣言します。リゾルバは提供側を利用側より前に並べ、満たせないケイパビリティを `PluginDependencyError` と `kind`、`pluginName` の診断として報告します。
- [Capability](./capability.ja.md) — ケイパビリティは、プラグインが提供または要求できる名前付きの機能です。依存解決がプラグインを順序付け、失敗は構造化された診断として現れます。
- [Lifecycle hook](./lifecycle-hook.ja.md) — プラグインのライフサイクルフックは `ContentManager` ごとに1回、`setup`、`buildStart`、コンテンツ処理、`buildEnd`、`dispose`（解決済み順序の逆順）の順で実行されます。名前付きコンテンツフックは解決済みのプラグイン順に参加します。
- [Content hook](./content-hook.ja.md) — コンテンツフックは、設定の解決からコンテンツの読み込み、パース後、処理後、コンテンツグラフ、マニフェスト作成と診断まで、コンテンツ処理の名前付き段階に参加します。
- [Hook context](./hook-context.ja.md) — フックに渡されるプラグインコンテキストには `config`、`contentIndex`、`diagnostics`、`cache`、`output`、`logger`、`tracer`、任意で `contentSource` が含まれます。グローバルなシングルトンよりフレームワークのサービスを優先してください。
- [Renderer](./renderer.ja.md) — レンダラーはコンテンツの対象をプラグイン固有のHTMLに変換します。対象を処理しない場合は `null` を返し、別のレンダラーに処理を渡します。Canvas、Excalidraw、添付ファイルの描画が例です。
- [Endpoint](./endpoint.ja.md) — エンドポイントは、プラグインが使える再利用可能なHTTPの振る舞いを宣言します。インテグレーションがエンドポイントの契約をホストのルーターに接続し、プラグイン自体にフレームワーク固有のルーティングを埋め込みません。
- [Client entry](./client-entry.ja.md) — クライアントエントリは、実行時に本当に必要なブラウザJavaScriptの初期化を宣言します。各エントリはプラグイン名、モジュール指定子、任意のエクスポート名、初期化関数へ渡す公開設定を持ちます。
- [Island](./island.ja.md) — アイランドは、サーバー描画コンテンツの中に埋め込む、クライアントでハイドレーションできるコンポーネントです。ページ全体をハイドレーションせずに対話的なUIを動かせます。アイランドコンポーネントはプラグインではなくサイトアプリケーションが定義します。
- [Plugin UI component](./plugin-component.ja.md) — プラグインはサーバー描画のHono JSXコンポーネント（とデータヘルパー）、CSS、任意のクライアントランタイムを公開します。どこに描画するかはサイトが決めます。
- [Asset](./asset.ja.md) — プラグインのアセットは、`assets` 配列で宣言するスタイルシートなどの静的リソースです。インテグレーションのスタイルシートパイプラインを通じてブラウザに届き、`apps/web` へ直接コピーされることはありません。
- [Head tag](./head-tag.ja.md) — ページのheadタグとメタデータはプラグインシステムを通じて提供されます。インテグレーションとサイトアプリケーションが、タイトル、説明、言語属性を含む最終的な `<head>` を組み立てます。
- [Diagnostics](./diagnostics.ja.md) — 診断はCoreとプラグインが出す構造化された指摘で、何が問題か、どこで起きるか、深刻度、どう直すかを示します。プラグインは `addDiagnostics` で報告し、Coreが `check` と `doctor` コマンド用にまとめます。
- [Diagnostic code](./diagnostic-code.ja.md) — 診断コードは問題の種類を表す安定した識別子です。Coreとプラグインは `duplicate-content-id`、`invalid-content-id`、`content-integrity-*` などのコードを共有し、`check` と `doctor` で一貫して報告します。
- [Diagnostic severity](./diagnostic-severity.ja.md) — 深刻度はerror、warn、infoの3段階で、出力の正しさを保てるかどうかに応じて決めます。errorは正しい出力を妨げ、warnは潜在的な問題を示し、infoは補足情報を提供します。
- [Plugin options](./plugin-options.ja.md) — プラグインオプションはプラグインファクトリに渡す設定値です。副作用のない純粋な `validateOptions` 関数で検証され、解決済みのオプションはプラグインの `options` プロパティから参照できます。

## テーマ

- [Theme](./theme.ja.md) — テーマはRiebeckiteサイトの表示層（色、タイポグラフィ、余白、レイアウト、記事スタイル）を担い、コンテンツの意味やアプリケーション構造は変えません。
- [Design Token](./design-token.ja.md) — 色、余白、フォントなどの名前付きの値で、CSSカスタムプロパティ（`--rb-*`）として公開します。カスケードを通じて、コンポーネントとテーマが安定した語彙を共有できます。
- [Semantic Token](./semantic-token.ja.md) — テーマ固有の値ではなく、意味（本文色、アクセント、境界など）で参照するデザイントークンです。コンポーネントを変えずにテーマを入れ替えられます。
- [Color Mode](./color-mode.ja.md) — light、dark、systemのうち有効な配色です。テーマの `colorMode` オプションと `<html>` の `data-theme` 属性で制御し、JavaScriptで実行時に切り替えられます。
- [Typography](./typography.ja.md) — フォントファミリ、サイズ、行間といったサイトの組版設定です。テーマルートの `data-typography` 属性を通じて、テーマのプリセット（`system`、`serif`、`sans`）で適用します。
- [CSS Contract](./css-contract.ja.md) — コンポーネントが依存してよい安定したCSSフックとカスケード順です。テーマは文書化されたフック（`rb-*` と `rr-*`）を公開し、コンポーネントが特定テーマを前提にせずスタイルを当てられるようにします。
- [Theme Root](./theme-root.ja.md) — テーマルートのセレクタ（`[data-theme-root]` または `<html>`）で、トークンと属性のルールをページ全体に適用します。カラーモードとタイポグラフィの属性をここに付けると、カスケードがすべての要素に届きます。
- [Presentation Layer](./presentation-layer.ja.md) — 表示層はテーマの責務で、色、フォント、余白、レイアウト、記事スタイルを指します。コンテンツの意味、ルート、マニフェスト、プラグインの動作、クライアントスクリプトは含みません。
- [Article Layout](./article-layout.ja.md) — 記事レイアウトのプリセット（`article`、`sidebar`、`full-width`）で、テーマルートの `data-article-layout` 属性を通じて記事領域の見せ方を決めます。ルートやコンポーネントツリーを変えずに、幅とサイドバー構成を制御します。
- [userCss](./user-css.ja.md) — CSSカスケードで最後に読み込まれる追加スタイルシートです。テーマをフォークせずに、サイト作者が外観を最終調整できます。userCssはテーマCSS、プラグインCSS、設定のトークンスタイルに優先します。

## ビルドと運用

- [Build](./build.ja.md) — コンテンツを処理し、公開先を解決し、プラグインを実行し、マニフェストとグラフを構築して出力を書き出すRiebeckiteの処理です。
- [Full Build](./full-build.ja.md) — 以前の増分状態を再利用せず、すべてのコンテンツを最初から処理するビルドです。
- [Incremental Build](./incremental-build.ja.md) — コンテンツ依存関係と保存したビルド状態を使い、変わった部分だけを再生成するビルドモードです。
- [Build State](./build-state.ja.md) — ビルドディレクトリ以下に保存される前回ビルドの記録で、エントリ、フィンガープリント、依存関係、出力の変更を持ちます。
- [Build Dependency](./build-dependency.ja.md) — 処理済みコンテンツと出力ファイルが、ビルド間でどの入力に依存するかを宣言する、Coreとプラグインの間の契約です。
- [Output Dependency](./output-dependency.ja.md) — 出力依存関係は、コンテンツの変更でどの出力ファイルが影響を受け、再生成が必要になるかを決めます。
- [Fingerprint](./fingerprint.ja.md) — コンテンツやファイルの入力を識別するハッシュで、ビルドが変更を検出し、キャッシュやビルド状態の比較を行えるようにします。
- [Cache](./cache.ja.md) — `.riebeckite/` 以下に保存する再利用可能なビルドデータで、高コストな処理の繰り返しを避けます。キャッシュは常に最適化であり、削除してもビルド速度は変われど公開出力は変わりません。
- [Cache Invalidation](./cache-invalidation.ja.md) — 記録した依存関係やフィンガープリントが変わったキャッシュ済みコンテンツを捨てる処理です。無効化されたエントリは再処理され、他のエントリに影響する場合は変化が伝播します。
- [Cache Version](./cache-version.ja.md) — 永続コンテンツキャッシュのスキーマバージョンで、キャッシュスキーマ間の互換性と移行を制御します。
- [Persistent Cache](./persistent-cache.ja.md) — コンテンツごとのキャッシュで、処理済みのMarkdown結果をビルド間で `.riebeckite/cache/content/vN` に保存します。キャッシュに当たればウォームビルドになり、外れれば再処理が必要です。
- [Output Cache](./output-cache.ja.md) — `.riebeckite/ssg-output-cache.json` にあるSSGの出力キャッシュで、描画済みの出力ルートとファイルを増分SSG用に保存します。CI実行間で復元されるためGitHub Actionsでも増分SSGが機能し、検査に通らないキャッシュは破棄されます。
- [Output Inventory](./output-inventory.ja.md) — パスをキーにしたすべての生成物の記録で、公開エントリ、リダイレクト、プラグインページ、生成物から作られます。ビルドはこれを前回の記録と比較し、影響を受ける出力、変わらない出力、削除された出力を求めます。
- [Generated Output](./generated-output.ja.md) — プラグインが生成する出力で、コンテンツ出力とは別です。生成物は所有者と依存関係を持ち、出力依存関係の宣言に従って再生成されます。
- [SSG](./ssg.ja.md) — Riebeckiteの静的サイト生成で、ビルド時にサイトを静的ファイルへ描画します。Coreがコンテンツと公開先を担い、インテグレーションがHonoXとViteにつないでルートを描画し、出力を書き出します。
- [Deterministic Build](./deterministic-build.ja.md) — 同じ入力から同じ出力を生成するビルドです。一貫したフィンガープリント、パイプラインのバージョン管理、設定のスナップショットによって保証されます。
- [Check](./check.ja.md) — ビルド前に、設定、プラグイン、ケイパビリティが正しく構成されているかを検証するCLIコマンドです。
- [Doctor](./doctor.ja.md) — 環境、設定、プラグイン、コンテンツ、ビルド状態を確認し、プロジェクト全体を診断するCLIコマンドです。
- [Inspector](./inspector.ja.md) — 設定、プラグイン、コンテンツ、グラフ、ビルド状態など、解決済みの状態を閲覧する読み取り専用のCLIコマンドです。
- [Profiler](./profiler.ja.md) — コンテンツ処理からプラグインのフック、出力生成まで、どこに時間がかかるかを計測するビルド時の仕組みです。トレーススパンを読み、ビルドの所要時間を報告します。
- [Trace Span](./trace-span.ja.md) — ビルド作業の計測単位です。トレースはビルド作業をスパンに分けて所要時間を記録します。スパン名は安定している必要があります（例：`content.load`、`plugins.run`、`diagnostics.run`、`application.build`）。
- [Logger](./logger.ja.md) — ビルド全体で構造化されたイベントとスパンを出力する可観測性のチャネルです。出力はCLI、プロファイラ、インテグレーションが消費します。
- [Orphan](./orphan.ja.md) — どの公開ページや他のコンテンツからも参照されていないコンテンツやアセットです。孤立は、削除したはずのコンテンツが残っていることや、整理すべきコンテンツがあることを示す場合があります。
- [Unused Asset](./unused-asset.ja.md) — どのコンテンツのfrontmatterからも本文からも参照されていないアセット（画像、ファイルなど）です。未使用アセットは削除して出力サイズを減らせます。

## 設定と配信

- [Preset](./preset.ja.md) — よくある構成をまかなうために設定へ適用する準備済みのオプション群です。プリセットはよく使うプラグイン、テーマ、設定をまとめ、サイトがわずかな設定で採用できるようにします。
- [Config](./config.ja.md) — コンテンツ、公開、プラグイン、テーマ、キャッシュの動作を制御するRiebeckiteの設定オブジェクトです。ビルドが使う前に検証され、解決されます。
- [Root](./root.ja.md) — Riebeckiteが他のパスを解決する基準となるディレクトリで、アプリケーションルートやコンテンツルートがあります。安定したルートを基準に解決することで、パスをマシン間で持ち運べます。
- [Publish Strategy](./publish-strategy.ja.md) — コンテンツをどう公開するかを決める設定値で、すべて公開するか、公開指定のあるものだけを公開するかを選びます。公開境界の既定側を定めます。
- [Localization](./localization.ja.md) — 1つのサイトで複数の言語のコンテンツを配信できるようにするl10nプラグインです。ノートの言語を検出し、翻訳をまとめ、言語スイッチャーを公開します。
- [Translation](./translation.ja.md) — 同じコンテンツの言語違いを結び付ける対応で、frontmatterで設定します。翻訳があることで、リンクとグラフが読み手の言語に従えます。
- [Language Switcher](./language-switcher.ja.md) — 読み手がページの言語版を行き来できる操作要素です。l10nプラグインが公開し、翻訳があるときにサイトが描画します。
- [Locale](./locale.ja.md) — サイトやページが対象とする言語と地域の識別子で、`en` や `ja` などです。既定のロケールは、URLに接頭辞を付けずに配信する言語を決めます。
- [Hreflang](./hreflang.ja.md) — あるページの言語別URLを検索エンジンに伝えるリンクメタデータです。Riebeckiteはノートに存在する翻訳からこれを生成します。
- [Feed](./feed.ja.md) — 公開されたコンテンツを機械可読に並べたもので、RSS、Atom、JSON Feedなどがあります。フィードは検出可能なエントリから作り、各エントリのpermalinkを使います。
- [Deployment](./deployment.ja.md) — ビルド済みのサイトを配信先へ配置する段階です。ビルドがマニフェストと生成物を用意し、インテグレーションがそれをCloudflare Workersなどのプラットフォームにつなぎます。
- [Integration](./integration.ja.md) — Coreのコンテンツとページを、HonoXやViteといった描画・配信スタックにつなぐパッケージです。コンテンツのロジックを持たずにルートを描画し、出力を書き出します。
- [Runtime](./runtime.ja.md) — ビルド後に、サイトがページを配信しクエリに答える段階です。実行環境のコードはコンテンツを再処理せず、マニフェストとページデータを読みます。
- [Site Config](./site-config.ja.md) — サイトを記述するSiteConfigのフィールド（title、description、author、baseUrl、locale、twitterSite、defaultOgImage、feed）で、SEO、フィード、ロケールを駆動します。
- [Navigation](./navigation.ja.md) — サイトのナビゲーション設定と、解決済みマニフェストからヘッダー/フッターのリンクを描画するナビゲーションプラグインです。
- [Route](./route.ja.md) — インテグレーションがページへ解決するURLパスで、ページの公開パスから作られ、フレームワーク（HonoX）が描画します。
- [Sitemap](./sitemap.ja.md) — マニフェストから作られる、検索エンジン向けのサイトマップ/robotsの一覧で、検出可能なURLを並べます。
- [Search](./search.ja.md) — マニフェストから作られるビルド時の検索インデックスとプラグインで、読み手がコンテンツを検索できるようにします。

## オーサリングと統合

- [Obsidian Vault](./obsidian-vault.ja.md) — Riebeckiteは既存のObsidian Vaultをコンテンツディレクトリとして読めるため、Vaultを整理し直さずに選んだノートだけを公開できます。
- [Tag](./tag.ja.md) — タグは共通ラベルでコンテンツエントリをまとめ、`/tags/<slug>` に一覧ページを生成します。RSS/Atom/JSONフィードと関連タグのナビゲーションも提供します。
- [Shortcode](./shortcode.ja.md) — `remark-directive` 記法を使う汎用のショートコード機構で、インライン（`:name[label]{key=value}`）、ブロック（`::name[label]{key=value}`）、コンテナ（`:::name[label]{key=value}` … `:::`）のショートコードに対応し、組み込みのレジストリを持ちます。
- [Callout](./callout.ja.md) — コンテナショートコードの `:::callout[Title]{type=warning}` や `:::note[Title]{type=info}` で作るコールアウトボックスです。`rr-callout rr-callout--{type}` クラスを持つ `div` として描画され、組み込みの既定タイトルを持ちます。
- [Sidenote](./sidenote.ja.md) — 既定では定義を記事末尾に置く脚注スタイルで、`placement: "margin"` を指定するとTufte風のマージンノートになります。
- [Backlink](./backlink.ja.md) — どの公開ノートが現在のノートにリンクしているかを示すバックリンク一覧です。`getPublishedBacklinks()` でコンテンツマニフェストから被リンクを解決し、公開されて検出可能なノートに絞り込み、マニフェスト順に並べます。
- [Site](./site.ja.md) — サイトアプリケーションは、ルート、ドキュメントフレーム、メタデータ、HTMLの安全性を所有します。`@riebeckite/honox` インテグレーションを通じてRiebeckite Coreの振る舞いをHonoXとViteにつなぎ、プラグインの提供物を最終的な公開UIにどう組み立てるかを決めます。
- [UI](./ui.ja.md) — `@riebeckite/honox/ui` が提供するUIプリミティブは、コンポーネントフレームワークではなく小さな構造の契約です。プリミティブには `Article`、`ArticleLayout`、`ArticleContent`、`ArticleBody`、`ArticleMeta`、`ArticleFooter`、`Sidebar` があり、安定したCSSフック（`rb-article`、`rb-article-layout` など）を持ちます。
