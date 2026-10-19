# Phase 2G: Output 依存の全体監査

## 結論

Properties は、表示対象の frontmatter に含まれる wikilink だけを Content Output 依存として宣言するように変更した。解決できない wikilink は安全側で `global` に残す。

Starter / Showcase の実プリセットでは Related Posts と Responsive Image、または Showcase 固有の global 依存が重なるため、Properties を単独で外したことによる Output 再描画数の固有差分は 0 件だった。これは削減が無効という意味ではない。Properties 自身の無条件 global を除去し、他の global 依存が解消された構成で過剰無効化を再導入しない状態にした。

## 対象と方法

- 比較元: `8f47a812907d8bc9c97f60175ee1be32db24ba9f`
- 比較先: 本変更をビルドした worktree
- 各条件は 1 サンプル。Incremental の `dist` と Build State を削除した Clean Build の `dist` を全ファイル SHA-256 で比較した。
- 条件: no-change、本文編集、リンク編集、追加、削除、rename、public → draft、draft → public。
- 指標: Content processed/reused、Output rendered/reused、Output Cache hit/miss、Output write 時間、Clean Build 一致。
- 初回の長時間一括計測は途中で停止したため、変更前の不足 6 条件は比較元専用 worktree で再計測した。初回 Starter/100 rename の異常値（`105/0`、`212/1`）と Starter/1000 本文編集の不一致は、比較元での単独再計測で再現しなかった。以下は再計測で確認した値を採用する。

## 計測結果

`Content` は processed/reused、`Output` は rendered/reused、`Cache` は hit/miss である。前後で件数が同じ行は、残る global 依存との重なりにより実プリセットの差分が表面化しなかったことを表す。

### Starter / 100

| 条件 | Content | Output | Cache | Write ms | Clean 一致 |
| --- | --- | --- | --- | ---: | --- |
| no-change | 0 / 105 | 0 / 256 | 260 / 0 | 1 | 一致 |
| 本文編集 | 1 / 104 | 212 / 10 | 260 / 0 | 14 | 一致 |
| リンク編集 | 1 / 104 | 212 / 10 | 260 / 0 | 13 | 一致 |
| 追加 | 1 / 105 | 122 / 128 | 260 / 3 | 14 | 一致 |
| 削除 | 0 / 104 | 210 / 10 | 260 / 0 | 14 | 一致 |
| rename | 2 / 103 | 119 / 124 | 260 / 0 | 12 | 一致 |
| public → draft | 99 / 6 | 210 / 10 | 260 / 0 | 14 | 一致 |
| draft → public | 100 / 5 | 214 / 10 | 260 / 0 | 14 | 一致 |

### Showcase / 100

| 条件 | Content | Output | Cache | Write ms | Clean 一致 |
| --- | --- | --- | --- | ---: | --- |
| no-change | 8 / 128 | 0 / 322 | 330 / 0 | 2 | 一致 |
| 本文編集 | 9 / 127 | 163 / 148 | 330 / 0 | 12 | 一致 |
| リンク編集 | 9 / 127 | 164 / 141 | 330 / 0 | 12 | 一致 |
| 追加 | 9 / 128 | 166 / 149 | 330 / 0 | 12 | 一致 |
| 削除 | 9 / 126 | 162 / 147 | 330 / 0 | 9 | 一致 |
| rename | 108 / 28 | 256 / 31 | 330 / 0 | 14 | 一致 |
| public → draft | 108 / 28 | 254 / 31 | 330 / 0 | 11 | 一致 |
| draft → public | 108 / 28 | 258 / 31 | 330 / 0 | 13 | 一致 |

### Showcase / 1000

| 条件 | Content | Output | Cache | Write ms | Clean 一致 |
| --- | --- | --- | --- | ---: | --- |
| no-change | 8 / 1028 | 0 / 2124 | 2132 / 0 | 4 | 既知の 1 ファイル差分 |
| 本文編集 | 9 / 1027 | 1064 / 1049 | 2132 / 0 | 74 | 一致 |
| リンク編集 | 9 / 1027 | 1065 / 1042 | 2132 / 0 | 73 | 一致 |
| 追加 | 9 / 1028 | 1067 / 1050 | 2132 / 0 | 76 | 一致 |
| 削除 | 9 / 1026 | 1063 / 1048 | 2132 / 0 | 77 | 一致 |
| rename | 1008 / 28 | 2004 / 31 | 2132 / 0 | 91 | 一致 |
| public → draft | 1008 / 28 | 2002 / 31 | 2132 / 0 | 91 | 一致 |
| draft → public | 1008 / 28 | 2006 / 31 | 2132 / 0 | 94 | 一致 |

補助として Starter / 1000 も全条件を計測した。no-change は `0 / 1005` Content、`0 / 2040` Output、`2044 / 0` Cache で Clean と一致した。変更系は `1002–1944` Output を再描画し、すべて Clean と一致した。

Showcase / 1000 の no-change に限る `search-data.json` の差分は、Phase 2D で既知の D2 / Marp の遅延ロードによる非決定性である。変更前後の両方で同じ 1 ファイルだけに現れ、Properties の依存解決変更とは独立している。

## global 依存の監査

| プラグイン | 種別 | 固有の実測 Output 影響 | 判断 |
| --- | --- | ---: | --- |
| Properties | Content Output | 0 | wikilink 単位へ削減。未解決時のみ global。 |
| Related Posts | Content Output | 0 | タグ、入出リンク、共起、順位候補を読むため維持。 |
| Responsive Image | Content Output | 0 | sibling variant の追加・削除を安全に表す file-family 依存がないため維持。 |
| Dataview | Content Output | 0 | 任意クエリの集合結果を読むため維持。 |
| Docs | Content Output | 0 | ローカライズ済み discoverable entry 全体からナビゲーションを作るため維持。 |
| Excalibrain | Content Output | 0 | manifest 全体のグラフを読むため維持。 |
| Kanban | Content Output | 0 | manifest 全体を解決するため維持。 |
| Query | Content Output | 0 | 任意クエリの集合結果を読むため維持。 |
| Canvas | Content Output / Canvas page | 0 | canvas 文書と cross-content 解決を読むため維持。 |
| Bases | Content Output / Base page | 0 | collection query と集約ページを読むため維持。 |
| Series | Content Output / Series page | 0 | collection と集約ページを読むため維持。 |
| Daily Notes | Content Output | 条件付き 0 | source directory が空の場合のみ global。 |
| Archive | Plugin page | 対象外 | discoverable entry 全体から月別ページを作る。 |
| Citations | Plugin page | 対象外 | 公開コンテンツの bibliography を集約する。 |
| Excalidraw | Plugin page | 対象外 | Excalidraw 文書一覧を集約する。 |
| Garden Explorer | Plugin page | 対象外 | graph、tag、folder を集約する。 |
| Deploy | Generated output | 対象外 | redirect と provider 出力を統合する。 |
| Hover Preview | Generated output | 対象外 | runtime 出力を全体から生成する。 |

固有影響は、同じ出力に別の global 依存が残る場合、単一プラグインを外しても Output 数が変わらないため 0 となる。これは Starter の Properties / Related Posts / Responsive Image と Showcase の重なりで確認した。Properties の resolver 単体では、通常プロパティは追加依存なし、`[[note#section]]` は `content:note`、未解決 `[[later]]` は `global` を返す。

## 実装と安全性

- `packages/plugins/properties/index.ts` は表示対象の値だけを include / exclude / hideEmpty と同じ規則で選択し、文字列・配列・オブジェクトを再帰して wikilink を収集する。
- 解決済み target は `manifest.contentIndex` と `manifest.bySlug` で確認して `{ type: "content", slug }` を宣言する。
- 解決できない target は新規作成、alias、公開状態遷移を見落とさないよう `{ type: "global" }` を宣言する。
- Core が前回の Output 依存を保持するため、target 削除や依存先置換でも旧 target を含めて無効化される。
- Core の回帰テストで entry 固有の動的依存が、変更元と依存先のみを affect し、無関係 entry を unchanged に残すことを確認した。

## 検証

| コマンド | 結果 |
| --- | --- |
| `pnpm --filter @riebeckite/core test` | 311 / 311 pass |
| `pnpm --filter @riebeckite/plugin-properties test` | 26 / 26 pass |
| `pnpm --filter @riebeckite/honox test` | 165 / 165 pass |
| `pnpm --filter @riebeckite/plugin-diff test` | 24 / 24 pass |
| `pnpm typecheck` | 146 projects OK |
| 変更 3 ファイルの `biome check` | pass |
| `pnpm benchmark:presets` | 変更前後の 32 条件を完走。上記の既知 1 件以外は一致。 |

`pnpm test` の並列実行は `@riebeckite/plugin-diff` の `history_reader.test.ts` で一度ファイル単位の失敗となったが、同パッケージ単独では 24 / 24 pass だった。`pnpm check` は今回未変更の `benchmarks/preset-ssg/ci-runner.mjs` の既存フォーマットエラー 1 件、および既存 warning 13 件で失敗した。変更対象に追加の Biome 指摘はない。
