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
| Phase 1: コンポーネントprops解決 | PARTIAL | `resolveProps` とアセット解決コンテキストはcoreテストでPASS。解決はMarkdown処理時点で、manifestのアセット確定前 |
| Phase 2: HASTコンポーネント | PARTIAL | サニタイズ後のAPIとテストはPASS。実プラグインの利用者はまだいない |
| Phase 3: アプリ配置 | PARTIAL | オーバーレイホストとtext-fragment連携はPASS。汎用app slotsと1ページ1マウント・SPAフォーカス契約は未実装 |
| Phase 4: 外部レンダラー共通化 | PARTIAL | selector対応の共通ライフサイクルとGraphviz移行はPASS。8つのレンダラーは独自ループのまま |

新たに完全宣言化すべきプラグインは見つかっていない。移行台帳の85プラグインは1 A、16 B、16 C、52 Dのままで、残作業は移行漏れではなくアーキテクチャの完成です。

## Phase 0

- `scripts/check_client_entry_presence.mjs` がプラグインの `index.ts` をTypeScript ASTで解析し、7番目の `presenceSelector` を必須にする。
- selectorを持たないのは `analytics`、`color-mode`、`text-fragment`、`ux` の4件で、いずれも意図的にグローバル。`text-fragment` は全記事の選択範囲を監視する必要があり、`color-mode` と `ux` はページ全体の効果、`analytics` は対話UIを持たない。
- `pnpm check:client-entries` で検査できる。

## Phase 1

- `PluginMarkdownComponent` は `resolveProps(props, { sourceSlug, resolveAssetUrl })` を受け取れる。
- `preparePluginComponent` は `parseProps`、`resolveProps`、解決済みpropsのシリアライズ、描画の順に実行する。
- MarkdownパイプラインがソースslugとアセットURL解決関数を渡す。
- coreテストでslugの受け渡し、アセット解決、失敗の伝播を確認する。
- 制約: `renderPluginComponents` は `remarkRehype`、`rehypeRaw`、サニタイズ、manifestのアセット確定より前に動く。そのため `image-compare` は現在もプレースホルダーと `onManifestCreated` を使う。移行にはmanifest確定後の解決点がもう1つ必要。

## Phase 2

- `packages/core/src/plugin_component_hast.ts` が `hastComponents` と `defineHastComponent` を提供する。
- HASTコンポーネントは生HTML、サニタイザー、style/objectサニタイザーの後に実行され、対象ノード、シリアライズ済みHTML、子HTMLを受け取る。
- coreテストでラップと、`<script>` および `onclick` がコンポーネントへ渡る前に除去されることを確認する。
- 実プラグインの移行は未実施。`code-tabs` は現在もRehype段階でARIAタブ構造を生成するため、移行台帳ではCのままとし、新しいAPIが利用可能であることを記録する。

## Phase 3

- `packages/ui/src/overlay/index.tsx` が `OverlayHost` と `findOverlayHost` を提供する。
- ウェブサイトのレンダラーがbody先頭に `text-fragment` 用ホストを1つ配置する。
- text-fragmentクライアントはアプリ所有のホストを使い、自分で作った場合だけ削除する。
- UIテストでオーバーレイスロットと既存のdrawer・dialog・tabsの動作を確認する。
- 未実装: `head`、`bodyStart`、`articleAfter`、`app` の各slot、1ページ1マウント、SPA遷移時のフォーカス復元とスクロールロック。

## Phase 4

- `packages/diagram/src/client.ts` がselectorを受け取り、pendingノードの探索、ライフサイクル状態、エラー処理、フォールバック展開を共通化する。
- `graphviz` は共通ライフサイクルを使い、フォールバックに `dataDiagramFallback="true"` を付ける。
- diagramのクライアントテストでselector、ライフサイクル、後始末、失敗時のフォールバックを確認する。
- 残り: `mermaid`、`d2`、`wavedrom`、`vega-lite`、`markmap`、`map`、`chartjs`、`excalibrain`。
- Graphviz移行専用のブラウザE2Eはない。

## main統合後の最終再監査

- プラグインディレクトリは85、`createClientEntry` を持つプラグインは32のまま。
- `pnpm check:client-entries` がPASSし、グローバル以外のクライアントエントリはすべて読み込み条件を持つ。
- mainの追加変更はcontent mutationとderived viewのみで、プラグインUIの変更はない。
- 移行台帳のA/B/C/D件数は有効なまま。
- 命令的処理を残すBの記録は正確で、宣言的部分とブラウザ効果を分けて記録している。
- `image-compare` はマークアップが本質的に命令的だからではなく、manifest確定後のprops解決が未対応のため `KEEP_IMPERATIVE` のまま。
- `code-tabs` は新しいHAST APIの実利用者がまだいないためCのまま。
- アサーションの削除・弱体化はない。Excalidrawのブラウザテストは意図的に非公開の `/assets/HW` ではなく公開ドキュメントの埋め込みを確認し、単独ページ描画はExcalidrawのページテストが保証する。

## 検証

| チェック | 結果 |
| --- | --- |
| `pnpm test:e2e:external` | PASS。公開tarballから外部サイトを構築 |
| `node --import tsx --test tests/interactive-runtime/official.test.ts` | PASS 8/8 |
| `pnpm --filter @riebeckite/web build` | PASS。1,042ページ |
| `pnpm typecheck` | PASS。3プロジェクト |
| `pnpm check` | PASS。1,818ファイル |
| `pnpm check:packages` | PASS。117パッケージ |
| `pnpm check:docs` | PASS。1,228 Markdown、85プラグイン、28テーマ |
| `pnpm check:client-entries` | PASS |
| `pnpm --filter @riebeckite/core test` | PASS 564/564 |
| `pnpm --filter @riebeckite/node test` | PASS 92/92 |
| `pnpm --filter @riebeckite/plugin-search test` | PASS 32/32 |
| `pnpm --filter @riebeckite/plugin-mdx test` | PASS 11/11 |
| UIテスト | PASS 12/12 |
| diagramテスト | PASS 8/8 |
| text-fragmentテスト | PASS 21/21 |
| changelogテスト | PASS 9/9 |

Graphvizパッケージ自体にテストファイルはなく、共通ライフサイクルは `packages/diagram/test/client.test.ts` が保証する。ワークスペース全体の `pnpm test` は実行しておらず、このブランチとmain統合で影響するパッケージを個別に検証した。

## 残作業

1. manifestのアセット確定後にコンポーネントpropsを解決し、`image-compare` を移行する。
2. 実プラグインを `hastComponents` へ移行し、ブラウザテストを追加する。
3. 汎用app slotsと、1ページ1マウント・SPAフォーカス/スクロール契約を追加する。
4. 残りの外部レンダラーを共通ライフサイクルへ移行し、ブラウザテストを追加する。
5. 完了時に実装台帳またはこのレポートを更新する。

## merge可否

`d92a2f93` では外部Scaffold E2Eを含む全検証ゲートがPASSしている。ゲート上はレビュー・統合可能。ただしPhase 1、3、4は部分実装で、Phase 2には実利用者がいないため、アーキテクチャとしては未完成。この範囲を許容しない限りmerge・push・deployはしない。
