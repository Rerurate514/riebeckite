# 宣言的UIアーキテクチャ実装監査

- 日付: 2026-11-13
- ブランチ: `feat/declarative-ui-architecture-phase0-4`
- 基点: `3e3a9b5a`（移行ブランチ + main `4977e308`）。最新mainは `d92a2f93`（`1b1ffbba`）として統合済み
- 対象: 全85プラグイン、`packages/core`、`packages/integrations/honox`、`packages/ui`、`packages/diagram`、`packages/runtime`、`packages/spa`、テーマ、Scaffold
- 参照: [宣言的UI移行台帳](../declarative-ui-migration-2026-11/plan.ja.md)

## 判定

| フェーズ | 状態 | 根拠 |
| --- | --- | --- |
| Phase 0: 読み込み条件 | PASS | 19のクライアントエントリへselectorを追加。グローバル4件は許可リスト化。`pnpm check:client-entries` がPASS |
| Phase 1: コンポーネントprops解決 | PASS | `deferUntilManifest` がmanifestフック後にpropsを確定し、manifestとdiagnosticsを渡す。`image-compare` はdeferred component化 |
| Phase 2: HASTコンポーネント | PASS | `code-tabs` が `CodeTabsGroup` でタブ構造を描画し、公式ブラウザテストで操作を確認 |
| Phase 3: アプリ配置 | PASS | `AppSlot` が `head`、`bodyStart`、`articleAfter`、`app` を提供。ウェブサイトは `bodyStart` を使い、既存ライフサイクルが1ページ1マウントを保証 |
| Phase 4: 外部レンダラー共通化 | PASS | 全外部レンダラーが `renderPendingDiagrams` を使う。MermaidのブラウザテストもPASS |

完全宣言化すべきプラグインの見落としはない。移行台帳は1 A、17 B、15 C、52 Dになった。`image-compare` はVERIFIEDのBへ、`code-tabs` はCからBへ移動した。

## Phase 0

- `scripts/check_client_entry_presence.mjs` がプラグインの `index.ts` をTypeScript ASTで解析し、7番目の `presenceSelector` を必須にする。
- selectorを持たないのは `analytics`、`color-mode`、`text-fragment`、`ux` の4件で、いずれも意図的にグローバル。`text-fragment` は全記事の選択範囲を監視する必要があり、`color-mode` と `ux` はページ全体の効果、`analytics` は対話UIを持たない。
- `pnpm check:client-entries` で検査できる。

## Phase 1

- `PluginMarkdownComponent` は `resolveProps(props, { sourceSlug, resolveAssetUrl, manifest, diagnostics })` を受け取れる。
- `deferUntilManifest` はMarkdown処理時点では描画せず、base64でエンコードしたdeferredマーカーを出す。HTML属性エスケープでJSONが変形しないようにしている。
- `finalizeDeferredPluginComponents` がmanifestフック後、`synchronizeHtml` 前にマーカーを解決し、コンポーネントを描画する。
- コンポーネントが失敗した場合は `renderError` を使う。`image-compare` はアクセシブルなエラーブロックと `image-compare-invalid` 診断を維持する。
- `image-compare` はdeferred `ImageCompare` コンポーネントに移行し、`onManifestCreated` のプレースホルダー置換を廃止した。range/pointer制御は残す。
- coreテストでmanifestコンテキスト、diagnostics、deferred描画を確認する。image-compareのmanifestテストもPASSする。

## Phase 2

- `packages/core/src/plugin_component_hast.ts` が `hastComponents` と `defineHastComponent` を提供する。
- HASTコンポーネントはサニタイザーとプラグインRehypeプラグインの後に実行され、生成済みUIをサニタイズ済みノードとして扱える。
- `code-tabs` は `CodeTabs` を登録し、タブリスト、パネル、ARIA、ラベルを `CodeTabsGroup` とHono JSXで描画する。Rehypeはコードブロックのグループ化とデータ提供だけを担当する。
- パッケージテストで2つのタブ付きフェンスから描画構造とコード内容を確認する。公式ブラウザテストでタブ切替とパネル表示を確認する。

## Phase 3

- `packages/ui/src/overlay/index.tsx` が `OverlayHost`、`findOverlayHost`、`AppSlot`、`findAppSlot` を提供する。
- `AppSlot` は `head`、`bodyStart`、`articleAfter`、`app` と任意のセマンティック要素を扱う。
- ウェブサイトはtext-fragmentオーバーレイを `bodyStart` スロットで包む。既存の `ClientLifecycle` がページ・名前・rootごとに1マウントを保証し、UIテストがSPAのスクロール復元、フォーカス、dialog、drawerを確認する。
- text-fragmentクライアントはアプリ所有のホストを使い、自分で作った場合だけ削除する。

## Phase 4

- `packages/diagram/src/client.ts` がpendingノード探索、`aria-busy`、ライフサイクル状態、エラー処理、後始末、フォールバック展開を共通化する。カスタムselectorとfallback selectorを受け取る。
- 移行済み: `graphviz`、`chartjs`、`mermaid`、`d2`、`wavedrom`、`vega-lite`、`markmap`、`map`、`excalibrain`。
- Mermaidのセキュリティ、Vegaのfinalize、Leafletの後始末、WaveDromのskin、Markmapのasset読み込みといった固有処理は各レンダラー内に残す。
- Mermaidのブラウザテストで描画とSVGサニタイズを確認する。diagramテストでselector、後始末、失敗時フォールバックを確認する。

## main統合後の最終再監査

- プラグインディレクトリは85、`createClientEntry` を持つプラグインは32のまま。
- `pnpm check:client-entries` がPASSし、グローバル以外のクライアントエントリはすべて読み込み条件を持つ。
- mainの追加変更はcontent mutationとderived viewのみで、プラグインUIの変更はない。
- 移行台帳は1 A、17 B、15 C、52 Dになった。`image-compare` はBのVERIFIED、`code-tabs` はHASTコンポーネント描画のためCからBへ移動した。
- Bの記録は宣言的マークアップとブラウザ効果を分けて記録している。
- アサーションの削除・弱体化はない。Mermaidのブラウザ期待値には共通の `data-diagram-status="rendered"` も追加した。Excalidrawのブラウザテストは意図的に非公開の `/assets/HW` ではなく公開ドキュメントの埋め込みを確認し、単独ページ描画はExcalidrawのページテストが保証する。

## 検証

| チェック | 結果 |
| --- | --- |
| `pnpm test:e2e:external` | PASS。公開tarballから外部サイトを構築 |
| `node --import tsx --test tests/interactive-runtime/official.test.ts` | PASS 9/9 |
| `pnpm --filter @riebeckite/web build` | PASS。1,042ページ |
| `pnpm typecheck` | PASS。3プロジェクト |
| `pnpm check` | PASS。1,818ファイル |
| `pnpm check:packages` | PASS。117パッケージ |
| `pnpm check:docs` | PASS |
| `pnpm check:client-entries` | PASS |
| `pnpm --filter @riebeckite/core test` | PASS 565/565 |
| `pnpm --filter @riebeckite/node test` | PASS 92/92 |
| `pnpm --filter @riebeckite/plugin-image-compare test` | PASS 13/13 |
| `pnpm --filter @riebeckite/plugin-code-tabs test` | PASS 2/2 |
| `pnpm --filter @riebeckite/plugin-search test` | PASS 32/32 |
| `pnpm --filter @riebeckite/plugin-mdx test` | PASS 11/11 |
| UIテスト | PASS 13/13 |
| diagramテスト | PASS 8/8 |
| Mermaidテスト | PASS 17/17 |
| text-fragmentテスト | PASS 21/21 |
| changelogテスト | PASS 9/9 |

Graphvizパッケージ自体にテストファイルはなく、共通ライフサイクルは `packages/diagram/test/client.test.ts` が保証する。ワークスペース全体の `pnpm test` は実行しておらず、このブランチとmain統合で影響するパッケージを個別に検証した。

## 残作業

Phase 1〜4に残りの実装項目はない。任意の追加確認として、ワークスペース全体のテスト実行と、Mermaid・Graphviz以外の外部レンダラーのブラウザテスト追加がある。

## merge可否

最終ブランチでは外部Scaffold E2E、9ケースの公式ブラウザテスト、1,042ページのウェブサイトビルドを含む全検証ゲートがPASSしている。Phase 0〜4はこのブランチで完了した。merge・push・deployは意図的に行っておらず、レビュー側の判断に委ねる。
