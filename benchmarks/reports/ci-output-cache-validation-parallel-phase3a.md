# Phase 3A: Output Cache Validation Parallelization

## 結論

**ADOPTED**。出力キャッシュの各 entry の安全なファイル検査と SHA-256 照合を、同時に最大 12 件まで実行する。検証対象、パス検査、通常ファイル検査、checksum 不一致時の cache 無効化は変更しない。失敗時は従来どおり cache を使わず、通常の完全生成へフォールバックする。

`toSSG()`、Content scan、fingerprint、inventory、plugin hook、Vite/HonoX の内部 API には変更を加えない。

## 変更

- 対象: `packages/integrations/honox/src/ssg/output_cache.ts`
- `validateOutputCacheEntries` の独立した entry 検証を、上限 12 の worker pool で実行する。
- 任意の worker が失敗すると結果は `false` になる。すでに開始した read/checksum は読み取り専用であり、完了後も cache は採用されない。
- 13 entry の末尾を改ざんするテストを追加し、concurrency 上限を超える entry も漏れなく検証されることを確認した。

## 計測

環境: Windows x64、Node v24.11.1、pnpm 11.5.3。stage は wall-clock の inclusive time であり、入れ子または並行 span を合算してはならない。

| 条件 | Before | After | 差分 | Cache hit / miss | Output rendered / reused | Clean SHA tree |
| --- | ---: | ---: | ---: | --- | --- | --- |
| Starter / 100 / no-change / wall ms | 51,286 (1 回) | 53,462 (3 回中央値) | 比較不能 | 260 / 0 | 0 / 256 | true |
| Starter / 100 / cache entry validate ms | 604 (1 回) | 229 (3 回中央値) | -375 | 260 / 0 | 0 / 256 | true |
| Starter / 1,000 / no-change / wall ms | 未計測 | 48,137 (1 回) | — | 2,044 / 0 | 0 / 2,040 | true |
| Starter / 1,000 / cache entry validate ms | 未計測 | 1,060 (1 回) | — | 2,044 / 0 | 0 / 2,040 | true |

Before artifact: `C:\Users\rerur\AppData\Local\Temp\opencode\ssg-phase-next-before.json\2026-10-26T03-52-11-043Z-preset-ssg.json`。

After artifacts:

- `C:\Users\rerur\AppData\Local\Temp\opencode\ssg-phase-next-after\2026-10-26T04-02-23-495Z-preset-ssg.json`
- `C:\Users\rerur\AppData\Local\Temp\opencode\ssg-phase-next-after-1000\2026-10-26T04-16-45-847Z-preset-ssg.json`

100 件の全体 wall time は SSR module load などの環境変動が大きく、Before が 1 回だけであるため改善値を主張しない。一方、After では 2,044 entry の checksum を全件実施し、entry validation の wall time は 1.06 s だった。checksum span の合計は並行実行時に重複するため、validation wall time と比較・加算しない。

## 正しさと回復性

- `benchmark:presets` は各条件で incremental と state を削除した Clean build の全 output tree を SHA-256 比較し、一致した。
- 追加テストは 13 entry の cache を一度正常に読み込み、最後の cached entry を改ざんして次の読み込みが `undefined` になることを確認する。
- `test:e2e:fault-recovery:smoke` は外部パッケージとしての CLI fault recovery checkpoint が full build と一致した。
- `benchmark:equivalence` は body/title/frontmatter/add/delete/rename/public-to-draft を含む 8 条件で cold build と一致した。

## 検証

| 項目 | 結果 |
| --- | --- |
| `node --import tsx --test test/ssg_plugin.test.ts` | PASS: 18 / 18 |
| `pnpm benchmark:presets -- --presets starter --sizes 100 --scenarios no-change --runs 3 ...` | PASS: 3 / 3 Clean SHA tree 一致 |
| `pnpm benchmark:presets -- --presets starter --sizes 1000 --scenarios no-change --runs 1 ...` | PASS: Clean SHA tree 一致 |
| `pnpm benchmark:equivalence` | PASS: 8 / 8 cold build と一致 |
| `pnpm test:e2e:fault-recovery:smoke` | PASS |
| `pnpm typecheck` | PASS: 3 projects、型エラーなし |
| `pnpm check` | PASS: exit 0。既存の `slides/riebeckite-overview.html` に警告 8 件・info 4 件 |
| `pnpm build` | PASS: package と web build 完了 |
| body/link/add/delete/publication/config/theme/plugin/external failure の full SSG SHA 比較 | UNVERIFIED: 今回の変更向けに全組合せは再実行していない |

## 残存リスク

- ストレージが低速または共有される環境では、12 並列 read が sequential より有利とは限らない。検証の完全性を保つため、回避または省略はしない。
- SSR module load、通常の `toSSG`、final inventory はこの変更の対象外であり、no-change wall time の支配要因として残る。
