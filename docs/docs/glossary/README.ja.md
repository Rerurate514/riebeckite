---
title: 用語集
sidebar:
  label: 用語集
  order: 70
---

# 用語集

Riebeckite が使う概念をカテゴリ別にまとめた用語集です。各項目は短い定義と用語ノートへのリンクで、詳しい説明は既存のドキュメントにあります。

## コンテンツと公開

- [Content](./content.ja.md) — Markdown の解析と Plugin 処理を経たコンテンツです。frontmatter、描画済みの HTML、解決済みの公開位置を持ち、Riebeckite は生のファイルではなく処理後の項目を扱います。
- [Content Source](./content-source.ja.md) — パイプラインの他の部分にコンテンツを供給する読み取りの抽象です。標準の実装はファイルシステムや Obsidian vault を読み取るため、Content Manager がファイルシステムを直接走査することはありません。
- [Content Manager](./content-manager.ja.md) — 走査済みの entry を完成した manifest に変えるコンポーネントです。公開位置を解決し、Markdown と Plugin のパイプラインを実行してから、content graph と検索用の index を作ります。
- [Content Entry](./content-entry.ja.md) — manifest の中で slug により識別される、解決済みのコンテンツ 1 件です。permalink、公開位置、frontmatter、公開状態、HTML、Plugin が付与したデータを持ちます。
- [Content ID](./content-id.ja.md) — frontmatter に書く安定した識別子で、slug や permalink とは独立にノートを指します。ファイルの移動や URL の変更をまたいで残るため、外部から参照するときのキーになります。
- [Content Collection](./content-collection.ja.md) — query 用に作られるコンテンツ entry のまとまりです。tag、folder、date、frontmatter の field などの kind で定義し、Taxonomy ページや archive、series の一覧は collection から作られます。
- [Content Graph](./content-graph.ja.md) — 解決済みの WikiLink と Markdown リンクから作られる、コンテンツ entry 間の関係の網です。どのノートがどれを参照しているかを答え、backlink や近傍の問い合わせに使います。
- [Content Index](./content-index.ja.md) — WikiLink や embed を解決するための、小文字化した名前からノートへの対応表です。複数のノートに一致する名前は載せず、誤った解決を避けて diagnostic として報告します。
- [Content Dependency](./content-dependency.ja.md) — ある entry の出力が別の entry に依存することを示す記録です。依存先が変わると、依存元を再処理して派生した内容の正しさを保ちます。
- [Manifest](./manifest.ja.md) — すべてのコンテンツを記録するビルド時の一覧です。entry、公開ビュー、検索用の対応表、content graph、diagnostic を持ちます。ページ生成、実行時の query、incremental build、inspection はいずれも manifest を読みます。
- [Slug](./slug.ja.md) — ノートの内部的な検索キーで、content index、manifest、content graph が使います。公開 URL ではないため、公開側では解決済みの公開位置から permalink を読みます。
- [Logical Path](./logical-path.ja.md) — content root を基準に表した、コンテンツファイルの位置です。Riebeckite は logical path を安定して保ち、公開パスへは別に対応させます。
- [Permalink](./permalink.ja.md) — ノートの公開 URL として解決済みの正準値です。リンク、feed、sitemap、メタデータの唯一の出所であり、slug から再計算せず、公開位置の解決から得ます。
- [Public Path](./public-path.ja.md) — サイトの origin を付ける前の、公開 URL のパス部分です。permalink を解決した後にリンクが使う値です。
- [Public Location](./public-location.ja.md) — ノートをどこに公開するかを表し、内部の slug と正準の permalink に、任意の redirect とメタデータを組み合わせます。manifest が entry ごとに公開する解決済みの結果です。
- [Redirect](./redirect.ja.md) — ノートの正準 permalink を指す追加の URL で、多くの場合は古いアドレスを生かすために使います。redirect は解決済みの公開位置の一部で、permalink を置き換えません。
- [Page](./page.ja.md) — サイトが URL で提供する、ルーティング可能なコンテンツです。Markdown から作られる場合と、Plugin の page type から作られる場合があり、Integration が route を通して描画します。
- [Page Type](./page-type.ja.md) — Plugin が独自の公開パスと本文を添えて提供するページの種類で、通常の Markdown ではないページに使います。Integration が route を解決し、Application が最終的な HTML を組み立てます。
- [Publication Boundary](./publication-boundary.ja.md) — どのコンテンツを公開して安全かを決める規則です。Riebeckite は publish strategy と frontmatter を適用し、公開判定を一箇所に集めます。
- [Routable](./routable.ja.md) — URL で提供する entry を示す公開ビューで、unlisted の entry も含みます。ルーティングと出力生成は、discoverable ではなくこのビューを使います。
- [Discoverable](./discoverable.ja.md) — 一覧、feed、ナビゲーションに載せてよい entry を示す公開ビューです。routable でも unlisted のページは URL では提供しつつ、このビューには含めません。
- [Unlisted](./unlisted.ja.md) — URL では提供しつつ、一覧や feed には載せない公開状態です。routable だが discoverable ではないため、共有用のリンクや下書きに近いページに向きます。
- [Publish](./publish.ja.md) — コンテンツを公開サイトに含めるかどうかの判定で、publish strategy と published や visibility といった frontmatter で制御します。公開されたコンテンツは publication boundary のビューに入ります。
- [Draft](./draft.ja.md) — 公開の判定によって公開サイトから外されるコンテンツです。処理自体は続けられますが、公開されるまで routable と discoverable のビューから除外されます。
- [Visibility](./visibility.ja.md) — 公開したページをどう見せるかを細かく決める frontmatter の field です。ページを下書きにせず、一覧に載せるかどうかを分けます。
- [WikiLink](./wikilink.ja.md) — ノート同士をつなぎ、content graph に関係を作る `[[link]]` 記法です。Riebeckite は content index を通して解決し、解決できないリンクは diagnostic として残します。
- [Embed](./embed.ja.md) — 別のノートの内容を現在のページに取り込む記法で、ノートの埋め込みや block の埋め込みがあります。リンクと同様に解決し、content dependency として追跡します。
- [Block ID](./block-id.ja.md) — 段落や block に付ける短い識別子で、見出しなしでその block を直接リンク・埋め込みできるようにします。
- [Alias](./alias.ja.md) — ノートの別名で、manifest に追加の検索キーとして記録します。slug や permalink を変えずに WikiLink を同じノートへ解決しますが、同じ名前を二重に使うと曖昧になります。
- [Attachment](./attachment.ja.md) — content ツリー内でコンテンツ entry ではなく asset として配信されるファイルです。Attachment は論理パスを保ったまま公開 URL に対応し、何を公開して安全かは publication boundary が決めます。
- [Frontmatter](./frontmatter.ja.md) — コンテンツファイルの先頭にある YAML のブロックで、title、date、tags、visibility などの型付きメタデータに解析されます。slug とは独立にノートを識別する安定した id もここに置きます。
- [Taxonomy](./taxonomy.ja.md) — /tags/ のような一覧ページへ、tag、folder、date でコンテンツをまとめる仕組みです。Taxonomy ページは content collection から作られ、リンクには permalink を使います。
- [Series](./series.ja.md) — 順序を持ってまとまるコンテンツの集合で、frontmatter の series field で設定します。series の一覧は、同じ series 値を持つ content collection から作られます。
- [Folder Page](./folder-page.ja.md) — 単一のファイルではなくフォルダを代表するページで、folder-pages Plugin が扱います。ディレクトリに entry と公開 URL を与えつつ、配下のページはそれぞれのパスを保ちます。

## Plugin と拡張

- [Plugin](./plugin.ja.md) — Riebeckite でプラグインは定義された契約を通じてコンテンツの解釈、変換、描画、診断、ビルド時処理、エンドポイント、ブラウザ動作を拡張します。
- [Plugin cache](./plugin-cache.ja.md) — 各プラグインは `context.cache` を通じてビルド時専用のプラグイン固有キャッシュを持ち、JSON シリアライザブルな値だけを保存しプラグイン名空間にスコープを限定します。
- [Plugin dependency](./plugin-dependency.ja.md) — プラグインは `requires` でキャビリティの要求を宣言します; resolver は provider を consumer より前に配置し、欠落時は `PluginDependencyError` でエラー報告します ( `kind` と `pluginName` で特定)。
- [Capability](./capability.ja.md) — キャビリティとはプラグインが提供または要求できる名前付きの機能です; resolver はプラグインを順序付け、失敗は構造化された診断として表示されます。
- [Lifecycle hook](./lifecycle-hook.ja.md) — プラグインのライフサイクルフックは ContentManager 一回あたり、この順序で実行されます: `setup`, `buildStart`, コンテンツ処理、`buildEnd`, そして reverse resolved order の `dispose`。名前付きコンテンツフックは resolved plugin order で参加します。
- [Content hook](./content-hook.ja.md) — コンテンツフックはコンテンツ処理の命名されたフェーズに参加します: config resolved から content loaded、post parsed、post processed、content graph、manifest 作成、そして diagnostics まで。
- [Hook context](./hook-context.ja.md) — hook に渡される plugin context には `config`、`contentIndex`、`diagnostics`、`cache`、`output`、`logger`、`tracer` が含まれ、optional の `contentSource` もあります。グローバルシングルTon よりフレームワークサービスを優先します。
- [Renderer](./renderer.ja.md) — Renderer はコンテンツターゲットをプラグイン固有の HTML に変換します; ターゲットを処理しない場合は `null` を返して次の renderer が参加できるようにします。Canvas、Excalidraw、attachment の描画が例です。
- [Endpoint](./endpoint.ja.md) — Endpoint はプラグインのための再利用可能な HTTP 動作を宣言します; integration は plugin ごとのフレームワーク固有の routing を組み込むことなく、endpoint contract を host router に接続します。
- [Client entry](./client-entry.ja.md) — Client entry は本当に runtime で必要なブラウザ JavaScript の初期化を宣言します; 各エントリは plugin name、module specifier、オプションの export name、public config を持ちます。
- [Island](./island.ja.md) — Island はサーバーサイドで描画され、必要な箇所でのみ client が hydrate するコンポーネントです; ページ全体を hydrate せずにインタラクティブな UI セクションを可能にします。Island コンポーネントはプラグインではなく site application で定義されます。
- [Body slot](./slot.ja.md) — プラグインは `appendContentBodySlot` で記事レイアウトの名前付き位置に HTML フラグメントを寄せられます; slot は resolved plugin order で蓄積し、site は 各スロットを描画するかどうか、どこで描画するかを選択します。
- [Asset](./asset.ja.md) — プラグインのアセットは stylesheet など static resources で、 `assets` 配列で宣言され、integration の stylesheet pipeline を通じてブラウザに届けられます; 直接 `apps/web` にコピーされません。
- [Head tag](./head-tag.ja.md) — ページの head タグとメタデータはプラグインシステムを通じて貢献され、integration と site application がタイトル、description、言語属性を結合して final `<head>` を compose します。
- [Diagnostics](./diagnostics.ja.md) — Diagnostics は Core と plugin が emitting 構造化された調査結果で、問題が何か、どこで起きるか、どの程度重要か (severity)、そしてどう修正するかを説明します。プラグインは `addDiagnostics` で診断を報告し、Core は `check` と `doctor` コマンドでまとめます。
- [Diagnostic code](./diagnostic-code.ja.md) — Diagnostic code は問題のカテゴリを識別する安定した識別子で、`duplicate-content-id`、`invalid-content-id`、`content-integrity-*` など core と plugin が共有するセットがあり、`check` と `doctor` で一貫したレポートに使用されます。
- [Diagnostic severity](./diagnostic-severity.ja.md) — Severity レベル (error, warn, info) は output が正しく残せるかどうか proportionate に設定されます; error は output が正しく残せない場合、warn は注意が必要な潜在的な問題、info は contextual 情報で output の正しさに影響しません。
- [Plugin options](./plugin-options.ja.md) — プラグインのオプションはプラグインファクトリに渡される設定値で、side effects のない pure `validateOptions` 関数で検証され、解決されたオプションはプラグイン `options` プロパティで利用できます。

## Theme

- [Theme](./theme.ja.md) — Theme は Riebeckite サイトのプレゼンテーション層を制御し、色、フォント、間隔、レイアウト、記事のスタイルを決定します。コンテンツの意味論やアプリケーション構造を変更しません。
- [Design Token](./design-token.ja.md) — デザイン トークンは色、間隔、フォントなどの名前付き値で、CSS カスタムプロパティ (--rb-*) として定義され、カスケードを通じてコンポーネントとテーマが安定した語彙を共有できるようにします。
- [セマンティック トークン](./semantic-token.ja.md) — セマンティック トークンは、body color、accent、border などの意味で参照されるデザイン トークンで、コンポーネントの変更なしにテーマの入れ替えを可能にします。
- [色調モード](./color-mode.ja.md) — light, dark, system の3つからなるアクティブな色調 scheme。theme の `colorMode` オプションと `<html>` の `data-theme` 属性で制御され、JavaScript を使ったランタイム切り替えが可能です。
- [タイポグラフィ](./typography.ja.md) — サイトのタイポグラフィック設定 — フォントファミリ、サイズ、行高 — は `system`, `serif`, `sans` のテーマプリセットを通じて `data-typography` 属性でテーマルートに適用されます。
- [CSS コントラクト](./css-contract.ja.md) — コンポーネントが依存できる安定した CSS フックとカスケード順序です。テーマは documented hooks (rb-* と rr-*) を公開し、コンポーネントが特定のテーマをハードコードせずにスタイルを設定できるようにします。
- [Theme Root](./theme-root.ja.md) — Theme Root セレクタ ([data-theme-root] または <html>) はトークンと属性ルールを全ページにスコープし、色調モードとタイポグラフィ属性がここに適用されるとカスケードがすべての要素に届きます。
- [プレゼンテーション層](./presentation-layer.ja.md) — プレゼンテーション層はテーマの責任範囲 — 色、フォント、間隔、レイアウト、記事のスタイルです。コンテンツの意味論、ルート、マニフェスト、プラグインの動作、クライアントスクリプトは含まれません。
- [記事レイアウト](./article-layout.ja.md) — 記事レイアウトプリセット (`article`, `sidebar`, `full-width`) は `data-article-layout` 属性を通じて記事エリアの表示を決定します。幅とサイドバーの設定を制御しますが、ルートやコンポーネントツリーを変更しません。
- [userCss](./user-css.ja.md) — theme CSS の後に読み込まれる追加のスタイルシートで、テーマをフォークせずにサイト作者が外観に最終調整を加えられます。userCss は theme CSS、plugin CSS、config トークンスタイルの上書きに勝ちます。

## ビルドと運用

- [ビルド](./build.ja.md) — Riebeckite がコンテンツを処理し、場所を解決し、プラグインを実行し、マニフェストとグラフを構築して出力を書き込むプロセスです。
- [フルビルド](./full-build.ja.md) — 以前のインクリメンタルステートを再利用せず、すべてのコンテンツをスクラッチから処理するビルドです。
- [インクリメンタルビルド](./incremental-build.ja.md) — コンテンツの依存関係と保存されたビルド状態を利用して、変更された部分のみを再生成するビルドモードです。
- [ビルド状態](./build-state.ja.md) — 前回の Build が記録されたもので、 entries、 fingerprints、 dependencies、 output changes を含みます。
- [Build 依存性](./build-dependency.ja.md) — Core とプラグインの間の契約で、processed content と emitted files がビルド間で入力にどのように依存するかを宣言する。
- [出力依存性](./output-dependency.ja.md) — 出力依存性は、コンテンツの変更によってどのエミットされたファイルが影響を受け、再生成が必要かを決定する。
- [フィンガープリント](./fingerprint.ja.md) —  build が変更を検知し、キャッシュ／Build-state 比較を駆動する入力を識別するハッシュです。
- [Cache](./cache.ja.md) — `.riebeckite/` 配下に保存する再利用可能な Build のデータです。Cache は最適化であり、削除しても公開される出力は変わりません。
- [キャッシュ無効化](./cache-invalidation.ja.md) —  recorded dependencies または fingerprints が変更されたキャッシュされたコンテンツをドロップするステップです。無効化されたエントリは再処理され、他のエントリにフィードチェンジが伝播します。
- [Cache バージョン](./cache-version.ja.md) —  persistent content cache のスキーマバージョンで、キャッシュのスキーマ変更に伴う互換性とマイグレーションを制御する。
- [永続キャッシュ](./persistent-cache.ja.md) —  `.riebeckite/cache/content/vN` 下に保存された、ビルド間で再利用される処理済み Markdown 結果です。cache hit があると warm build になり、miss があると再処理が強制される。
- [出力キャッシュ](./output-cache.ja.md) —  `.riebeckite/ssg-output-cache.json` に保存された、SSG の出力ルートとファイルを格納したキャッシュです。 incremental SSG の再利用のために local-only で、CI runner 間で共有することを目的としていない。
- [出力インベントリ](./output-inventory.ja.md) — public entries、 redirects、 plugin pages、 および generated outputs から作成されたパスキーのすべての生成された出力の記録です。Build はこれを以前の successful state と比較し、affected、 unchanged、 および removed outputs を見つける。
- [生成された出力](./generated-output.ja.md) — プラグインによって生成された出力で、content output とは別物です。generated outputs には owner と dependencies があり、output dependency の宣言によって再生成が駆動される。
- [SSG](./ssg.ja.md) —  Riebeckite での静的サイト生成で、ビルド前にサイトをファイルにレンダリングする。Core がコンテンツと場所を処理し、integration が HonoX と Vite に接続してルートを描画し、出力を書き込む。
- [決定的ビルド](./deterministic-build.ja.md) —  同じ入力が与えられた場合、一貫した fingerprints、 pipeline versioning、 および configuration snapshots が保証されるため、同じ出力を生成するビルドです。
- [Check](./check.ja.md) —  Build 前に config、 plugins、 capabilities が正しく設定されているか検証する CLI コマンドです。
- [Doctor](./doctor.ja.md) —  environment、 config、 plugins、 content、 Build State を確認して Project 全体の問題を診断する CLI コマンドです。
- [Inspector](./inspector.ja.md) —  already-resolved state（ config、 plugins、 content、 graph、 build state など）を閲覧する read-only CLI コマンドです。
- [Profiler](./profiler.ja.md) —  content processing から plugin hooks および output generation に至るまで、 Build のどこに時間がかかるかを計測するビルド時間測定です。 trace span を読み取ってビルドのタイミングをレポートする。
- [トレーススパン](./trace-span.ja.md) —  build work の timed unit。traces は build work を span に分割し、その duration を記録する。span 名は安定しているべき (例: `content.load`, `plugins.run`, `diagnostics.run`, `application.build`) 。
- [Logger](./logger.ja.md) —  build 全体を通して emit される structured events と spans の observability チャンネルです。その出力は CLI、profiler、 および integration に消費される。
- [孤立したコンテンツ](./orphan.ja.md) —  公開されたページや他のコンテンツによって参照されていないコンテンツやアセットです。orphan は削除されたコンテンツがまだ存在していることを示している、あるいは cleanup するべきコンテンツであることを示す可能性がある。
- [未使用アセット](./unused-asset.ja.md) —  content の frontmatter や content で参照されていないアセット（画像、ファイルなど）です。出力サイズを削減するために安全に削除できる可能性がある。

## 設定と配信

- [Preset](./preset.ja.md) — よくある構成をまかなうため、config に適用する準備済みの option の組です。Preset はよく使う Plugin、Theme、設定をまとめ、わずかな設定で採用できるようにします。
- [Config](./config.ja.md) — コンテンツ、公開、Plugin、Theme、cache の挙動を制御する Riebeckite の設定オブジェクトです。Build が使う前に検証し、解決します。
- [Root](./root.ja.md) — Riebeckite が他のパスを解決する基準となるディレクトリで、Application root や content root があります。安定した root を基準に解決することで、パスをマシン間で持ち運べます。
- [Publish Strategy](./publish-strategy.ja.md) — コンテンツをどう公開するかを決める設定値で、すべて公開するか、公開指定のあるものだけを公開するかを選びます。Publication Boundary の既定側を定めます。
- [Localization](./localization.ja.md) — 1 つのサイトで複数の言語のコンテンツを配信できるようにする l10n Plugin です。ノートの言語を検出し、翻訳をまとめ、言語切り替えを公開します。
- [Translation](./translation.ja.md) — 同じコンテンツの言語違いを結び付ける対応で、frontmatter で設定します。翻訳の対応があることで、リンクと graph が読み手の言語に従えます。
- [Language Switcher](./language-switcher.ja.md) — 読み手がページの言語版を行き来できるようにする操作です。l10n Plugin が、翻訳があるときに article metadata の slot へ公開します。
- [Locale](./locale.ja.md) — サイトやページが書かれている言語と地域の識別子で、en や ja などです。既定の locale は、URL に接頭辞を付けずに配信する言語を決めます。
- [Hreflang](./hreflang.ja.md) — あるページの言語違いの URL を検索エンジンに伝える link メタデータです。Riebeckite はノートに存在する翻訳からこれを生成します。
- [Feed](./feed.ja.md) — 公開されたコンテンツを機械可読に並べたもので、RSS、Atom、JSON Feed などがあります。Feed は discoverable な entry から作り、各 entry の permalink を使います。
- [Deployment](./deployment.ja.md) — Build 済みのサイトを配信先へ配置する段階です。Build が manifest と生成物を用意し、Integration がそれを Cloudflare Workers などの platform につなぎます。
- [Integration](./integration.ja.md) — Core のコンテンツとページを、HonoX や Vite といった描画・配信のスタックにつなぐパッケージです。コンテンツの論理を持たずに、route を描画し出力を書き出します。
- [Runtime](./runtime.ja.md) — Build の後に、サイトがページを配信し問い合わせに答える段階です。Runtime のコードは、コンテンツを再処理せず manifest とページのデータを読みます。

## オーサリングと統合

- [Obsidian Vault](./obsidian-vault.ja.md) — Riebeckite は既存の Obsidian ヴォールト をコンテンツディレクトリとして読み込み、選択したノートだけを公開できます。
- [Tag](./tag.ja.md) — タグ は共通ラベルでコンテンツエントリをグループ化し、 `/tags/<slug>` でリストページを生成します。RSS/Atom/JSON フィードと関連タグナビゲーションも付帯します。
- [Shortcode](./shortcode.ja.md) —  `remark-directive` 構文を使用する汎用ショートシステムです。インライン (`:name[label]{key=value}`)、ブロック (`::name[label]{key=value}`)、コンテナー (`:::name[label]{key=value}` … `:::` ) に対応し、組み込みレジストリを備えています。
- [Callout](./callout.ja.md) — コンテナ ショートコード構文 `:::callout[Title]{type=warning}` または `:::note[Title]{type=info}` を使用するコールアウトボックスです。CSS クラス `rr-callout rr-callout--{type}` でレンダリングされ、組み込みの既定のタイトルが使用されます。
- [Sidenote](./sidenote.ja.md) — Tufte スタイルのサイドノートで、footnote マークダウンをインライン参照とマージンノート（デスクトップ）またはポップオーバー（モバイル）に書き換えます。モバイルポップオーバーの動作を切り替える小さなクライアントエントリ (`initSidenotes`) を使用します。
- [Backlink](./backlink.ja.md) — 現在のノートへのリンクを示すバックリンクリストのレンダリングで、`getPublishedBacklinks()` でコンテンツマニフェストからインカミングリンクを解決し、公開可能なノートのみをフィルタリングしてマニフェスト順にソートします。
- [Site](./site.ja.md) — サイト アプリケーション がルート、ドキュメントフレーム、メタデータ、HTML セーフティを所有します。 @riebeckite/honox 統合 を通じて Riebeckite コアの動作を HonoX と Vite に接続し、 plugin の貢献が最終的なパブリック UI にどのように composition されるかを決定します。
- [UI](./ui.ja.md) — @riebeckite/honox/ui) が提供する UI プリミティブ はコンポーネントフレームワークではなく、小さな構造的契約です。 `Article`, `ArticleLayout`, `ArticleContent`, `ArticleBody`, `ArticleMeta`, `ArticleFooter`, `ContentSlot`, `Sidebar` を含み、安定した CSS フック (`rb-article`, `rb-article-layout` など) を持っています。
