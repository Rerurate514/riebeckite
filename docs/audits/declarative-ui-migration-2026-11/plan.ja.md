# 宣言的UI移行台帳

- 開始日: 2026-11-12
- ブランチ: `feat/declarative-ui-migration`
- 起点コミット: `5c7d41fc` (`feat/mdx-plugin` のマージ。`810acafd` を含む)
- worktree: `C:/Users/rerur/.wk/program/riebeckite-declarative-ui`
- 担当: オーケストレーションエージェント
- 対象: `packages/plugins/` (85プラグイン)。続いて `packages/ui`、`packages/runtime`、`packages/integrations/honox`、`packages/spa`、`packages/diagram`、Themes、公式Scaffold。

この台帳を、監査状況・判断・検証・次の作業のSource of Truthとする。監査、実装、検証のたびに更新する。

## ステータス

`NOT_AUDITED`、`AUDITED`、`MIGRATION_REQUIRED`、`IN_PROGRESS`、`IMPLEMENTED`、`VERIFIED`、`KEEP_IMPERATIVE`、`NOT_APPLICABLE`、`BLOCKED`、`UNVERIFIED`。

## 分類

- **A — 完全な宣言的移行**: JSXとコンポーネント状態がUIを自然に所有できる。
- **B — ハイブリッド移行**: UIはJSXへ移せるが、配置・ポインター・サイズ測定・フォーカス・fetch などのブラウザAPIは命令的に残る。
- **C — 命令的実装を維持**: JSX化が複雑性・コスト・性能を悪化させる、または操作が本質的に命令的である。
- **D — 対象外**: ビルド時のAST・データ・サーバー処理、またはクライアントDOMを所有しない既存の宣言的SSR。

## 監査方法

1. 全プラグインの契約 (`renderers`、`pageTypes`、`components`、`clientEntries`、`extendMarkdownPipeline`、`extendHtmlPipeline`) を棚卸しする。
2. テストとdist以外のソースでDOM APIの使用を数える (`querySelector`、`createElement`、`replaceChildren`、`innerHTML`、`addEventListener`、`MutationObserver`、`classList`、`setAttribute`、`textContent`、`dataset`、Canvas・SVG)。
3. 実質的なクライアントモジュールを読み、描画と状態の所有先を判定する。
4. ベースラインを測定し、移行後に再監査する。

## 分類一覧

### A — 完全な宣言的移行

| プラグイン | 状態 | 担当 | 理由 |
| --- | --- | --- | --- |
| `flashcards` | VERIFIED | primary | デッキUIをクライアントで全体構築しており (`createDeckUi`、`createElement` 7箇所)、状態機械 (`position`、`revealed`、`order`) が小さい。`FlashcardsDeck` がHono JSXの `useState` で直接所有し、クライアントはpayload解析とフォールバックだけを担う。 |

### B — ハイブリッド移行

| プラグイン | 状態 | 担当 | 宣言化する部分 | 命令的に残す部分 |
| --- | --- | --- | --- | --- |
| `search` | VERIFIED | primary | 検索結果リストの描画を `SearchResults` へ移行 | ダイアログ制御、キーボード操作、フォーカス、fetch、`AbortSignal` |
| `lightbox` | MIGRATION_REQUIRED | primary | ダイアログのマークアップと画像・キャプション・状態表示 | `<dialog>` 制御、フォーカストラップ、画像読み込みイベント |
| `text-fragment` | MIGRATION_REQUIRED | primary | ポップオーバーのマークアップと表示・ステータス状態 | 選択範囲の取得、範囲の座標計算、コピーのフォールバック |
| `code-enhance` | IMPLEMENTED | 既存作業 | `CodeCopy` は `useState` を使う宣言的Plugin Component | 折り返し・折りたたみはAST生成ブロック上に残る |
| `image-compare` | KEEP_IMPERATIVE | primary | — | ポインターキャプチャ、range入力、CSSカスタムプロパティ。マークアップはmanifest解決後に生成されるため、Plugin Componentが解決済みURLを受け取れない |
| `calculator` | KEEP_IMPERATIVE | primary | — | 分離されたruntimeが計算を所有済み。UIは静的SSRで、JSX状態に利点がない |
| `toc` | KEEP_IMPERATIVE | primary | SSRの `TableOfContents` JSX | スクロール追従と現在見出しの更新 |
| `color-mode` | KEEP_IMPERATIVE | primary | SSRのトグルコンポーネント | 属性・localStorage・`matchMedia` の同期 |
| `navigation` | KEEP_IMPERATIVE | primary | SSRの `SiteNav`・`SidebarNavigation` JSX | レスポンシブドロワーとフォーカス |
| `docs` | KEEP_IMPERATIVE | primary | SSRの `DocsSidebar` JSX | スクロールと現在セクションの強調 |
| `source-files` | KEEP_IMPERATIVE | primary | SSRページとrenderer | ファイルツリー操作 |
| `share` | KEEP_IMPERATIVE | primary | SSRの `ShareControls` JSX | `navigator.share`・クリップボード・フォーカス |
| `analytics` | KEEP_IMPERATIVE | primary | — | ページビュー記録のみでUIがない |
| `diff` | KEEP_IMPERATIVE | primary | Diff表示は既にHono JSX | 取得と履歴選択 |
| `garden-explorer` | KEEP_IMPERATIVE | primary | ページとクライアントが既にHono JSXをhydrate | hydrate済みページ上の検索・絞り込み |
| `local-graph` | KEEP_IMPERATIVE | primary | クライアントが既に `hydrateRoot` でHono JSXを使用 | SVGレイアウトと測定 |

### C — 命令的実装を維持

| プラグイン | 理由 |
| --- | --- |
| `code-tabs` | タブはMarkdown・HASTパイプラインが生成し、`@riebeckite/ui/tabs` で既にアクセシブル。JSX化はSSRマークアップを二重化し、状態を単純化せずhydrationずれの危険だけを増やす。 |
| `hover-preview` | プレビュー本体はテキスト2要素。コストの中心はfetch、hover・focusのスケジューリング、ビューポート配置。全ページにJSX runtimeを足すのは純増。 |
| `autocardlink` | カードはremarkプラグインがSSRし、クライアントは画像フォールバックとコピー表示だけを扱う。 |
| `ux` | 読書進捗と先頭へ戻るボタンはアニメーションフレームごとにCSS変数・クラスを更新する。直接更新が効率的で、要素自体も小さい。 |
| `canvas` | Canvasエディタが描画・選択・ポインター状態を所有する。 |
| `d2`、`graphviz`、`mermaid`、`wavedrom`、`vega-lite`、`markmap`、`chartjs` | 外部レンダラーがSVG・Canvas・DOMの出力とライフサイクルを所有する。 |
| `map` | MapLibreが地図Canvas、操作、DOMを所有する。 |
| `marp` | Marpがページタイプ内でスライド描画とナビゲーション状態を所有する。 |
| `meta-bind` | 入力とバインディングをその場で拡張する。DOM契約そのものが機能。 |
| `excalibrain` | SVGグラフのレイアウトと操作。 |

### D — 対象外 (クライアントDOMを所有しない)

`alias`、`archive`、`article-metadata`、`attachment`、`backlinks`、`bases`、`breadcrumbs`、`changelog`、`citations`、`code-annotations`、`daily-notes`、`dataview`、`deploy`、`diagnostics`、`discord-embed`、`excalidraw`、`folder-pages`、`frontmatter-transformer`、`gallery`、`glossary`、`hard-breaks`、`highlight`、`icons`、`image-optimizer`、`kanban`、`l10n`、`media`、`mermaid-pele`、`mdx`、`obsidian-markdown`、`og-image`、`pdf`、`permalink`、`plantuml`、`properties`、`qr-code`、`quality`、`query`、`recent-posts`、`related-posts`、`rename`、`responsive-image`、`rich-embed`、`seo`、`series`、`shortcodes`、`sidenotes`、`svg-optimizer`、`taxonomy`、`timeline`、`vault-heatmap`、`webmention`。

## 移行キュー

| 順序 | プラグイン | 分類 | 作業 | 状態 | テスト |
| --- | --- | --- | --- | --- | --- |
| 1 | `flashcards` | A | デッキ描画を `useState` 付きHono JSXコンポーネントへ移す。payload解析とフォールバックは維持 | VERIFIED | `pnpm --filter @riebeckite/plugin-flashcards test` (2/2)、`tests/interactive-runtime/official.test.ts` のflashcards・SPAケースがPASS |
| 2 | `search` | B | 結果をJSXコンポーネントで描画。ダイアログ・キーボード・fetchは維持 | VERIFIED | `pnpm --filter @riebeckite/plugin-search test` (31/31)、`test:browser` (18/18) |
| 3 | `lightbox` | B | ダイアログのマークアップをJSXで描画。ダイアログ制御は維持 | VERIFIED | `pnpm --filter @riebeckite/plugin-lightbox test` (6/6)、`tests/interactive-runtime/official.test.ts` のlightboxケースがPASS |
| 4 | `text-fragment` | B | ポップオーバーをJSXで描画。選択・配置ロジックは維持 | MIGRATION_REQUIRED | クライアントテスト |
| 5 | 再監査 | — | 全プラグインと依存パッケージを再走査 | PENDING | 静的監査 |

## ベースライン

| 項目 | 移行前 | 移行後 |
| --- | --- | --- |
| `flashcards` パッケージのクライアント (`dist/client.js`、非minify) | 6,126 B | 6,440 B (+314 B) |
| Webサイトのflashcardsクライアントチャンク | 全ページで読み込み (`client-Dbl1HkEF.js`、125,439 B) | 遅延チャンク (`client-DySzhhlf.js`、2,959 B) と、Plugin Componentが既に使う共有JSXクライアントruntime |
| `flashcards` ソース内のDOM構築 | デッキを組み立てる `createElement` 7箇所 | 0。JSXがマークアップと状態を所有 |
| `search` パッケージのクライアント (`dist/client.js`、非minify) | 13,284 B | 13,577 B (+293 B) |
| Webサイトのsearchクライアントチャンク | 共有チャンク (`client-Dbl1HkEF.js`、125,439 B) に含まれ全ページで読み込み | 検索ページ用チャンク (`client-D9tNpf5I.js`、6,565 B)。presence selectorで制限 |
| `search` クライアントのDOM構築 | `createElement` などの呼び出し27箇所 | 0。`SearchResults` が項目を描画 |
| 対話的Plugin Componentのhydration | runtime entryがあるサイトで失敗 (`runtimeIds` 引数の欠落) | 修正済み。生成クライアントの回帰テストで保証 |
| `lightbox` パッケージのクライアント (`dist/client.js`、非minify) | 5,326 B | 5,600 B (+274 B) |
| `lightbox` のダイアログ構築 | `dialog.ts` の `createElement` 7箇所 | ホスト要素の `createElement` 1箇所。残りは `LightboxDialog` がHono JSXで描画 |
| Webサイトのlightboxクライアントチャンク | 共有チャンク (`client-Dbl1HkEF.js`、125,439 B) に含まれ全ページで読み込み | `[data-lightbox-src]` のpresence selectorで制限。`client-sw_U6mX4.js` (2,921 B) |

`flashcards` のマークアップは `FlashcardsDeck` でサーバー描画できるが、既存の `flashcards` フェンスはpayloadを描画してクライアントでhydrateするため、コンテンツ移行は不要。

## 発見とリスク

- 既存の宣言的UI監査はなく、`definePluginComponent` を使うのは `code-enhance` だけ。
- Plugin Componentは `riebeckite-component` フェンスとYAML propsから登録される。既存のMarkdown構文 (`flashcards` フェンスなど) をコンテンツを壊さずにこのレジストリへ移せないため、互換性のある経路はクライアント側のJSX描画である。
- `presenceSelector` のない `clientEntries` は全ページでモジュールをimportする。新しい任意ウィジェットはセレクタで読み込みを制限する。
- Hono JSXはbooleanの `true` を空属性として描画し、`false` を省略する。`aria-pressed` などのARIA状態属性は明示的な文字列にする。
- 生成クライアントはPlugin Componentの `mountPluginClientInitializer` に `runtimeIds` 引数を渡していなかった。runtime entryを持つサイトでは、すべての対話的コンポーネントのhydrationが失敗していた。`packages/integrations/honox/src/client_module.ts` で修正し、回帰テストを追加した。
- `the excalidraw figure renders to SVG in the browser` は、`docs/assets/HW.md` がprivateで `/assets/HW` ページが生成されないため失敗する。基点のチェックアウトでも同じ失敗を再現しており、この移行とは無関係。
- `search` の選択状態はpropsで `aria-selected` を再描画し、選択項目の可視化は描画後の `scrollIntoView` に残した。フォーカスとキーボード処理は従来どおり命令的。
- 検索結果のアイコンは従来もサニタイズ済みHTMLを `innerHTML` で挿入していた。`SearchResults` は同じ信頼境界を `dangerouslySetInnerHTML` で維持する。
- lightboxのダイアログは `createRoot` でホスト要素へ描画し、そのホストを `document.body` へ追加する。ネイティブ `<dialog>` の制御、フォーカストラップ、画像のload/errorイベントは命令的に残す。ブラウザテストのクリックは、トリガーのリンク遷移を防ぐためcancelableにする必要がある。
- docsは英語・日本語の対と `docs/README.md` からの到達性を要求する。この台帳には日本語版とREADMEリンクを用意する。

## 次の作業

`text-fragment` を移行する。ポップオーバーのマークアップと操作・ステータス表示をHono JSXコンポーネントで描画し、選択範囲の取得、範囲の座標計算、コピーのタイマー、対象外要素の判定、イベントの解除は命令的に維持する。
