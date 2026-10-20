# Phase 2I-B: Safe Selective SSG Execution

## 結論

**PARTIAL（Selective SSG は実装しない）**。Output Plan は最終出力の照合には使えるが、Hono 静的ルート、Vite client asset、site public asset の依存関係と実行副作用を事前に証明する情報を持たない。これらは Plan で `action: unknown` と表現される。したがって、Route 実行、Plugin Hook、`buildEnd` を省略する根拠はない。

既存の incremental output reuse は維持する。Phase 2I-B で新たな Selective Route Execution と No-change Fast Path の適用範囲拡大は行わない。性能改善を測定できていないため、複雑性だけを増やす変更は採用しない。

## 1. 開始時の Git 状態

- 確認日: 2026-10-20
- 元 worktree: `C:/Users/rerur/.wk/program/riebeckite`、branch `main`
- 元 worktree の未コミット変更: `packages/cli/package.json`、`packages/cli/src/commands/create_plugin.ts`、`packages/cli/src/commands/create_theme.ts`、`pnpm-lock.yaml`、`packages/cli/src/prompt_helpers.ts`、`scripts/tmp-pele-probe.mjs`
- `main` の先頭: `cc9e14d3 starterプリセットにプロパティの共通フィールドを定義`
- 基準 commit: `ee87a1bf Output Plan検証結果を統合` の存在を確認
- 作業 worktree: `C:/Users/rerur/.wk/program/riebeckite-phase2ib`
- 作業 branch: `phase2ib-selective-ssg`

作業 worktree は `ee87a1bf` から作成した。元の `main` とその未コミット変更は編集していない。

## 2. Phase 2I-A-V の残存検証

`ci-declarative-output-plan-phase2ia.md` を確認した。結果の意味を Selective SSG の可否と混同しないため、次のとおり整理する。

| 項目 | 状態 | 根拠と制限 |
| --- | --- | --- |
| Mutation Matrix | UNVERIFIED | 外部 preset の通常ケースは実行済み。permalink、alias、tag、folder、theme の独立 mutation と 100/1,000 件は未実行。 |
| Fault Recovery Matrix | UNVERIFIED | cache/state/dist の既存 fallback と smoke は確認済み。ただし全 fault を Output Plan metrics と publication E2E で再計測していない。 |
| Action Correctness | UNVERIFIED | Plan は観測と照合だけで、Hono 静的ルート・asset の generate/reuse を事前に決定しない。 |
| Determinism | PASS | `output_plan.test.ts` が同一入力の順序安定性を検証している。 |
| Clean SHA 比較 | PASS（既存 preset 範囲） | Phase 2I-A-V の Empty/Minimal/Starter/Showcase の incremental と full build は SHA 一致。100/1,000 件は未検証。 |
| Publication Boundary | PASS（既存 preset 範囲） | Missing in Plan/Dist、Unknown、Owner Conflict、Publication Violation が 0。Draft 非公開と Unlisted の既存契約も確認済み。検索・sitemap・navigation の網羅 E2E は未検証。 |

Action Correctness が未検証のため、Output Plan を根拠にした Selective SSG は有効化しない。

## 3. 現在の SSG 実行経路

1. `ContentManager` は manifest、page path、page route、`onManifestCreated`、generated output plan、`buildEnd` を実行する。
2. `determineOutputChanges()` が content、redirect、plugin page、plugin generated output の inventory と affected/unchanged/removed を作る。未知依存または外部依存失敗は full regeneration を要求する。
3. `riebeckiteSsg()` は client artifact を退避し、SSR server と entry module を読み込む。
4. SSG plugin は Output Cache、app fingerprint、client manifest fingerprint、unchanged cache coverage から既存の incremental reuse 可否を判定する。
5. `contentRouteSsgParams()` は affected content/redirect/plugin page だけを SSG params として渡す。
6. `toSSG()` は Hono の route discovery、Response Orchestration、HTML rendering、`writeFile` を実行する。unchanged inventory output の `writeFile` は抑止し、後段で cache entry から Vite asset として復元する。
7. `writeFile` 観測は Content Inventory 外の出力を Hono static route として記録する。これは事前の route registry ではない。
8. `closeBundle` は最終 `dist` の SHA inventory を取り、Output Plan を構築して照合し、Output Cache と fast-path sidecar を保存する。

Output Plan はこの経路の canonical state ではない。canonical な content inventory/change set を複製して永続化せず、完了後の照合に限るため、既存の Selective SSG 状態と重複しない。

## 4. Execution Plan と安全条件

Plan の action は次のように導出される。

| 集合 | 導出 | 実行上の扱い |
| --- | --- | --- |
| Generate | affected、または cache 非利用の content/plugin descriptor | 既存 `toSSG()` と generated-output emission が生成する。 |
| Reuse | unchanged かつ Output Cache が有効な content/plugin descriptor | 既存 cache entry から復元する。 |
| Remove | 前回 inventory にあり、現行 inventory にない descriptor | 既存 cleanup が削除する。 |
| Unknown | Hono static route、Vite client asset、site public asset | reuse/skip の根拠にしない。 |

各 output を reuse するには、Plan 完全性、owner、dependency、publication eligibility、前回 inventory、cache entry、dist の存在または復元可能性、plugin/theme/route の互換性をすべて確認する必要がある。

content/redirect/plugin page/generated output は既存 Change Set と Output Cache が一部を満たす。一方で Hono static route と asset は依存を `{ type: "unknown" }` としている。owner と path を観測できても、Route の外部入力、Plugin の副作用、実行順、HTML inspector を含む実行契約は宣言されない。Unknown を Reuse に変換しない。

## 5. Fast Path と Fallback

既存 CLI Fast Path は以下のときだけ検討する。

- output change set が存在する
- full regeneration が不要
- affected/removed が 0
- `buildEnd`、generated output plan、非 cacheable manifest hook などの plugin block reason がない
- Output Cache sidecar、app fingerprint、public fingerprint、最終 dist SHA inventory が一致する

次の場合は通常 build に fallback する。

- cache/state/sidecar の欠損・破損・旧形式
- app、client manifest、static asset の fingerprint 変更
- cache entry 欠損、dist 欠損・改変、inventory 不一致
- unknown dependency、外部 dependency failure、publication state の期限切れ
- content/output change、plugin の `buildEnd`、generated output plan、manifest-hook cache miss

Phase 2I-B ではこの既存条件を緩和しない。`toSSG()` 全体を新たに省略する Fast Path も導入しない。

## 6. Plugin 契約と Publication Boundary

`ContentManager` は Fast Path を使わない通常 build で、`onContentParsed` を含む content pipeline、`onContentRendered` を含む rendering pipeline、`onManifestCreated`、generated output plan、`buildEnd` を従来どおり実行する。`buildEnd` または generated output plan を持つ plugin は既存 Fast Path の block reason になる。

このため、Phase 2I-B の不採用判断は PageType、static route、client asset、plugin generated output、HTML inspector を省略しない。Draft は public inventory に入れず、Unlisted は既存の routable/discoverability 契約を維持する。

## 7. Mutation Matrix

| 条件 | 状態 |
| --- | --- |
| No-change、Body Edit、Add、Delete、Rename、Public→Draft、Draft→Public、Public→Unlisted、Unlisted→Public | PASS（既存 external preset 範囲） |
| Link Edit | PASS（Phase 2I-A-V の既存外部 E2E 範囲） |
| Permalink、Alias、Tag、Folder、Theme | UNVERIFIED（独立 mutation と Clean SHA 比較が未実行） |
| Plugin 設定変更 | PASS（Starter/Showcase の既存 external preset 範囲） |

未検証条件を安全な reuse の根拠には使わない。

## 8. Fault Recovery

cache checksum/entry 破損、metadata 不正、junction、不正 path、未参照 cache entry、dist 改変は既存 unit/E2E smoke で通常 regeneration へ fallback する。Output inventory の改変は `output-inventory-mismatch` として既存 Fast Path を止める。

Output Cache 欠損・破損、Output Inventory 欠損、Build State 欠損・旧バージョン、dist 全削除・一部削除、CI 新規 checkout、Plugin 設定変更、Theme 変更を全件 E2E で再計測していないため、この matrix 全体は **UNVERIFIED** である。

## 9. 実測と Before/After

実装変更を採用していないため、Before/After の比較対象はない。性能改善、CPU、RSS、Rendered/Reuse、Cache Hit/Miss、Fast Path 適用数、Fallback 数について、Phase 2I-B の新しい数値は報告しない。

Showcase/1000 No-change を `--runs 3` で測定したが、パッケージ構築を含む実行が 20 分の実行上限を超え、結果 JSON の書き出し前に中断された。このため中央値は **UNVERIFIED**。SSR Load と `toSSG` は包含関係にあるため、将来の比較でも単純加算しない。

## 10. 実行した検証

| コマンド | 結果 |
| --- | --- |
| `pnpm exec tsx --test packages/core/test/output_plan.test.ts packages/integrations/honox/test/ssg_plugin.test.ts` | PASS（22/22） |
| `pnpm test:e2e:preset-fast-path` | UNVERIFIED。Empty と Minimal は完走 PASS、Starter は scheduled-note 直前まで PASS。20 分上限で中断したため全体 PASS ではない。 |
| `pnpm benchmark:presets -- --presets showcase --sizes 1000 --scenarios no-change --runs 3 ...` | UNVERIFIED。結果ファイル生成前に 20 分上限で中断。 |

`pnpm build:packages`、`pnpm typecheck`、`pnpm test`、`pnpm test:e2e:fault-recovery`、`pnpm check`、`pnpm check:docs`、`pnpm check:plugin-docs`、`pnpm check:scaffold` は、Phase 2I-B では未実行である。`git diff --check` は PASS。Biome は当該 Markdown を対象外としており、整形検査は実行できなかった。

## 11. 撤回した実験と残存ボトルネック

Selective Route Execution と `toSSG()` 全体 skip は撤回した。Hono static route の discovery は `toSSG()` 中の `writeFile` 観測であり、実行前に完全な route/output/dependency 集合を持てないためである。Output Plan の path coverage が 0 件の欠落でも、Route 実行、Plugin Hook、`buildEnd`、外部入力の安全性を示すものではない。

主なボトルネックは SSR server の起動・module load・Hono route discovery・静的ルートの Response Orchestration である。これを削減するには、静的ルートと asset の owner、dependency、publication eligibility、route/config/plugin fingerprint、必須副作用を事前に宣言・検証できる契約が必要になる。

## 12. 次 Phase の推奨

1. Hono static route と client/site asset に、owner precedence、dependency、publication eligibility、route/config/plugin fingerprint を事前宣言する仕組みを設計する。
2. `buildEnd`、HTML inspector、plugin generated output を省略可能と判断する既存 API 上の明示的な契約を検討する。副作用を推測してはならない。
3. permalink、alias、tag、folder、theme を含む mutation と、cache/state/dist/CI fault の E2E を Output Plan metrics・Clean SHA とともに追加する。
4. Starter/Showcase の 100/1,000、Cold/No-change/Body Edit を同一環境で各3回測定し、Showcase/1000 No-change を優先して中央値と範囲を残す。
5. その全てが PASS し、Wall Time の改善が再現できる場合だけ Selective SSG を再提案する。
