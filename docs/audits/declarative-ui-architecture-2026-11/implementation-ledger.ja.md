# 宣言的UIアーキテクチャ 実装台帳

- 開始日: 2026-11-12
- ブランチ: `feat/declarative-ui-completion`
- 起点: `feat/declarative-ui-architecture-phase0-4` (`d55c0e12`)
- worktree: `C:/Users/rerur/.wk/program/riebeckite-declarative-ui-completion`
- 目的: Plugin APIの制約を解消し、通常の対話UI・AST由来UI・データ依存UI・外部レンダラーUIを宣言的に実装できる状態にする
- 参照: `docs/audits/declarative-ui-architecture-2026-11/report.md`（監査ブランチ）、`docs/audits/declarative-ui-migration-2026-11/plan.md`、`tests/declarative-ui-poc/`
- 禁止: mainへのmerge、push、PR作成、deploy、`reset --hard`、未コミット変更の破棄、既存worktreeの破壊

この台帳はセッションの圧縮・中断後もGit履歴とあわせて再開できるようにする。監査資料とコードが矛盾する場合はコードを優先する。

## ステータス

`PLANNED` / `INVESTIGATING` / `IMPLEMENTING` / `VERIFYING` / `COMPLETE` / `SKIPPED_WITH_REASON` / `BLOCKED`

## 全体方針

- JSXが適切なUI（対話状態を持つ小さなUI、外部レンダラーのlifecycle管理）にJSXを使う
- SSR HTML + 軽量Behaviorが適切なUI（コードブロック、図、ナビゲーション）はSSRを維持する
- 外部ライブラリ内部のCanvas/SVG/DOM描画は置き換えない
- ブラウザ副作用（ポインター、計測、スクロール、フォーカス、fetch）は描画責務から分離する
- 新しい独自UIランタイムを追加しない
- 単純なUIにJSXランタイムを読み込ませない（presenceSelectorとチャンク分割で担保する）

---

## Phase 0 — Presence Selector最適化

| 項目 | 内容 |
| --- | --- |
| ステータス | COMPLETE |
| 実装対象 | `createClientEntry` の第7引数 `presenceSelector`、`scripts/check_client_entry_presence.mjs`、`pnpm check:client-entries` |
| 解決する制約 | 32件中23件のClient EntryがpresenceSelectorを持たず、UIが存在しないページでもモジュールを読み込んでいた |
| 影響パッケージ | `packages/plugins/*`（19プラグイン）、`scripts/`、`packages/integrations/honox`（既存の条件付きマウントを使用） |
| API変更 | なし（既存の第7引数を必須化） |
| テスト | `check:client-entries` の静的検査（selectorがリテラルで、pluginソース内に対応するマーカーがあること）、`tests/interactive-runtime/official.test.ts` の実ブラウザ検証（計算機ページでchartjs/mermaid/image-compareのチャンクを読み込まないこと、chartjsページで読み込むこと） |
| 性能への影響 | UI非存在ページで該当プラグインのclient chunkを読み込まない |
| コミット | `851abd48` |
| 完了状況 | 19プラグインにselectorを追加。全selectorがサーバー側のマーカーと一致することを静的・実ブラウザで確認済み |
| 残存する問題 | `docs` のselectorはこのwebsiteでは描画されない（websiteは独自レイアウトを使うため）。プラグイン単体のレンダラーはマーカーを出力する。Entry単位のJS転送量は共有チャンクが支配的で、個別比較は行っていない |

### 適用したselectorとマーカー

| プラグイン | selector | マーカー生成箇所 |
| --- | --- | --- |
| `autocardlink` | `.rr-cardlink` | remark |
| `canvas` | `[data-canvas]` | `src/render.ts` |
| `code-enhance` | `.rr-code, [data-code-copy]` | `copy_component` / rehype |
| `code-tabs` | `[data-code-tabs=true]` | `src/rehype.ts` |
| `d2` | `[data-d2=pending]` | rehype |
| `docs` | `[data-docs-sidebar]` | `src/render.ts` |
| `excalibrain` | `[data-excalibrain]` | `src/render.ts` |
| `graphviz` | `[data-graphviz=pending]` | rehype |
| `hover-preview` | `script[data-rb-hover-preview]` | `src/render.ts` |
| `map` | `[data-rr-map=pending]` | rehype |
| `markmap` | `[data-markmap=pending]` | rehype |
| `marp` | `figure[data-marp]` | `src/render.ts` |
| `mermaid` | `[data-mermaid=pending]` | rehype |
| `navigation` | `[data-sidebar-navigation]` | layout |
| `share` | `[data-rr-share]` | `share-controls.tsx` |
| `source-files` | `[data-source-file]` | page renderer |
| `toc` | `[data-toc-target]` | layout |
| `vega-lite` | `[data-vega-lite]` | rehype |
| `wavedrom` | `[data-wavedrom=pending]` | rehype |

### 適用しなかったEntry（サイト全体機能）

`analytics`、`color-mode`、`text-fragment`、`ux` はUIの有無に関係なく初期化が必要なため、presenceSelectorを持たない。検査スクリプトの許可リストに明示している。

### 判断

- ページロード後に生成されるUIでも、SSR時にマーカーが存在するものはselectorを適用した
- マーカーがクライアント生成に依存するEntryは追加しない（該当なし。`canvas` もSSR時に `[data-canvas]` を出力する）
- selectorはDOMの存在のみを条件とする。サイト全体機能は従来どおり無条件に初期化する

---

## Phase 1 — Resolved Plugin Component Props

| 項目 | 内容 |
| --- | --- |
| ステータス | COMPLETE |
| 実装対象 | `PluginComponentResolveContext` と `resolveProps`（起点ブランチで追加済み）、`image-compare` の参照実装 |
| 解決する制約 | Componentの `render` がアセットURL確定前に実行され、非同期のprops解決ができない |
| 影響パッケージ | `packages/core`、`packages/plugins/image-compare` |
| API変更 | `resolveProps(props, context)`（`context.sourceSlug`、`context.resolveAssetUrl`、`manifest`、`diagnostics`）、`deferUntilManifest`、`renderError`。解決後のpropsをSSRとHydrationで共有し、JSON-safeにシリアライズする |
| テスト | `packages/core/test/plugin_component.test.ts`（2）、`packages/plugins/image-compare/test/*`（14）、`tests/interactive-runtime/official.test.ts` のHydration・SPA検証 |
| 性能への影響 | サーバー描画専用モジュールとクライアントモジュールを分離し、client chunkからサーバー用render chunkを除外 |
| コミット | `5a08dd5e`、mainの統合コミット`8698fcd4` |
| 完了状況 | main側の実装（manifest後の`deferUntilManifest`と`diagnostics`、`renderError`、SSR+軽量Behavior）を採用。image-compareはPlugin Componentとして描画され、資産URLはmanifest確定後に解決される。実ブラウザでrange操作と戻る/進む後の再初期化を確認 |
| 残存する問題 | なし |

### 設計

- `resolveProps` は描画前の非同期境界として1回だけ実行する
- アセットURLは `context.resolveAssetUrl` で解決する。文字列キーの宣言ではなく、パイプラインが提供する解決関数を使う
- 解決済みpropsは `data-riebeckite-component-props` にJSONで埋め込み、SSRとHydrationが同じ値を使う
- 依存関係はMarkdown本文と出力HTMLの内容ハッシュに含まれる。外部のマニフェスト値を参照する場合は、その値を出力に含めた時点でfingerprintの対象になる
- 診断は描画済みHTMLの `data-image-compare-error` マーカーから導出する。パイプラインには現状component解決時の診断シンクがないため、processed content cacheのヒット時も診断が失われない

### image-compareの移行結果

- 入力構文は従来どおり ```` ```image-compare ````。remarkが `riebeckite-component` + `ImageCompare` に正規化する
- SSR: `figure.rr-image-compare`、静的フォールバック、Before/Afterレイヤー、range input、divider
- 宣言的状態: 比較位置は `useState` で保持し、CSSカスタムプロパティへ反映する
- 命令的に残した処理: ポインターキャプチャ、`getBoundingClientRect` による座標計測、range inputとの同期、フォーカス
- エラー: `rr-image-compare--error` と `role=status`、`data-image-compare-error` マーカー

---

## Phase 2 — External Renderer Declarative Wrapper

| 項目 | 内容 |
| --- | --- |
| ステータス | COMPLETE |
| 実装対象 | `@riebeckite/diagram/client` の `renderPendingDiagrams`、`mermaid`、`graphviz`、`chartjs` |
| 解決する制約 | 外部レンダラーごとに初期化・中断・破棄・エラー処理が重複し、SPA遷移時の後始末が不統一 |
| 影響パッケージ | `packages/diagram`、`packages/plugins/mermaid`、`packages/plugins/graphviz`、`packages/plugins/chartjs` |
| API変更 | `DiagramClientContext.selector` と `fallbackSelector`、`DiagramPluginDefinition.client.presenceSelector` を必須化 |
| テスト | `packages/plugins/mermaid`（17）、`packages/diagram`（8）。`chartjs` と `graphviz` はパッケージテストなし |
| 性能への影響 | ライブラリ単位のチャンクを維持。非存在ページでは読み込まない（presenceSelector） |
| コミット | `44342725`、mainの統合コミット`8698fcd4` |
| 完了状況 | main側の`fallbackSelector`対応を統合し、mermaid・graphviz・chartjsが共通ラッパーを使用。d2にもpresenceSelectorが入った。実ブラウザでchartjsのチャンクが対象ページのみ読み込まれることを確認 |
| 残存する問題 | `chartjs` と `graphviz` はパッケージテストを持たない。websiteはmermaid-peleを使うため、実ページでのmermaidクライアント差し替えはパッケージテストと共通ラッパーの単体テストで担保している |

### 共通化の範囲

- loading / ready / error は `data-diagram-status` と `aria-busy`、`[data-diagram-fallback]` で管理する
- 初期化はコンポーネント（figure）単位。`renderPendingDiagrams` が返すcleanupをlifecycleが呼ぶ
- `signal` で中断し、`isConnected` でSPA遷移後のDOMを除外する
- 外部ライブラリのSVG/Canvas描画は置き換えない
- mermaid固有のCDNローダーとテーマ選択は維持する（バンドルに含めない）

### 適用しなかった外部レンダラー

`d2`、`wavedrom`、`vega-lite`、`markmap`、`map`、`excalibrain` は、独自の `data-<kind>` 状態属性・レイアウト・破棄処理を持ち、共通化にはマークアップ変更が必要になる。Mermaid/Chart.jsで効果を確認できたため、無理な統一はしない。必要になった時点で `renderPendingDiagrams` のselector指定で移行できる。

---

## Phase 3 — HAST Component / Children API

| 項目 | 内容 |
| --- | --- |
| ステータス | COMPLETE |
| 実装対象 | `hastComponents` / `defineHastComponent`、`PluginHastNode`、`code-tabs` のHASTコンポーネント |
| 解決する制約 | Markdown ASTの任意ノードをComponentとして扱い、childrenを渡す |
| 影響パッケージ | `packages/core`、`packages/plugins/code-tabs` |
| API変更 | `hastComponents`、`defineHastComponent`、`PluginHastComponent`（`match` と `render({ node, html, children })`） |
| テスト | `packages/core/test/plugin_component.test.ts`、`packages/plugins/code-tabs/test/*` |
| 性能への影響 | サニタイズ済みHTMLの置換のみ。Code Tabsの軽量Behaviorは維持 |
| コミット | `77d76999`（削除）、mainの統合コミット`8698fcd4`で実装を取り込み |
| 完了状況 | main側の実装を統合。rehypeがグループ化した `.rr-code-tabs` をHASTコンポーネントが受け取り、サニタイズ済みのchildrenをJSXで描画する |
| 残存する問題 | なし |

### 判断理由

- 起点ブランチでは単一ノードの `match` だけではCode Tabsの兄弟グループ化を表現できず、`client` も出力されないPoCだったため公開APIを取り下げた
- main側では、rehypeが生成したグループ要素をHASTコンポーネントで置換し、サニタイズ済みの `html` と `children` を受け取る形で実装された。サニタイザー境界を越えずに文書構造をコンポーネント化でき、Code Tabsが実際の利用例になっている
- そのためPhase 3はSKIPPEDではなくCOMPLETEとし、公開APIとして文書化する（HASTはサニタイズ後の信頼済みノードのみを扱う）

---

## Phase 4 — App Slots / Overlay Ownership

| 項目 | 内容 |
| --- | --- |
| ステータス | COMPLETE |
| 実装対象 | `@riebeckite/ui/overlay` の `OverlayHost` / `findOverlayHost`、lightbox、text-fragment |
| 解決する制約 | オーバーレイが `document.body` へ直接追加され、所有権・フォーカス・後始末が不明確 |
| 影響パッケージ | `packages/ui`、`packages/plugins/lightbox`、`packages/plugins/text-fragment`、`website/app/routes/_renderer.tsx` |
| API変更 | `OVERLAY_HOST_ATTRIBUTE`、`OverlayHost`、`findOverlayHost`、`APP_SLOT_ATTRIBUTE`、`AppSlot`、`findAppSlot` |
| テスト | `packages/ui/test/overlay.test.tsx`（12）、`packages/plugins/lightbox`（6） |
| 性能への影響 | Overlay HostはSSRで空コンテナを出力するのみ |
| コミット | `82aaa694`、AppSlot契約はmainの`8698fcd4`で追加 |
| 完了状況 | 2プラグインがアプリ側のHostを利用。Hostがない場合は従来どおり自前Hostへフォールバック。lightboxのフォーカス復元とEscでのcloseを実ブラウザで確認 |
| 残存する問題 | 複数プラグインが同時にオーバーレイを開く状況は現在のユースケースにないため、同時表示時のフォーカス復元・スクロールロックは未検証 |

### 判断

- 新しいslot契約は追加しない。`head` / `bodyStart` / `articleAfter` は既存のHonoXレイアウトで足りている
- オーバーレイは `OverlayHost` の名前付きコンテナで所有権を明示する
- lightboxは自前Hostを作った場合のみ削除し、アプリ所有のHostは残す
- 抽象化のための抽象化を避けるため、利用プラグインが2つに限定される間はこの契約以上に広げない

---

## Phase 5 — Integration & Regression

| 項目 | 内容 |
| --- | --- |
| ステータス | COMPLETE |
| 実装対象 | TypeScript、Biome、Core/Plugin/HonoXテスト、SPAブラウザテスト、Scaffold golden、外部Scaffold E2E、配布tarball install |
| 解決する制約 | 変更横断の回帰確認 |
| 影響パッケージ | リポジトリ全体 |
| API変更 | なし |
| テスト | 下記ゲートを実行し、結果を記録する |
| 性能への影響 | 変更前後のバンドルサイズを比較する |
| コミット | 本書を含むドキュメントコミット |
| 完了状況 | 全ゲートPASS。外部Scaffold E2Eと配布tarball経由のHonoXテストもPASS |
| 残存する問題 | 既知の外部SSG `TypeError: Cannot convert object to primitive value` とExcalidrawの非公開アセット起因の失敗は今回再現しなかった |

### Phase 5 ゲート結果

| ゲート | 結果 |
| --- | --- |
| `pnpm build:packages` | PASS |
| `pnpm typecheck` | PASS（3 projects） |
| `pnpm check`（Biome） | PASS |
| `pnpm check:client-entries` | PASS |
| `pnpm --filter @riebeckite/core test` | 563 pass |
| `pnpm --filter @riebeckite/honox test` | 224 pass |
| `@riebeckite/plugin-image-compare` | 14 pass |
| `@riebeckite/plugin-mermaid` | 17 pass |
| `@riebeckite/diagram` | 8 pass |
| `@riebeckite/ui` | 12 pass |
| `@riebeckite/plugin-lightbox` | 6 pass |
| `pnpm test:runtime:site` | 10 pass（calculator、SPA unmount/remount、lightbox、text-fragment、chartjsチャンク、image-compare hydration、Excalidraw、flashcards、JSなし表示） |
| `pnpm check:docs` / `pnpm test:docs` | PASS（19） |
| `pnpm check:changes` / `pnpm test:changelog` | PASS（13 / 9） |
| `pnpm check:packages` / `check:dependencies` / `check:cycles` | PASS（117 / 117 acyclic） |
| `pnpm check:double-cast` | PASS（0 allowlist） |
| `pnpm check:source-health` / `check:templates` | PASS（warningのみ） |
| `pnpm check:scaffold` | PASS |
| `pnpm test:security` | PASS |
| `pnpm check:build-packages` | PASS |
| `pnpm check:ci-selection` / `check:ci-browsers` / `check:ci-build-artifact` | PASS |
| `pnpm test:e2e:external` | PASS（公開物からの外部サイト構築、ScaffoldコンポーネントHydration、MDXインクリメンタル再構築。既知の `TypeError` は再現せず） |
| `pnpm test:registry` | PASS（224 tests。公開tarball経由のHonoXテストを含む） |

---

## Phase 6 — Documentation

| 項目 | 内容 |
| --- | --- |
| ステータス | COMPLETE |
| 実装対象 | `docs/docs/reference/plugin-api/ui-and-assets.md` と日本語版 |
| 解決する制約 | 実装と公開ドキュメントの不一致 |
| 影響パッケージ | `docs` |
| API変更 | なし |
| テスト | `pnpm check:docs`、`pnpm test:docs` |
| 性能への影響 | なし |
| コミット | 本書を含むドキュメントコミット |
| 完了状況 | `ui-and-assets` のEN/JAに、解決失敗時の診断、JSXとSSRの使い分け、外部レンダラー統合、presenceSelectorとClientLifecycleの条件を追記した |
| 残存する問題 | PoCのみのAPIを公開APIとして記載しない（HAST Component APIは非公開であることを明記） |

---

## 検証ログ

| 日付 | 対象 | 結果 |
| --- | --- | --- |
| 2026-11-12 | `@riebeckite/plugin-image-compare` tests | 14 pass |
| 2026-11-12 | `@riebeckite/plugin-mermaid` tests | 17 pass |
| 2026-11-12 | `@riebeckite/diagram` tests | 8 pass |
| 2026-11-12 | `packages/core/test/plugin_component.test.ts` | 2 pass |
| 2026-11-12 | `@riebeckite/ui` tests | 12 pass |
| 2026-11-12 | `@riebeckite/plugin-lightbox` tests | 6 pass |
| 2026-11-12 | `pnpm build:packages` | exit 0 |
| 2026-11-12 | `pnpm typecheck` | exit 0 |
| 2026-11-12 | `pnpm check` | exit 0 |
| 2026-11-12 | `pnpm --filter @riebeckite/core test` | 563 pass |
| 2026-11-12 | `pnpm --filter @riebeckite/honox test` | 224 pass |
| 2026-11-12 | `pnpm test:runtime:site` | 10 pass |
| 2026-11-12 | `pnpm check:docs` | PASS（1228ファイル） |
| 2026-11-12 | `pnpm test:docs` | 19 pass |
| 2026-11-12 | `pnpm check:double-cast` | PASS |
| 2026-11-12 | `pnpm check:packages` / `check:dependencies` / `check:cycles` | PASS |
| 2026-11-12 | `pnpm check:scaffold` / `test:security` / `check:build-packages` | PASS |
| 2026-11-12 | `pnpm check:ci-selection` / `check:ci-browsers` / `check:ci-build-artifact` | PASS |
| 2026-11-13 | 画像比較クライアントチャンク | 2,140 B（旧2,410 B + サーバー用render 20,193 B） |
| 2026-11-13 | `pnpm test:e2e:external` | PASS（配布物、ScaffoldコンポーネントHydration、MDX増分ビルド） |
| 2026-11-13 | `pnpm test:registry` | 224 pass（配布tarball経由のHonoXテスト） |
| 2026-11-13 | `pnpm --filter @riebeckite/web build` | exit 0（1048ページ） |
| 2026-11-13 | `pnpm test:runtime:site`（最終ビルド） | 10 pass |
