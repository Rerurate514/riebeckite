---
title: 用語集
sidebar:
  label: 用語集
  order: 70
---

# 用語集

Riebeckite が使う概念の短い定義です。各項目から用語ノートへ移動でき、詳しい説明は既存のドキュメントにあります。

## コンテンツと公開

- [Content](./content.ja.md) — Markdown の解析と Plugin 処理を経たコンテンツです。
- [Content Source](./content-source.ja.md) — パイプラインの他の部分にコンテンツを供給する読み取りの抽象です。
- [Content Manager](./content-manager.ja.md) — 走査済みの entry を完成した manifest に変えるコンポーネントです。
- [Content Entry](./content-entry.ja.md) — manifest の中で slug により識別される、解決済みのコンテンツ 1 件です。
- [Content Collection](./content-collection.ja.md) — query 用に作られるコンテンツ entry のまとまりです。
- [Content Graph](./content-graph.ja.md) — 解決済みの WikiLink と Markdown リンクから作られる、コンテンツ entry 間の関係の網です。
- [Content Index](./content-index.ja.md) — WikiLink や embed を解決するための、小文字化した名前からノートへの対応表です。
- [Manifest](./manifest.ja.md) — すべてのコンテンツを記録するビルド時の一覧です。
- [Slug](./slug.ja.md) — ノートの内部的な検索キーで、content index、manifest、content graph が使います。
- [Permalink](./permalink.ja.md) — ノートの公開 URL として解決済みの正準値です。
- [Public Location](./public-location.ja.md) — ノートをどこに公開するかを表し、内部の slug と正準の permalink に、任意の redirect とメタデータを組み合わせます。
- [Page](./page.ja.md) — サイトが URL で提供する、ルーティング可能なコンテンツです。
- [Page Type](./page-type.ja.md) — Plugin が独自の公開パスと本文を添えて提供するページの種類で、通常の Markdown ではないページに使います。
- [Publication Boundary](./publication-boundary.ja.md) — どのコンテンツを公開して安全かを決める規則です。
- [Routable](./routable.ja.md) — URL で提供する entry を示す公開ビューで、unlisted の entry も含みます。
- [Discoverable](./discoverable.ja.md) — 一覧、feed、ナビゲーションに載せてよい entry を示す公開ビューです。
- [Publish](./publish.ja.md) — コンテンツを公開サイトに含めるかどうかの判定で、publish strategy と published や visibility といった frontmatter で制御します。
- [Draft](./draft.ja.md) — 公開の判定によって公開サイトから外されるコンテンツです。
- [WikiLink](./wikilink.ja.md) — ノート同士をつなぎ、content graph に関係を作る `[[link]]` 記法です。
- [Embed](./embed.ja.md) — 別のノートの内容を現在のページに取り込む記法で、ノートの埋め込みや block の埋め込みがあります。
- [Alias](./alias.ja.md) — ノートの別名で、manifest に追加の検索キーとして記録します。
- [Attachment](./attachment.ja.md) — content ツリー内でコンテンツ entry ではなく asset として配信されるファイルです。
- [Frontmatter](./frontmatter.ja.md) — コンテンツファイルの先頭にある YAML のブロックで、title、date、tags、visibility などの型付きメタデータに解析されます。
- [Taxonomy](./taxonomy.ja.md) — /tags/ のような一覧ページへ、tag、folder、date でコンテンツをまとめる仕組みです。
- [Series](./series.ja.md) — 順序を持ってまとまるコンテンツの集合で、frontmatter の series field で設定します。
- [Folder Page](./folder-page.ja.md) — 単一のファイルではなくフォルダを代表するページで、folder-pages Plugin が扱います。

## Plugin と拡張

- [Plugin](./plugin.ja.md) — Core の Plugin 契約を通して機能を追加する再利用可能な拡張です。
- [Plugin Cache](./plugin-cache.ja.md) — 処理済みコンテンツをためる Plugin ローカルの保管で、cacheVersion で版管理します。
- [Plugin Dependency](./plugin-dependency.ja.md) — capability を基にした Plugin 間の関係です。
- [Lifecycle Hook](./lifecycle-hook.ja.md) — setup、buildStart、buildEnd、dispose といった Build の段階で実行される Plugin の hook です。
- [Content Hook](./content-hook.ja.md) — onContentLoaded、onPostParsed、onPostProcessed、onManifestCreated など、コンテンツ処理の段階を観察または拡張する Plugin の hook です。
- [Renderer](./renderer.ja.md) — ソースファイルを HTML に変える Plugin の capability です。
- [Endpoint](./endpoint.ja.md) — Plugin がブラウザや外部サービスへ公開する route です。
- [Client Entry](./client-entry.ja.md) — Plugin がクライアント側の挙動のために登録するブラウザの入口です。
- [Island](./island.ja.md) — ページの他の部分を静的なまま、クライアントで hydration される対話的なコンポーネントです。
- [Slot](./slot.ja.md) — ページレイアウトの中で Plugin が HTML を差し込める名前付きの位置です。
- [Diagnostics](./diagnostics.ja.md) — コンテンツ処理中に集める警告とエラーで、manifest にまとめ、plugin runtime から読み出します。
- [Diagnostic Code](./diagnostic-code.ja.md) — diagnostic に付く安定した識別子で、ツールが問題を絞り込み、まとめ、表示するために使います。

## Theme

- [Theme](./theme.ja.md) — CSS、design token、data 属性、カスケードを通してサイトの見た目を定義するパッケージです。
- [Design Token](./design-token.ja.md) — 色や余白といった値を CSS カスタムプロパティとして公開する名前付きの値です。
- [Color Mode](./color-mode.ja.md) — system、light、dark から選ぶ現在の配色です。
- [Typography](./typography.ja.md) — フォントの種類、サイズ、行間など、サイトの組版の設定です。
- [CSS Contract](./css-contract.ja.md) — コンポーネントが依存してよい、data 属性などの安定した CSS hook です。
- [Theme Root](./theme-root.ja.md) — Theme が装飾し、token を適用する範囲の基準となるルート要素です。

## ビルドと運用

- [Build](./build.ja.md) — コンテンツを処理し、公開位置を解決し、Plugin を実行し、manifest と graph を作り、出力を書き出す Riebeckite の処理です。
- [Incremental Build](./incremental-build.ja.md) — content dependency と保存した build state を使って、変わった分だけを再生成する Build の mode です。
- [Build State](./build-state.ja.md) — build ディレクトリに保存される前回 Build の記録で、entry、fingerprint、依存、出力の変更を持ちます。
- [Build Dependency](./build-dependency.ja.md) — あるコンテンツや出力に影響する入力の宣言で、別のノート、ファイル、tag、folder などがあります。
- [Fingerprint](./fingerprint.ja.md) — コンテンツやファイルの入力を識別し、変化を検出できるようにするハッシュです。
- [Cache](./cache.ja.md) — 保存して共有できる再利用可能な Build のデータで、cache の設定で構成します。
- [Cache Invalidation](./cache-invalidation.ja.md) — 記録した依存や fingerprint が変わった cache のコンテンツを捨てる処理です。
- [Output Inventory](./output-inventory.ja.md) — 生成したすべての出力をパスで引けるようにした記録で、公開 entry、redirect、Plugin ページ、生成物から作ります。
- [SSG](./ssg.ja.md) — サイトを事前にファイルへ描画する Riebeckite の静的サイト生成です。
- [Check](./check.ja.md) — Plugin 依存の循環や permalink の重複など、Build を壊す問題がないか、サイトの設定とコンテンツを検証する CLI コマンドです。
- [Doctor](./doctor.ja.md) — サイトの構成と環境を確認し、Integration、Theme、デプロイ先が整っているかを検証する CLI コマンドです。
- [Inspector](./inspector.ja.md) — コンテンツ entry とその解決済みの状態を読み取り専用で示す仕組みで、公開位置、公開状態、content graph、diagnostic を含みます。
- [Profiler](./profiler.ja.md) — コンテンツ処理から Plugin の hook、出力生成まで、どこに時間がかかるかを計測する Build 時の仕組みです。
- [Trace Span](./trace-span.ja.md) — Build の observability における名前付きの計測区間で、Plugin の hook や cache の参照などの文脈の tag を持ちます。
- [Logger](./logger.ja.md) — Build 全体で構造化されたイベントと span を出す observability の経路です。

## 設定と配信

- [Preset](./preset.ja.md) — よくある構成をまかなうため、config に適用する準備済みの option の組です。
- [Config](./config.ja.md) — コンテンツ、公開、Plugin、Theme、cache の挙動を制御する Riebeckite の設定オブジェクトです。
- [Root](./root.ja.md) — Riebeckite が他のパスを解決する基準となるディレクトリで、Application root や content root があります。
- [Localization](./localization.ja.md) — 1 つのサイトで複数の言語のコンテンツを配信できるようにする l10n Plugin です。
- [Translation](./translation.ja.md) — 同じコンテンツの言語違いを結び付ける対応で、frontmatter で設定します。
- [Hreflang](./hreflang.ja.md) — あるページの言語違いの URL を検索エンジンに伝える link メタデータです。
- [Feed](./feed.ja.md) — 公開されたコンテンツを機械可読に並べたもので、RSS、Atom、JSON Feed などがあります。
- [Deployment](./deployment.ja.md) — Build 済みのサイトを配信先へ配置する段階です。
