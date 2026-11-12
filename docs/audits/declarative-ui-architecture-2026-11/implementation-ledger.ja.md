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
| ステータス | VERIFYING |
| 実装対象 | `createClientEntry` の第7引数 `presenceSelector`、`scripts/check_client_entry_presence.mjs`、`pnpm check:client-entries` |
| 解決する制約 | 32件中23件のClient EntryがpresenceSelectorを持たず、UIが存在しないページでもモジュールを読み込んでいた |
| 影響パッケージ | `packages/plugins/*`（19プラグイン）、`scripts/`、`packages/integrations/honox`（既存の条件付きマウントを使用） |
| API変更 | なし（既存の第7引数を必須化） |
| テスト | `check:client-entries` の静的検査、実ブラウザでのチャンク読み込み検証（未完了） |
| 性能への影響 | UI非存在ページで該当プラグインのclient chunkを読み込まない |
| コミット | 未 |
| 完了状況 | 19プラグインにselectorを追加。全selectorがサーバー側のマーカーと一致することを静的確認済み |
| 残存する問題 | Entry単位のブラウザ回帰テストと変更前後のJS転送量比較が未完了 |

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
| ステータス | VERIFYING |
| 実装対象 | `PluginComponentResolveContext` と `resolveProps`（起点ブランチで追加済み）、`image-compare` の参照実装 |
| 解決する制約 | Componentの `render` がアセットURL確定前に実行され、非同期のprops解決ができない |
| 影響パッケージ | `packages/core`、`packages/plugins/image-compare` |
| API変更 | `resolveProps(props, context)`（`context.sourceSlug`、`context.resolveAssetUrl`）。解決後のpropsをSSRとHydrationで共有し、JSON-safeにシリアライズする |
| テスト | `packages/core/test/plugin_component.test.ts`、`packages/plugins/image-compare/test/*` |
| 性能への影響 | サーバー描画専用モジュールとクライアントモジュールを分離し、client chunkからサーバー用render chunkを除外 |
| コミット | 未 |
| 完了状況 | image-compareをPlugin Componentへ移行。SSR HTML、ポインター/range/キーボード/ARIA、縦横、SPA unmount/remountを維持 |
| 残存する問題 | 実ブラウザでのHydration検証が未完了 |

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
| ステータス | VERIFYING |
| 実装対象 | `@riebeckite/diagram/client` の `renderPendingDiagrams`、`mermaid`、`graphviz`、`chartjs` |
| 解決する制約 | 外部レンダラーごとに初期化・中断・破棄・エラー処理が重複し、SPA遷移時の後始末が不統一 |
| 影響パッケージ | `packages/diagram`、`packages/plugins/mermaid`、`packages/plugins/graphviz`、`packages/plugins/chartjs` |
| API変更 | `DiagramClientContext.selector`、`DiagramClientRenderer` の戻り値に `void` を許容、`DiagramPluginDefinition.client.presenceSelector` を必須化 |
| テスト | `packages/plugins/mermaid`（17）、`packages/diagram`（8）。`chartjs` と `graphviz` はパッケージテストなし |
| 性能への影響 | ライブラリ単位のチャンクを維持。非存在ページでは読み込まない（presenceSelector） |
| コミット | 未 |
| 完了状況 | mermaidを共通ラッパーへ移行。graphvizのroot/signal伝播を修正。chartjsのpresenceSelectorを追加 |
| 残存する問題 | 実ブラウザでのSPA遷移・unmount時破棄の検証が未完了 |

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
| ステータス | SKIPPED_WITH_REASON |
| 実装対象 | なし（PoCを削除） |
| 解決する制約 | Markdown ASTの任意ノードをComponentとして扱い、childrenを渡す |
| 影響パッケージ | `packages/core`（公開APIを追加しない） |
| API変更 | なし |
| テスト | なし |
| 性能への影響 | なし |
| コミット | 未 |
| 完了状況 | 監査とPoCを実施し、公開APIを追加しない判断をした |
| 残存する問題 | なし |

### 判断理由

- 代表例のCode Tabsは「連続する兄弟コードブロックのグループ化」であり、単一ノードを置換するHAST Component APIでは表現できない
- PoCの実装では `client` フィールドがHydration属性として出力されず、propsのシリアライズもなかった。公開APIとして未完成
- 実際のプラグインで利用者が存在せず、汎用APIの価値を証明できなかった
- 現行のCode TabsはSSR HTML + 軽量Behaviorで性能・保守性ともに優位であり、JSX化する理由がない

そのため、未証明の `hastComponents` 公開面を削除し、設計案とPoCの結果のみを記録する。サニタイズ境界（rehypeSanitize以降）とDOM後処理を避ける方針は維持する。

---

## Phase 4 — App Slots / Overlay Ownership

| 項目 | 内容 |
| --- | --- |
| ステータス | VERIFYING |
| 実装対象 | `@riebeckite/ui/overlay` の `OverlayHost` / `findOverlayHost`、lightbox、text-fragment |
| 解決する制約 | オーバーレイが `document.body` へ直接追加され、所有権・フォーカス・後始末が不明確 |
| 影響パッケージ | `packages/ui`、`packages/plugins/lightbox`、`packages/plugins/text-fragment`、`website/app/routes/_renderer.tsx` |
| API変更 | `OVERLAY_HOST_ATTRIBUTE`、`OverlayHost`、`findOverlayHost` |
| テスト | `packages/ui/test/overlay.test.tsx`（12）、`packages/plugins/lightbox`（6） |
| 性能への影響 | Overlay HostはSSRで空コンテナを出力するのみ |
| コミット | 未 |
| 完了状況 | 2プラグインがアプリ側のHostを利用。Hostがない場合は従来どおり自前Hostへフォールバック |
| 残存する問題 | 複数プラグイン同時表示時のフォーカス復元・スクロールロックのブラウザ検証が未完了 |

### 判断

- 新しいslot契約は追加しない。`head` / `bodyStart` / `articleAfter` は既存のHonoXレイアウトで足りている
- オーバーレイは `OverlayHost` の名前付きコンテナで所有権を明示する
- lightboxは自前Hostを作った場合のみ削除し、アプリ所有のHostは残す
- 抽象化のための抽象化を避けるため、利用プラグインが2つに限定される間はこの契約以上に広げない

---

## Phase 5 — Integration & Regression

| 項目 | 内容 |
| --- | --- |
| ステータス | PLANNED |
| 実装対象 | TypeScript、Biome、Core/Plugin/HonoXテスト、SPAブラウザテスト、Scaffold golden、外部Scaffold E2E、配布tarball install |
| 解決する制約 | 変更横断の回帰確認 |
| 影響パッケージ | リポジトリ全体 |
| API変更 | なし |
| テスト | 下記ゲートを実行し、結果を記録する |
| 性能への影響 | 変更前後のバンドルサイズを比較する |
| コミット | 未 |
| 完了状況 | 未着手 |
| 残存する問題 | 既知の外部SSG `TypeError: Cannot convert object to primitive value` とExcalidrawの非公開アセット起因の失敗を切り分ける |

---

## Phase 6 — Documentation

| 項目 | 内容 |
| --- | --- |
| ステータス | PLANNED |
| 実装対象 | `docs/docs/reference/plugin-api/ui-and-assets.md` と日本語版 |
| 解決する制約 | 実装と公開ドキュメントの不一致 |
| 影響パッケージ | `docs` |
| API変更 | なし |
| テスト | `pnpm check:docs`、`pnpm test:docs` |
| 性能への影響 | なし |
| コミット | 未 |
| 完了状況 | 未着手 |
| 残存する問題 | PoCのみのAPIを公開APIとして記載しない |

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
