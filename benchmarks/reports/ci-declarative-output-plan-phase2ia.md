# Phase 2I-A: Declarative Output Plan & SSG Inventory Verification

## 1. 判定

**PARTIAL（Plan の独立照合を追加、SSG skip は実装しない）**。Phase 2H-C で判明したように、Content Change Set は Hono の静的ルートを完全には表さない。したがって `toSSG()` は従来どおり毎回実行する。今回の変更は既存の出力生成、cache、route discovery の経路を変更せず、既存 Output Inventory と実行中に観測した出力から宣言的な Output Plan を構築して最終 `dist` と照合する。

## 2. 比較元と作業境界

- 比較元: `6db73135`（`perf/phase2h-ssr-tossg`）、基盤 commit: `b00ba06b`
- 作業 branch: `perf/phase2i-a-output-plan`
- 作業 worktree: `C:\Users\rerur\AppData\Local\Temp\opencode\riebeckite-phase2ia`
- 開始時の比較元 worktree は clean。`main` は変更していない。
- `toSSG()` の省略、独自 route registry、Output Plan の永続化、新しい cache 層、公開 API の全面変更は行っていない。

## 3. 監査した出力経路

| 分類 | 既存の owner / source | Plan での扱い |
| --- | --- | --- |
| Content | `ContentManifest.publicEntries`、permalink、public alias、`OutputDescriptor` | `content`。既存依存を再利用し、affected は generate、cache hit の unchanged は reuse |
| Redirect | `ContentManifest.publicRedirects` | `content` owner の `redirect`。public owner のみ対象 |
| Plugin page / generated | page type と `manifest.generatedOutputs` | producer により `plugin`。既存依存を再利用 |
| Hono static | `toSSG()` の `writeFile` 観測（例: index、404、feed、archive） | `hono-static-route`。dependency/action は unknown |
| Vite build artifact | SSG 前に restore した client artifact、Vite bundle、出力 directory の file path | `vite-client-asset`。site public asset を除外し、dependency/action は unknown |
| site public asset | `collectSiteOwnedOutputPaths()` | `site-public-asset`。dependency/action は unknown |

Draft は既存 `publicEntries` に入らず、Output Plan に公開 Content として入らない。Unlisted は既存の routable / discoverability 契約を変更せず、その既存 Inventory に従う。本文・HTML・frontmatter の値は Plan に保存しない。

## 4. Output Plan のデータ契約

`packages/core/src/content/output_plan.ts` は純粋関数として次を定義する。

- entry: `path`、`owner`、`kind`、`source`、`dependencies`、`publicationEligible`、`cacheEligible`、`expectedToExist`、`action`
- action: `generate` / `reuse` / `remove` / `unknown`
- conflict: 同一 path の異なる owner
- comparison: Matched、Missing in Plan、Missing in Dist、Owner Conflict、Unknown、Publication Violation

削除済み descriptor は `expectedToExist: false`、`publicationEligible: false`、`action: remove` とする。観測済みだが依存が宣言されていない Hono / asset 出力は `unknown` のままとし、cache reuse や生成を推測しない。path と owner はソートされ、同じ入力から同じ Plan になる。

## 5. 既存 Inventory・Cache との関係

Content、redirect、plugin page、generated output の canonical descriptor は既存の `buildOutputInventory()` と `determineOutputChanges()` である。Plan はそれを複製して state に保存せず、build 時の affected / unchanged / removed と cache 利用可否から action を導出する。

Content Inventory と削除候補は `toSSG()` 前、Vite artifact は restore と Vite bundle の時点、Hono static route は `toSSG()` 中の `writeFile` 観測で得る。`closeBundle` はこれらだけから Plan を構築し、既存の最終 SHA inventory を**比較入力としてのみ**渡す。最終 `dist` の path を Plan に補完しないため、未宣言 path は Missing in Plan / Unknown になる。Plan 自体は Output Cache や Content Build State に保存しない。cache/state の欠損・破損は既存の cold regeneration fallback を維持する。

## 6. Hono 静的ルートの観測境界

`packages/integrations/honox/src/ssg_plugin.ts` は既存 `toSSG()` の `writeFile` を観測し、Content Inventory にない path だけを Hono static route candidate として記録する。write、emit、shadow、reuse、remove の条件は変更していない。

これは事前 route registry ではない。初回の完全 build 後に静的出力を分類する observability 基盤であり、static route の dependency、設定依存、plugin 外部入力を完全宣言するまでは SSG skip の根拠にできない。

## 7. dist 照合と指標

最終 `dist` の fingerprint 後に以下を `SsgOutputMetrics` に記録する。

- planned / actual / matched output count
- missing in plan / missing in dist / unknown output count
- owner conflict / publication violation count
- Output Plan 構築時の RSS 差分
- generate / reuse / remove / unknown の action 別件数
- `outputPlan` と `outputPlanComparison` の timing

最終 `dist` で owner 未宣言の path は Missing in Plan と Unknown の両方に分類する。Unknown は publication violation とみなさない。一方、削除済みかつ publication 非許可の既知 path が `dist` に残れば Publication Violation とする。site public asset による shadow の既存優先順位は変えない。Vite artifact 集合から site public asset を除外して、既存の優先順位を誤って owner conflict と報告しない。

## 8. 増分シナリオの適用範囲

既存 Change Set は no-change、本文・リンク編集、追加、削除、rename、permalink、alias、tag、folder、public / draft / unlisted 遷移、plugin 設定、theme 変更を判定する責務を維持する。今回追加した Plan はその結果を観測・照合するだけである。

外部 preset 試験は cold / no-change / add / body / title / move / draft / public / unlisted / delete / scheduled / tamper / plugin option / full build を持ち、各通常 SSG build で Plan metrics を検証する。permalink / alias / tag / folder / theme の独立 mutation と、100 / 1,000 件の benchmark harness は **UNVERIFIED**。

## 9. Fault recovery と Publication Boundary

既存の cache checksum、cache metadata / entry の欠損・破損、dist 欠損、state 不正時の安全な regeneration 経路は変更していない。Hono SSG の既存テストで malformed cache、checksum 不正、entry 破損、不正 path、junction、未参照 entry の回収、no-change の出力検証を実行した。

`pnpm test:e2e:fault-recovery:smoke` は全 CLI fault recovery checkpoint と full build の一致を確認した。ただし、cache / state / directory fault の全ケースに Output Plan metrics を含めた E2E 再計測、および Draft / Unlisted の検索・sitemap・navigation 非漏洩の再計測は **UNVERIFIED**。既存の public manifest 契約を変更していないことと、削除出力の publication violation を unit test で検証したことを、実測の代替としては扱わない。

## 10. 実装ファイル

- `packages/core/src/content/output_plan.ts`: Plan 構築・照合の純粋関数
- `packages/core/index.ts`: 明示的な public export
- `packages/core/test/output_plan.test.ts`: Content / Hono / plugin / asset / remove / conflict / unknown / publication / deterministic の単体テスト
- `packages/integrations/honox/src/ssg/types.ts`: Output descriptor と Plan metrics
- `packages/integrations/honox/src/ssg/build_output.ts`: SSG 前 Vite build artifact の file inventory
- `packages/integrations/honox/src/ssg_plugin.ts`: SSG 実行中の観測と closeBundle 照合
- `tests/external-site/preset-fast-path.ts`: 外部presetでの Plan coverage 検証

## 11. 実行した検証

| コマンド | 結果 |
| --- | --- |
| `pnpm exec biome check ...`（Plan、SSG、external preset対象6 files） | PASS |
| `pnpm exec tsx --test packages/core/test/output_plan.test.ts packages/integrations/honox/test/ssg_plugin.test.ts` | PASS（22 / 22） |
| `pnpm typecheck` | PASS（146 projects OK） |
| `pnpm build:packages` | PASS（84 packages、Plan基盤修正後） |
| `pnpm test:e2e:preset-fast-path` | 実行中（完了結果はこの時点で未確定） |
| `git diff --check` | PASS |

## 12. 未実行の計測・検証

- Empty / Minimal / Starter / Showcase の 100 / 1,000 件、Clean / Incremental の Plan metrics と Clean SHA 比較: **UNVERIFIED**
- permalink / alias / tag / folder / theme の独立 mutation: **UNVERIFIED**
- cache / state / directory fault の E2E と Plan metrics: **UNVERIFIED**
- Draft / Unlisted の検索、sitemap、navigation の E2E 漏洩検証: **UNVERIFIED**
- Linux での検証: **UNVERIFIED**

未実行のため、wall time、CPU、I/O、RSS の preset 比較値や Output Plan の実プリセット件数は報告しない。

## 13. 次段階

1. Empty / Minimal / Starter / Showcase（100 / 1,000）で cold / no-change と全 mutation の Clean SHA・Plan metrics を採取する。
2. cache/state/dist fault と publication boundary を含めた E2E で、Missing / Unknown / Conflict / Violation が期待どおり観測されることを確認する。
3. Hono static route、client asset、site public asset、plugin external input の dependency と owner precedence を完全に宣言できたものだけを次 phase の skip 可否候補にする。
4. それまでは `toSSG()` の通常経路を維持する。
