---
title: 用語集
sidebar:
  label: 用語集
  order: 70
---

# 用語集

Riebeckiteが使う概念をカテゴリ別にまとめた用語集です。各項目は短い定義と用語ノートへのリンクで、詳しい説明は既存のドキュメントにあります。

## コンテンツと公開

- [Content](./content.ja.md) Markdownの解析とPluginの処理を経たコンテンツです。frontmatter、描画済みのHTML、解決済みの公開位置を持ちます。Riebeckiteは生のファイルではなく、処理を終えたこの単位を扱います。
- [Content Source](./content-source.ja.md)パイプラインの他の部分にコンテンツを供給する読み取りの抽象です。標準の実装はファイルシステムやObsidian vaultを読み取るため、Content Managerがファイルシステムを直接走査することはありません。
- [Content Manager](./content-manager.ja.md)：走査済みのentryを完成したmanifestに変えるコンポーネントです。公開位置を解決し、MarkdownとPluginのパイプラインを実行してから、content graphと検索用のindexを作ります。
- [Content Entry](./content-entry.ja.md)：manifestの中でslugにより識別される、解決済みのコンテンツ1件です。permalink、公開位置、frontmatter、公開状態、HTML、Pluginが付与したデータを持ちます。
- [Content ID](./content-id.ja.md)：frontmatterに書く安定した識別子で、slugやpermalinkとは独立にノートを指します。ファイルの移動やURLの変更をまたいで残るため、外部から参照するときのキーになります。
- [Content Collection](./content-collection.ja.md)：query用に作られるコンテンツentryのまとまりです。tag、folder、date、frontmatterのfieldなどのkindで定義し、Taxonomyページやarchive、seriesの一覧はcollectionから作られます。
- [Content Graph](./content-graph.ja.md)：解決済みのWikiLinkとMarkdownリンクから作られる、コンテンツentry間の関係の網です。どのノートがどれを参照しているかを答え、backlinkや近傍の問い合わせに使います。
- [Content Index](./content-index.ja.md)：WikiLinkやembedを解決するための、小文字化した名前からノートへの対応表です。複数のノートに一致する名前は載せず、誤った解決を避けてdiagnosticとして報告します。
- [Content Dependency](./content-dependency.ja.md)：あるentryの出力が別のentryに依存することを示す記録です。依存先が変わると、依存元を再処理して派生した内容の正しさを保ちます。
- [Manifest](./manifest.ja.md)：すべてのコンテンツを記録するビルド時の一覧です。entry、公開ビュー、検索用の対応表、content graph、diagnosticを持ちます。ページ生成、実行時のquery、incremental build、inspectionはいずれもmanifestを読みます。
- [Slug](./slug.ja.md)：ノートの内部的な検索キーで、content index、manifest、content graphが使います。公開URLではないため、公開側では解決済みの公開位置からpermalinkを読みます。
- [Logical Path](./logical-path.ja.md)：content rootを基準に表した、コンテンツファイルの位置です。Riebeckiteはlogical pathを安定して保ち、公開パスへは別に対応させます。
- [Permalink](./permalink.ja.md)：ノートの公開URLとして解決済みの正準値です。リンク、feed、sitemap、メタデータの唯一の出所であり、slugから再計算せず、公開位置の解決から得ます。
- [Public Path](./public-path.ja.md)：サイトのoriginを付ける前の、公開URLのパス部分です。permalinkを解決した後にリンクが使う値です。
- [Public Location](./public-location.ja.md)：ノートをどこに公開するかを表し、内部のslugと正準のpermalinkに、任意のredirectとメタデータを組み合わせます。manifestがentryごとに公開する解決済みの結果です。
- [Redirect](./redirect.ja.md)：ノートの正準permalinkを指す追加のURLで、多くの場合は古いアドレスを生かすために使います。redirectは解決済みの公開位置の一部で、permalinkを置き換えません。
- [Page](./page.ja.md)：サイトがURLで提供する、ルーティング可能なコンテンツです。Markdownから作られる場合と、Pluginのpage typeから作られる場合があり、Integrationがrouteを通して描画します。
- [Page Type](./page-type.ja.md)：Pluginが独自の公開パスと本文を添えて提供するページの種類で、通常のMarkdownではないページに使います。Integrationがrouteを解決し、Applicationが最終的なHTMLを組み立てます。
- [Publication Boundary](./publication-boundary.ja.md)：どのコンテンツを公開して安全かを決める規則です。Riebeckiteはpublish strategyとfrontmatterを適用し、公開判定を一箇所に集めます。
- [Routable](./routable.ja.md)：URLで提供するentryを示す公開ビューで、unlistedのentryも含みます。ルーティングと出力生成は、discoverableではなくこのビューを使います。
- [Discoverable](./discoverable.ja.md)：一覧、feed、ナビゲーションに載せてよいentryを示す公開ビューです。routableでもunlistedのページはURLでは提供しつつ、このビューには含めません。
- [Unlisted](./unlisted.ja.md)：URLでは提供しつつ、一覧やfeedには載せない公開状態です。routableだがdiscoverableではないため、共有用のリンクや下書きに近いページに向きます。
- [Publish](./publish.ja.md)：コンテンツを公開サイトに含めるかどうかの判定で、publish strategyとpublishedやvisibilityといったfrontmatterで制御します。公開されたコンテンツはpublication boundaryのビューに入ります。
- [Draft](./draft.ja.md)：公開の判定によって公開サイトから外されるコンテンツです。処理自体は続けられますが、公開されるまでroutableとdiscoverableのビューから除外されます。
- [Visibility](./visibility.ja.md)：公開したページをどう見せるかを細かく決めるfrontmatterのfieldです。ページを下書きにせず、一覧に載せるかどうかを分けます。
- [Pipeline](./pipeline.ja.md)：Markdownがmdastにパースされ、remarkプラグインが変換します。hastにブリッジされ、rehypeプラグインがHTMLを変換するMarkdownからHTMLへの処理パイプラインです。Coreが駆動し、プラグインが拡張します。
- [Content Query](./content-query.ja.md)：タグ、フォルダ、日付、またはfrontmatterフィールドでコンテンツentryを選択・フィルタリングし、リスト表示やプラグインデータに使用されます。taxonomy、series、関連投稿で使用されます。
- [WikiLink](./wikilink.ja.md)：ノート同士をつなぎ、content graphに関係を作る`[[link]]`記法です。Riebeckiteはcontent indexを通して解決し、解決できないリンクはdiagnosticとして残します。
- [Embed](./embed.ja.md)：別のノートの内容を現在のページに取り込む記法で、ノートの埋め込みやblockの埋め込みがあります。リンクと同様に解決し、content dependencyとして追跡します。
- [Block ID](./block-id.ja.md)：段落やblockに付ける短い識別子で、見出しなしでそのblockを直接リンク・埋め込みできるようにします。
- [Alias](./alias.ja.md)：ノートの別名で、manifestに追加の検索キーとして記録します。slugやpermalinkを変えずにWikiLinkを同じノートへ解決しますが、同じ名前を二重に使うと曖昧になります。
- [Attachment](./attachment.ja.md)：contentツリー内でコンテンツentryではなくassetとして配信されるファイルです。Attachmentは論理パスを保ったまま公開URLに対応し、何を公開して安全かはpublication boundaryが決めます。
- [Frontmatter](./frontmatter.ja.md)：コンテンツファイルの先頭にあるYAMLのブロックで、title、date、tags、visibilityなどの型付きメタデータに解析されます。slugとは独立にノートを識別する安定したidもここに置きます。
- [Taxonomy](./taxonomy.ja.md)：/tags/ のような一覧ページへ、tag、folder、dateでコンテンツをまとめる仕組みです。Taxonomyページはcontent collectionから作られ、リンクにはpermalinkを使います。
- [Series](./series.ja.md)：順序を持ってまとまるコンテンツの集合で、frontmatterのseries fieldで設定します。seriesの一覧は、同じseries値を持つcontent collectionから作られます。
- [Folder Page](./folder-page.ja.md)：単一のファイルではなくフォルダを代表するページで、folder-pages Pluginが扱います。ディレクトリにentryと公開URLを与えつつ、配下のページはそれぞれのパスを保ちます。

## Pluginと拡張

- [Plugin](./plugin.ja.md)：RiebeckiteのPluginは、定義された取り決めを通してコンテンツの解釈、変換、描画、診断、ビルド時の処理、エンドポイント、ブラウザでの動作を拡張します。
- [Plugin cache](./plugin-cache.ja.md)：各Pluginは`context.cache`を通じてビルド時だけ使えるPlugin固有のcacheを持ちます。保存できるのはJSONに変換できる値だけで、名前空間はPluginごとに分かれます。
- [Plugin dependency](./plugin-dependency.ja.md)：Pluginは`requires`でCapabilityの要求を宣言します。依存解決は、Capabilityを提供するPluginを、それを利用するPluginより前に並べます。要求を満たせない場合は`PluginDependencyError`を報告し、`kind`と`pluginName`で原因を特定できます。
- [Capability](./capability.ja.md)：Capabilityは、Pluginが提供または要求できる名前付きの機能です。依存解決はPluginを順序付け、失敗は構造化された診断として表示されます。
- [Lifecycle hook](./lifecycle-hook.ja.md)：Pluginのlifecycle hookは、Content Managerが1回動く間に実行されます。順序は`setup`、`buildStart`、コンテンツ処理、`buildEnd`、そして逆順の`dispose`です。名前付きのcontent hookは、依存関係を解決したPluginの順序で加わります。
- [Content hook](./content-hook.ja.md)：Content hookは、コンテンツ処理の各フェーズに参加します。configの解決からcontentの読み込み、post parsed、post processed、content graph、manifestの作成、diagnosticsまでが対象です。
- [Hook context](./hook-context.ja.md)：hookに渡されるplugin contextには`config`、`contentIndex`、`diagnostics`、`cache`、`output`、`logger`、`tracer`が含まれます。任意で`contentSource`も渡されます。グローバルなSingletonではなく、フレームワークのサービスを使います。
- [Renderer](./renderer.ja.md)：Rendererはコンテンツの対象をPlugin固有のHTMLに変換します。対象を処理しない場合は`null`を返し、次のRendererに処理を渡します。Canvas、Excalidraw、attachmentの描画が例です。
- [Endpoint](./endpoint.ja.md)：Endpointは、Pluginが使える再利用可能なHTTPの振る舞いを宣言します。Integrationは、Pluginごとにフレームワーク固有のroutingを組み込むことなく、Endpointの宣言をホストのrouterに接続します。
- [Client entry](./client-entry.ja.md)：Client entryは、実行時に本当に必要なブラウザJavaScriptの初期化を宣言します。各entryはPlugin名、module specifier、任意のexport名、公開configを持ちます。
- [Island](./island.ja.md)：Islandはサーバー側で描画され、必要な箇所だけクライアントでhydrationされるコンポーネントです。ページ全体をhydrationせずに、対話的なUIの一部だけを動かせます。IslandコンポーネントはPluginではなくサイトのapplicationで定義します。
- [プラグイン UI コンポーネント](./plugin-component.ja.md)：Plugin は server-rendered Hono JSX コンポーネントとデータヘルパーを提供します。CSS と選択的な client runtime も含みます。Site はどこで描画するかを決めます。以前の body-slot システムはこのパターンの代わりに削除されました。
- [Asset](./asset.ja.md)：Pluginのassetはstylesheetなどの静的ファイルです。`assets`配列で宣言し、Integrationのstylesheetパイプラインを通してブラウザに届きます。`apps/web`へ直接コピーされることはありません。
- [Head tag](./head-tag.ja.md)：ページのheadタグとメタデータはPluginシステムを通じて追加されます。Integrationとサイトのapplicationが、タイトル、description、言語属性をまとめて最終的な`<head>`を組み立てます。
- [Diagnostics](./diagnostics.ja.md)：DiagnosticsはCoreとPluginが出す構造化された調査結果で、何が問題か、どこで起きるか、どれくらい重要か（severity）、どう直すかを示します。Pluginは`addDiagnostics`で診断を報告し、Coreは`check`と`doctor`コマンドでまとめます。
- [Diagnostic code](./diagnostic-code.ja.md)：Diagnostic codeは問題の種類を識別する安定した識別子です。`duplicate-content-id`、`invalid-content-id`、`content-integrity-*`などCoreとPluginが共有するものがあり、`check`と`doctor`で一貫したレポートに使います。
- [Diagnostic severity](./diagnostic-severity.ja.md)：Severityはerror、warn、infoの三段階で、正しい出力を保てるかどうかを基準に決めます。errorは正しい出力を妨げる問題、warnは注意が必要な潜在的な問題、infoは出力の正しさに影響しない補足情報です。
- [Plugin options](./plugin-options.ja.md)：PluginのオプションはPluginファクトリに渡す設定値です。副作用のない純粋な`validateOptions`関数で検証し、解決したオプションはPluginの`options`プロパティから参照できます。

## Theme

- [Theme](./theme.ja.md)：ThemeはRiebeckiteサイトのプレゼンテーション層を担い、色、フォント、余白、レイアウト、記事のスタイルを決めます。コンテンツの意味やアプリケーションの構造は変えません。
- [Design Token](./design-token.ja.md)：Design Tokenは色、余白、フォントなどの名前付きの値で、CSSカスタムプロパティ（`--rb-*`）として定義します。カスケードを通じて、コンポーネントとThemeが安定した語彙を共有できます。
- [Semantic Token](./semantic-token.ja.md)：Semantic Tokenは、本文の色、アクセント、境界といった意味で参照するDesign Tokenです。コンポーネントを変えずにThemeを入れ替えられます。
- [Color Mode](./color-mode.ja.md)：Color Modeは`light`、`dark`、`system`の3つの配色です。`colorMode`オプションと`<html>`の`data-theme`属性で制御し、JavaScriptで実行時に切り替えられます。
- [Typography](./typography.ja.md)：Typographyは、フォントファミリ、サイズ、行間といったサイトの組版の設定です。`system`、`serif`、`sans`のプリセットを`data-typography`属性でTheme Rootに適用します。
- [CSS Contract](./css-contract.ja.md)：CSS Contractは、コンポーネントが依存できる安定したCSSのhookと、カスケードの順序です。Themeは`rb-*`と`rr-*`のhookを公開し、コンポーネントが特定のThemeを前提にせずスタイルを当てられるようにします。
- [Theme Root](./theme-root.ja.md)：Theme Rootのセレクタ（`[data-theme-root]`または`<html>`）は、Tokenと属性のルールをページ全体に適用します。Color ModeとTypographyの属性をここへ付けると、カスケードがすべての要素に届きます。
- [Presentation Layer](./presentation-layer.ja.md)：Presentation LayerはThemeの担当範囲で、色、フォント、余白、レイアウト、記事のスタイルを指します。コンテンツの意味、route、manifest、Pluginの動作、クライアントスクリプトは含みません。
- [Article Layout](./article-layout.ja.md)：Article Layoutは、記事エリアの幅とサイドバーの構成を決めるプリセットです。`data-article-layout`属性で選び、`article`、`sidebar`、`full-width`の3つを用意します。
- [userCss](./user-css.ja.md)：userCssはtheme CSSのあとに読み込まれる追加のスタイルシートです。Themeをforkせずに、サイト作者が外観を最終調整できます。

## ビルドと運用

- [Build](./build.ja.md)：Riebeckiteがコンテンツを処理し、公開位置を解決して、manifestとcontent graphを組み立て、出力を書き出す一連の処理です。
- [Full Build](./full-build.ja.md)：以前のBuild情報を使わず、すべてのコンテンツを最初から処理するBuildです。Incremental Buildが使えないときの経路になります。
- [Incremental Build](./incremental-build.ja.md)：content dependencyと保存したBuild Stateを使って、変わった分だけを再生成するBuildです。宣言した入力が変わっていなければ、未変更のコンテンツと出力を再利用します。
- [Build State](./build-state.ja.md)：前回のBuildの記録で、entry、fingerprint、依存関係、出力の変更を含みます。
- [Build Dependency](./build-dependency.ja.md)：あるコンテンツや出力に影響する入力の宣言で、別のノート、ファイル、tag、folderなどがあります。依存を記録することで、Coreは変化が影響し得る分だけを無効化できます。
- [Output Dependency](./output-dependency.ja.md)：出力が何に依存するかの宣言で、output inventoryを前回の状態と比べたときにどの出力を再生成するかを決めます。contentの出力は`content`型の依存を持ち、Generated Outputは任意の型を持てます。
- [Fingerprint](./fingerprint.ja.md)：コンテンツやファイルの入力を識別し、変化を検出できるようにするハッシュです。保存した値と異なれば、依存するコンテンツを再処理します。
- [Cache](./cache.ja.md)：`.riebeckite/`配下に保存する再利用可能なBuildのデータです。Cacheは最適化であり、削除しても公開される出力は変わりません。
- [Cache Invalidation](./cache-invalidation.ja.md)：記録した依存やfingerprintが変わったcacheのコンテンツを捨てる処理です。無効化したentryは再処理され、他のentryに影響する場合は変化が伝播します。
- [Cache Version](./cache-version.ja.md)：永続的なcontent cacheのスキーマのバージョンで、スキーマの変更にともなう互換性と移行を制御します。
- [Persistent Cache](./persistent-cache.ja.md)：`.riebeckite/cache/content/vN`に保存される、Build間で再利用する処理済みのMarkdownの結果です。cacheに当たればウォームビルドになり、外れれば再処理を強制します。
- [Output Cache](./output-cache.ja.md)：`.riebeckite/ssg-output-cache.json`に保存される、SSGの出力ルートとファイルをためるcacheです。Incremental SSGで再利用するためのもので、GitHub ActionsではCI実行間で復元し、検証に通らないcacheは破棄します。
- [Output Inventory](./output-inventory.ja.md)：公開entry、redirect、Pluginページ、Generated Outputから作られる、パスをキーにしたすべての生成物の記録です。Buildはこれを前回の成功した状態と比べ、影響する出力、変わっていない出力、削除された出力を求めます。
- [Generated Output](./generated-output.ja.md)：Pluginが生成する出力で、contentの出力とは別物です。所有者と依存関係を持ち、宣言されたoutput dependencyにしたがって再生成が決まります。
- [SSG](./ssg.ja.md)：サイトを事前にファイルへ描画するRiebeckiteの静的サイト生成です。Coreがコンテンツと公開位置を担い、IntegrationがHonoXとViteにつないでrouteを描画し、出力を書き出します。
- [Deterministic Build](./deterministic-build.ja.md)：同じ入力に対して同じ出力を生成するBuildです。fingerprint、pipelineのバージョン管理、設定のスナップショットが一貫していることで保証されます。
- [Check](./check.ja.md)：Plugin依存の循環やpermalinkの重複など、Buildを壊す問題がないか、サイトの設定とコンテンツを検証するCLIコマンドです。
- [Doctor](./doctor.ja.md)：サイトの構成と環境を確認し、Integration、Theme、デプロイ先が整っているかを検証するCLIコマンドです。Checkよりも周囲の構成について多くを報告します。
- [Inspector](./inspector.ja.md)：解決済みの状態（設定、Plugin、content、content graph、Build Stateなど）を閲覧する読み取り専用のCLIコマンドです。
- [Profiler](./profiler.ja.md)：コンテンツ処理からPluginのhook、出力生成まで、どこに時間がかかるかを計測するBuild時の仕組みです。trace spanを読み、Buildの所要時間を報告します。
- [Trace Span](./trace-span.ja.md)：Buildのobservabilityにおける名前付きの計測区間で、Pluginのhookやcacheの参照などの文脈のタグを持ちます。SpanはProfilerとobservabilityのイベントに使われます。
- [Logger](./logger.ja.md)：Build全体で構造化されたイベントとspanを出すobservabilityの経路です。その出力はCLI、Profiler、Integrationが受け取ります。
- [Orphan](./orphan.ja.md)：どのページからもリンクされていないコンテンツです。診断は既定でオフになっており、有効にすると孤立したentryを報告します。
- [Unused Asset](./unused-asset.ja.md)：どのコンテンツからも参照されていないassetです。診断は既定でオフになっており、有効にすると未使用のassetを報告します。

## 設定と配信

- [Preset](./preset.ja.md)：よくある構成をまかなうため、configに適用する準備済みのoptionの組です。Presetはよく使うPlugin、Theme、設定をまとめ、わずかな設定で採用できるようにします。
- [Config](./config.ja.md)：コンテンツ、公開、Plugin、Theme、cacheの挙動を制御するRiebeckiteの設定オブジェクトです。Buildが使う前に検証し、解決します。
- [Root](./root.ja.md)：Riebeckiteが他のパスを解決する基準となるディレクトリで、Application rootやcontent rootがあります。安定したrootを基準に解決することで、パスをマシン間で持ち運べます。
- [Publish Strategy](./publish-strategy.ja.md)：コンテンツをどう公開するかを決める設定値で、すべて公開するか、公開指定のあるものだけを公開するかを選びます。Publication Boundaryの既定側を定めます。
- [Localization](./localization.ja.md)：1つのサイトで複数の言語のコンテンツを配信できるようにするl10n Pluginです。ノートの言語を検出し、翻訳をまとめ、言語切り替えを公開します。
- [Translation](./translation.ja.md)：同じコンテンツの言語違いを結び付ける対応で、frontmatterで設定します。翻訳の対応があることで、リンクとgraphが読み手の言語に従えます。
- [Language Switcher](./language-switcher.ja.md)：読み手がページの言語版を行き来できるようにする操作です。l10n Pluginが提供し、翻訳があるときにSiteが描画します。
- [Locale](./locale.ja.md)：サイトやページが書かれている言語と地域の識別子で、enやjaなどです。既定のlocaleは、URLに接頭辞を付けずに配信する言語を決めます。
- [Hreflang](./hreflang.ja.md)：あるページの言語違いのURLを検索エンジンに伝えるlinkメタデータです。Riebeckiteはノートに存在する翻訳からこれを生成します。
- [Feed](./feed.ja.md)：公開されたコンテンツを機械可読に並べたもので、RSS、Atom、JSON Feedなどがあります。Feedはdiscoverableなentryから作り、各entryのpermalinkを使います。
- [Deployment](./deployment.ja.md)：Build済みのサイトを配信先へ配置する段階です。Buildがmanifestと生成物を用意し、IntegrationがそれをCloudflare Workersなどのplatformにつなぎます。
- [Integration](./integration.ja.md)：Coreのコンテンツとページを、HonoXやViteといった描画・配信のスタックにつなぐパッケージです。コンテンツの論理を持たずに、routeを描画し出力を書き出します。
- [Runtime](./runtime.ja.md)：Buildの後に、サイトがページを配信し問い合わせに答える段階です。Runtimeのコードは、コンテンツを再処理せずmanifestとページのデータを読みます。
- [Site Config](./site-config.ja.md)：SiteConfigのフィールド（title、description、author、baseUrl、locale、twitterSite、defaultOgImage、feed）はサイトを記述します。SEOやfeed、localeを駆動します。
- [Navigation](./navigation.ja.md)：サイトのナビゲーション設定と、解決されたmanifestからヘッダー/フッターのリンクを描画するナビゲーションプラグインです。
- [Route](./route.ja.md)：Integrationがページを解決するURLパスで、ページのpublic pathからProducedされ、HonoXのフレームワークによって描画されます。
- [Sitemap](./sitemap.ja.md)：manifestからビルドされた検索エンジン向けのsitemap/robotsリストで、discoverableなURLを提供します。
- [Search](./search.ja.md)：manifestから作成されるbuild-timeの検索indexとプラグインで、読み手がコンテンツをクエリリングできるようにします。

## オーサリングと統合

- [Obsidian Vault](./obsidian-vault.ja.md)：既存のObsidian vaultをコンテンツディレクトリとして読み込めるため、vaultを整理し直さずに、選んだノートだけを公開できます。
- [Tag](./tag.ja.md)：Tagは共通のラベルでコンテンツをまとめ、`/tags/<slug>`に一覧ページを生成します。あわせてRSS・Atom・JSONのフィードと、関連タグのナビゲーションを提供します。
- [Shortcode](./shortcode.ja.md)：`remark-directive`の記法を使う汎用のショートコード機構です。インライン（`:name[label]{key=value}`）、ブロック（`::name[label]{key=value}`）のショートコードに対応します。コンテナ（`:::name[label]{key=value}`… `:::`）のショートコードに対応します。組み込みのレジストリも持ちます。
- [Callout](./callout.ja.md)：コンテナショートコードの`:::callout[Title]{type=warning}`または`:::note[Title]{type=info}`で作るコールアウトボックスです。`rr-callout rr-callout--{type}`クラスを持つ`div`として描画され、組み込みの既定タイトルを持ちます。
- [Sidenote](./sidenote.ja.md)：脚注の記法を、インラインの参照と、デスクトップではマージンノート、モバイルではポップオーバーに置き換えるTufte風のサイドノートです。モバイルのポップオーバーの切り替えには、小さなclient entry（`initSidenotes`）を使います。
- [Backlink](./backlink.ja.md)：どの公開ノートが現在のノートにリンクしているかを示すバックリンクの一覧です。`getPublishedBacklinks()`でcontent manifestから被リンクを解決し、公開されて一覧に載るノートだけに絞り込み、manifestの順序で並べます。
- [Site](./site.ja.md)：サイトのapplicationは、route、文書の枠組み、メタデータ、HTMLの安全性を持ちます。`@riebeckite/honox`のintegrationを通じてRiebeckiteのCoreの振る舞いをHonoXとViteにつなぎます。Pluginの提供物を最終的な公開UIにどう組み立てるかを決めます。
- [UI](./ui.ja.md)：`@riebeckite/honox/ui`が提供するUIプリミティブは、小さな構造の取り決めであり、コンポーネントフレームワークではありません。プリミティブには`Article`、`ArticleLayout`、`ArticleContent`、`ArticleBody`、`ArticleMeta`、`ArticleFooter`、`Sidebar`があります。安定したCSS hook（`rb-article`、`rb-article-layout`など）も持ちます。
