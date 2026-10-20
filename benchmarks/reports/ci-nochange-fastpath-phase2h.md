# Phase 2H: No-change Fast Path Performance Optimization

## 結論

**READY（計測基盤と残存コスト分析。最適化実装なし）**。No-change は全 Content Output を再利用しているが、Starter / Showcase とも CLI の完全 skip fast path には入らない。Vite/SSG を含む 3 回中央値では、残存 wall time の主因は output 再描画・書き込みではなく、Vite/SSR module load、通常 SSG の `toSSG`、出力 cache entry 検証と inventory である。

今回の根拠だけで性能最適化は実装しない。特に Content discovery/fingerprint と output integrity 検証を省略する案は、追加・削除・公開状態遷移・改ざん検出の契約を失うため除外する。

## 範囲と方法

- 比較元: `cae1e37b mainの最新変更をPhase 2統合へ反映`
- branch: `perf/phase2h-nochange-fastpath`
- 環境: Windows x64、Node v24.11.1、pnpm 11.5.3、Intel Core i7-14700KF（20 cores / 28 logical processors）、32,581 MiB RAM
- コマンド: `pnpm benchmark:presets --presets starter,showcase --sizes 100,1000 --scenarios cold,no-change,single-body-edit --runs 3`
- 結果: `C:\Users\rerur\AppData\Local\Temp\opencode\phase2hb-preset-results\2026-10-19T22-40-26-183Z-preset-ssg.json`
- 各 scenario は独立に scaffold し、incremental output と Build State を削除した Clean Build の output tree を全ファイル SHA-256 で比較した。
- wall、Peak RSS、CPU user/system、OS filesystem read/write call 数、stage は各 3 回の中央値。CPU/I/O は Vite `build()` 区間のみで、`process.resourceUsage()` の `fsRead` / `fsWrite` は byte 数ではなく OS が報告する呼出数である。
- `processStartupElapsedMs` は worker process 起動から build setup 開始までの経過時間であり、OS の process creation time そのものではない。

stage はすべて **inclusive（包含時間）** である。入れ子や並行 span を加算して wall time と比較してはならない。

## 全体計測

| Preset | 件数 | Scenario | wall ms | CPU user / system ms | Peak RSS MiB | fs read / write calls | Content processed / reused | Output rendered / reused | Clean 一致 |
| --- | ---: | --- | ---: | --- | ---: | --- | --- | --- | --- |
| Starter | 100 | cold | 18,599 | 28,078 / 6,547 | 1,320 | 16,259 / 390 | 105 / 0 | 212 / 0 | true |
| Starter | 100 | no-change | 13,608 | 21,422 / 6,579 | 1,175 | 16,184 / 278 | 0 / 105 | 0 / 256 | true |
| Starter | 100 | body edit | 15,362 | 24,704 / 6,172 | 1,323 | 16,309 / 280 | 1 / 104 | 212 / 10 | true |
| Starter | 1,000 | cold | 92,812 | 99,938 / 11,563 | 2,567 | 27,648 / 2,195 | 1,005 / 0 | 1,940 / 0 | true |
| Starter | 1,000 | no-change | 20,583 | 26,062 / 8,328 | 1,474 | 27,616 / 2,082 | 0 / 1,005 | 0 / 2,040 | true |
| Starter | 1,000 | body edit | 114,865 | 121,390 / 13,078 | 2,550 | 27,763 / 2,084 | 1 / 1,004 | 1,942 / 10 | true |
| Showcase | 100 | cold | 29,970 | 46,687 / 8,938 | 1,522 | 21,676 / 393 | 128 / 0 | 268 / 0 | true |
| Showcase | 100 | no-change | 24,832 | 43,094 / 8,547 | 1,545 | 21,472 / 384 | 8 / 128 | 0 / 322 | true |
| Showcase | 100 | body edit | 23,562 | 40,641 / 7,594 | 1,538 | 21,503 / 385 | 9 / 127 | 163 / 148 | true |
| Showcase | 1,000 | cold | 66,493 | 81,968 / 15,359 | 2,017 | 30,500 / 2,217 | 1,028 / 0 | 2,016 / 0 | true |
| Showcase | 1,000 | no-change | 29,392 | 41,750 / 11,750 | 1,525 | 30,278 / 2,222 | 8 / 1,028 | 0 / 2,124 | true |
| Showcase | 1,000 | body edit | 52,428 | 68,219 / 14,110 | 2,201 | 30,492 / 2,225 | 9 / 1,027 | 1,064 / 1,049 | true |

Cold と body edit は Output 再描画量が異なるため、no-change と同じ critical path とは扱わない。no-change は 4 条件すべてで Output rendered が 0 であり、再利用率を上げる余地ではない。

## No-change の stage 内訳

| Preset | 件数 | SSR module load | Output dependencies | Cache checksum | Cache entry validate | `toSSG` | Cached output reuse | Output inventory | Cache entries write |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Starter | 100 | 10,017 | 173 | 251 | 301 | 215 | 271 | 217 | 14 |
| Starter | 1,000 | 7,917 | 817 | 1,616 | 1,896 | 1,540 | 1,437 | 1,291 | 21 |
| Showcase | 100 | 9,147 | 216 | 263 | 316 | 9,393 | 234 | 443 | 30 |
| Showcase | 1,000 | 7,903 | 942 | 1,540 | 1,858 | 12,239 | 1,103 | 1,364 | 25 |

単位は ms の 3 回中央値。`toSSG` は route rendering だけでなく通常 SSG 経路の orchestration を含む。`Cached output reuse` と `Output inventory` は `toSSG` と重なる包含 span である。cache checksum と entry validate は output cache の整合性検証であり、改ざん・欠損を検出するために必要である。

### critical path

1. 全構成で Vite server/SSR module load が 7.9–10.0 s を占める。
2. Showcase では plugin contract により通常 SSG が必要であり、`toSSG` が 9.4–12.2 s のもう一つの支配区間となる。
3. 1,000 件では output cache entry checksum + validate が Starter 3.5 s、Showcase 3.4 s、inventory が 1.3–1.4 s に増加する。
4. Content / Output の再描画・output write は no-change では 0 / 数 ms であり、支配因子ではない。

Starter の CLI block reason は `plugin-generated-output-plan`、Showcase は `plugin-build-end` である。Starter の taxonomy / hover-preview は discoverable/routable 集合から生成物を計画し、Showcase の mermaid / quality / diagnostics には `buildEnd` 契約がある。そのため、出力を再利用しても Vite/SSG の通常経路へフォールバックする。

## 改善候補の評価

| 候補 | 期待対象 | 判定 | 理由と必要な検証 |
| --- | --- | --- | --- |
| plugin hook を cacheable / side-effect-free と明示して no-change で skip | Showcase `toSSG`、Vite 通常経路 | 次段階候補 | plugin ごとに生成物、外部入力、`buildEnd` の副作用を完全に宣言できる場合のみ。tamper、削除、公開状態遷移、Clean 一致を必須とする。 |
| generated output plan の入力を descriptor 化し、同一なら skip | Starter 通常経路 | 次段階候補 | taxonomy / hover-preview の全入力集合、既存生成物の削除、alias・公開状態遷移を追跡できる必要がある。 |
| output cache checksum / inventory を省略または弱める | 1,000 件の 3.4 s + 1.3 s | 不採用 | cache 改ざん、欠損、古い output を検出できなくなる。正しさ境界のため削減対象にしない。 |
| Content scan / 全 fingerprint を省略 | Content I/O / CPU | 不採用 | 追加・削除・rename・公開状態・外部依存を過少検知する。 |
| Vite import を動的化する | startup | 不採用 | Phase 2H の Starter / 100・3 回測定で再現可能な短縮を示さず、通常 Vite/SSG が必要な契約も変えない。 |

## 追加した計測

- `benchmarks/preset-ssg/runner.mjs` は build worker の CPU user/system、fs read/write call 数、setup 開始までの elapsed、Peak RSS を結果 JSON に記録し、中央値を出す。
- `packages/cli/src/profile/profile_trace_sink.ts` はすべての trace span を stage 名ごとに aggregate する。
- `packages/cli/src/profile/renderer.ts` は generic stage を inclusive / non-additive と明示して表示する。
- `packages/cli/test/profile_trace_sink.test.ts` は stage aggregate と overlap 表記を検証する。
- `benchmarks/preset-ssg/lib.mjs` は Windows の一時ディレクトリ `EBUSY` に対し、Node 標準の最大 5 回・200 ms の削除リトライを使用する。

今回の Vite/SSG runner は CLI process startup、子 process tree、CLI Content Plan の stage を通らない。CLI profile stage の 3 回計測は **UNVERIFIED** であり、これらの数値を本レポートの critical path に混在させていない。profile 集計は次回の CLI 実行で利用可能である。

## 検証

| 項目 | 結果 |
| --- | --- |
| `pnpm benchmark:presets ... --runs 3` | PASS。12 条件、全 incremental / Clean tree が一致。初回 work root の Windows `EBUSY` は別 work root で resume して完走。 |
| `pnpm exec biome check benchmarks/preset-ssg/lib.mjs benchmarks/preset-ssg/runner.mjs ...` | PASS |
| `pnpm test:benchmark:presets` | PASS。11 / 11 |
| `pnpm exec biome check packages/cli/src/profile/profile_trace_sink.ts packages/cli/src/profile/renderer.ts packages/cli/test/profile_trace_sink.test.ts` | PASS |
| `pnpm --filter @riebeckite/cli test -- profile_trace_sink.test.ts` | PASS。CLI suite 104 / 104 |
| `pnpm typecheck` | PASS。146 projects OK |
| `git diff --check` | PASS |
| CLI profile の実測 stage / process tree | UNVERIFIED。runner が作業 site を保持しないため、独立 CLI harness が必要。 |

## 次段階

1. CLI 用に scaffold site を保持して cold / no-change / body edit を 3 回 profile し、process startup、Content Plan、plugin、`buildEnd`、子 process を同じ表に追加する。
2. 最も大きい Showcase の `buildEnd` 契約を、mermaid、quality、diagnostics の順で副作用・入力・キャッシュ可能性を監査する。
3. 契約が完全に表現できる plugin だけに no-change skip を導入し、既存 E2E の publication / delete / tamper / recovery と Clean 一致で安全性を確認する。
