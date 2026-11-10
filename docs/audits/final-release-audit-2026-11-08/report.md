# 最終リリース監査

- 日付: 2026-11-08
- 監査ブランチ: `audit/final-release-2026-11-08`
- 監査起点: `07f329ed934ec2b26ceb336de31f56ec6b4cf4a9`
- 実行環境: Windows / Node.js 24.22.1 / Corepack pnpm 11.5.3
- 対象: 118 workspace projects、公開パッケージ 116 個

## 判定

**HOLD（未リリース）**。確認済みの P1 はすべて修正したが、再帰テスト全体と全プリセットの fast-path E2E は 30 分の実行上限で完走していない。未実行・未完了を PASS として扱わない。

main は監査開始時の `07f329ed` から `7910b478` へ進んでいた。そのため監査ブランチは main へマージしない。

## 修正した P1

1. `@riebeckite/ui/loading` の root `tsconfig.json` paths が欠け、クリーンな package build 後の `pnpm typecheck` が TS7016 で失敗していた。共有 paths に追加し、型検査を通過させた。
2. Mermaid、D2、Graphviz、ExcaliBrain がレンダラー出力 SVG を `innerHTML` へ直接投入していた。`@riebeckite/diagram/client` に DOMParser ベースの SVG 境界を置き、危険な要素・イベント属性・URL 属性・外部 CSS を除去して `replaceChildren` で挿入するようにした。
3. root に `packageManager: "pnpm@11.5.3"` がなく、CI・lockfile・文書の前提と矛盾していた。Corepack pin を追加した。

## SSG・増分ビルド複雑性監査

報告された構造上の懸念は実コードで確認した。いずれも今回の実行で再生成漏れには至らず、既存の E2E が no-change、内容変更、公開状態、出力改竄、full build 回復を検証している。リリース直前に責務分割・引数オブジェクト化・キャッシュ設計変更を入れると、既存のキャッシュ整合性リスクの方が高いので変更しない。

| 項目 | 確認結果 | リリース判定 |
| --- | --- | --- |
| `ssg/output_cache.ts` の責務混在 | 876 行。永続化、通常検証、fast-path、パス安全性、I/O が同居 | P2 保守性。分割候補だが機能不具合の証拠なし |
| `riebeckiteSsg` の巨大クロージャ | `ssg_plugin.ts` のプラグインライフサイクルと状態が一関数に集中 | P2 保守性。状態オブジェクト抽出は次期設計作業 |
| 出力変更判定の引数過多 | `determineOutputChanges` は変更集合を作り、`findOutputChangeReason` に 12 引数を渡す | P2。読みづらいが fast-path E2E で主要組合せを確認 |
| 三層キャッシュと二経路検証 | 永続キャッシュ、出力キャッシュ、メモリ状態および fast-path を確認 | P2。`test:e2e:fast-path` は 17 ケース全通過 |
| fingerprint 名称と二軸 version | 4 関数は入力範囲が異なるが近い名前 | P3。命名整理のみでは安全性を高めない |
| プラグインキャッシュ安全契約 | `applies` / `does-not-apply` / `unknown` を安全側に倒す | P2。`unknown` は cache 不可となるため再生成漏れを優先しない |
| ディレクトリ依存サイクル | source-health の advisory が検出 | P3。現時点で module import cycle の実行失敗は未確認 |

## 注意

- `pnpm check:scaffold` は package build 前のクリーン checkout では公開 workspace の `.d.ts` が無く失敗し、package build 後は 8 preset で通過する。CI は build artifact を復元してから実行する。単独実行の前提は文書化またはスクリプト側で整理が必要な P2。
- D2 の client SVG で data URI または外部 URL の icon を使う場合、SVG 境界は安全側に `image` の参照を除去する。外部参照を許可する仕様と browser characterization が未整備のため P2 として残す。
- Vite/Rolldown は build 時に既知の externalize、`@theme`、chunk-size 警告を出す。今回の外部 E2E は成功したが、警告ゼロの証明ではない。
- source-health は 130 件の advisory（長大ファイル・関数、ディレクトリ循環など）を報告した。`runMigrate` と `initSearch` の分割は今回の安全な修正範囲から除外した。

詳細は `findings.md`、実行証跡は `verification-matrix.md` と `e2e-results.md`、出荷判断は `release-decision.md` を参照。

## Related documents

- [Findings](./findings.md) / [Japanese](./findings.ja.md)
- [Verification matrix](./verification-matrix.md) / [Japanese](./verification-matrix.ja.md)
- [E2E results](./e2e-results.md) / [Japanese](./e2e-results.ja.md)
- [Release decision](./release-decision.md) / [Japanese](./release-decision.ja.md)
