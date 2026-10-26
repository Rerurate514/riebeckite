# Phase 2G-V: Determinism and Test Stability Closure

## Status

READY. The Showcase / 1000 no-change mismatch is fixed and its former
`search-data.json` attribution is withdrawn. The separately reported
file-level `@riebeckite/plugin-diff` failure was not reproducible in this
environment, so no speculative test-stability change was made.

## Scope and baseline

- Baseline commit: `93f0dca5` (`Propertiesの出力依存を絞り込む`).
- Worktree: `audit/phase2g-v`, clean before this work.
- Comparison: each incremental `dist` and output cache was compared with a
  state-free cold build of the same fixture.

## Showcase results

The final run is recorded in
`apps/web/.riebeckite/phase2gv-final-scenarios.json/2026-10-19T19-57-16-339Z-preset-ssg.md`.
All twelve conditions were equivalent.

| Size | Cold | No change | Body edit | Link edit | Add | Delete |
| ---: | --- | --- | --- | --- | --- | --- |
| 100 | equal | equal | equal | equal | equal | equal |
| 1000 | equal | equal | equal | equal | equal | equal |

For Showcase / 1000 no-change, the final run reused `0 / 2124` rendered /
reused outputs and matched the cold tree. Two additional independent
no-change samples also matched after the fix.

## Root cause and correction

The mismatch was not Search-specific and was not reproduced as Marp renderer
reentrancy. A 20-round, 24-distinct-deck parallel Marp probe kept every deck's
own token, so a serialization queue was not added.

Instead, `@marp-team/marp-core` could fail to resolve from the generated
Showcase site's bundled dynamic-import location. The failed rendering left a
Marp figure out of one build; pages that embed it and `search-data.json` then
differed. This explains why observed differences varied between runs.

`renderMarpDeck` now falls back to a `createRequire` rooted at the current
site's `package.json` when its dynamic import fails. The preset runner also
links D2 and Marp runtime dependencies into each scaffold and exposes Marp's
package through its optional alias map. Runner source assertions cover those
links and alias.

## Minimal fixture coverage

`visual_renderers_determinism.test.ts` covers ordinary Markdown, D2, Marp,
Search, persistent incremental cache, cold/cold, no-change, body edit, link
edit, add, and delete. It additionally covers public-to-draft, draft body
edit, draft-to-public, and public-to-unlisted. It verifies draft URL output is
removed, unlisted URL output remains, non-discoverable content is absent from
Search, D2/Marp reappear on publication, and every incremental tree and output
cache equals cold.

## Properties output dependencies

`properties_output_dependencies.test.ts` verifies clean equivalence for a
displayed resolved WikiLink target, unrelated content, target add/delete/rename,
public-to-draft, draft-to-public, and unresolved-target global fallback. Every
scenario remains incremental rather than requiring full regeneration.

## Publication boundary

Draft body edits do not publish a route or Search text. Draft-to-public restores
the route and renderer output. Unlisted content remains routable but is absent
from Search. The visual-renderer test compares both output files and
`ssg-output-cache.json` after every transition.

## Parallel test stability investigation

The historical report contained one `history_reader.test.ts` failure in a
parallel root run. Current investigation recorded no failure: the file passed
three isolated runs, eight simultaneous independent Node processes (all exit
code 0), and the full parallel `pnpm test` run (exit code 0). The repositories
use unique `mkdtemp` paths; no fixed temporary path, shared Git repository, or
cross-package `process.chdir` collision was found. Since no failing package,
message, or non-zero exit code could be captured, changing the test would be
speculative. Future recurrence must record the package, file, message, exit
code, and concurrent packages before a root-cause fix is made.

## Verification

| Check | Result |
| --- | --- |
| `pnpm --filter @riebeckite/plugin-marp test` | 6 / 6 pass |
| visual renderer and Properties integration tests | 10 / 10 pass |
| `pnpm test:benchmark:presets` | 11 / 11 pass |
| `pnpm test` | pass; HonoX 174 / 174, CLI 103 / 103, Web 52 / 52 |
| `pnpm typecheck` | 146 projects OK |
| Biome on all changed code files | pass |
| final Showcase matrix | 12 / 12 equivalent |

No push, merge, release, publish, or deployment was performed.

---

# Phase 2G-V: 決定性とテスト安定性の確定

## 状態

READY。Showcase / 1000 の no-change 不一致を修正し、従来の
`search-data.json` 固有という結論を撤回した。別途報告されていた
`@riebeckite/plugin-diff` のファイル単位失敗はこの環境で再現しなかったため、
推測によるテスト安定化変更は行っていない。

## 対象と基準

- 基準コミット: `93f0dca5`（`Propertiesの出力依存を絞り込む`）。
- worktree: `audit/phase2g-v`。作業開始時は clean。
- 比較方法: 各 Incremental の `dist` と Output Cache を、同じ fixture で
  状態を消した Cold Build と比較した。

## Showcase の結果

最終計測は
`apps/web/.riebeckite/phase2gv-final-scenarios.json/2026-10-19T19-57-16-339Z-preset-ssg.md`
に保存した。12 条件すべてで一致した。

| Size | Cold | no-change | 本文編集 | リンク編集 | 追加 | 削除 |
| ---: | --- | --- | --- | --- | --- | --- |
| 100 | 一致 | 一致 | 一致 | 一致 | 一致 | 一致 |
| 1000 | 一致 | 一致 | 一致 | 一致 | 一致 | 一致 |

Showcase / 1000 の no-change は最終計測で Output を `0 / 2124`
（rendered / reused）再利用し、Cold の tree と一致した。修正後に追加した独立
2 サンプルも一致した。

## 根因と修正

この不一致は Search 固有ではなく、Marp renderer の reentrancy でもなかった。
24 種類の deck を 20 回並列実行する probe では、すべての deck に固有 token が
残ったため、直列 queue は追加していない。

原因は、生成された Showcase site の bundled dynamic import の位置から
`@marp-team/marp-core` を解決できないことだった。rendering に失敗した build では
Marp figure が欠け、それを含むページと `search-data.json` が異なった。このため、
差分ファイルが実行ごとに変化していた。

`renderMarpDeck` は dynamic import が失敗した場合だけ、現在の site の
`package.json` を基準とする `createRequire` に fallback するようにした。Preset
runner は各 scaffold に D2 / Marp の runtime dependency を link し、Marp package
を optional alias map にも公開する。Runner source assertion はこの link と alias
を検査する。

## 最小 fixture の確認範囲

`visual_renderers_determinism.test.ts` は通常 Markdown、D2、Marp、Search、
Incremental Cache、Cold/Cold、no-change、本文編集、リンク編集、追加、削除を検証する。
さらに public → draft、draft の本文編集、draft → public、public → unlisted を検証する。
draft の URL 出力削除、unlisted の URL 出力維持、非 discoverable content の Search
除外、公開復帰後の D2 / Marp 出力、各遷移の Incremental tree と Output Cache の Cold
一致を確認する。

## Properties の Output 依存

`properties_output_dependencies.test.ts` は、表示対象の解決済み WikiLink、無関係な
記事、target の追加・削除・rename、public → draft、draft → public、未解決 target の
global fallback を検証する。全 scenario が full regeneration ではない Incremental として
Cold と一致する。

## publication boundary

draft の本文編集は route も Search text も公開しない。draft → public では route と
renderer output が復元される。unlisted は routable のまま Search から除外される。
visual-renderer test は各遷移後の出力ファイルと `ssg-output-cache.json` を比較する。

## 並列テスト安定性の調査

過去のレポートには並列 root run 中の `history_reader.test.ts` 失敗が 1 回あった。
今回の調査では失敗を記録できなかった。単独 3 回、独立した Node process を 8 本同時、
並列 `pnpm test` のすべてが exit code 0 で成功した。repository は一意な `mkdtemp`
path を使い、固定 temporary path、共有 Git repository、package をまたぐ
`process.chdir` の衝突は確認できなかった。失敗 package、message、非ゼロ exit code を
取得できていないため、テストを変更することは推測修正になる。再発時は package、file、
message、exit code、同時実行 package を記録してから根因修正する。

## 検証

| 確認 | 結果 |
| --- | --- |
| `pnpm --filter @riebeckite/plugin-marp test` | 6 / 6 pass |
| visual renderer と Properties の integration test | 10 / 10 pass |
| `pnpm test:benchmark:presets` | 11 / 11 pass |
| `pnpm test` | pass。HonoX 174 / 174、CLI 103 / 103、Web 52 / 52 |
| `pnpm typecheck` | 146 projects OK |
| 変更した全 code file の Biome | pass |
| 最終 Showcase matrix | 12 / 12 一致 |

push、merge、release、publish、deploy は実行していない。
