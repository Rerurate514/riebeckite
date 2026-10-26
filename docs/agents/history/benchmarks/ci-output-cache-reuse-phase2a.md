# Riebeckite Phase 2A レポート: SSG Output Cache 再利用の根本原因と修正

対象リポジトリ: `riebeckite`
作業ブランチ: `main`（ベースは `274fec46`。Phase 1 監査の `49eb187b` の後、別セッションが `274fec46` を積んだ状態で作業した）
計測環境: Windows 11 (win32/x64) / Node.js v24.11.1 / pnpm 11.5.3
計測種別: **ローカル CI シミュレーション**（GitHub Actions 上では未計測）
計測ハーネス: `benchmarks/preset-ssg/ci-runner.mjs`（`--cacheOutput true` = `.riebeckite/cache`、`.riebeckite/build/content-state.json`、`.riebeckite/ssg-output-cache.json` と `.entries` を別ディレクトリへ復元）

このレポートは Phase 1 の `benchmarks/reports/ci-incremental-build-audit.md` の追記ではなく、Phase 2A の作業記録として独立させている。Phase 1 の数値はそのまま保持する。

---

## 1. Executive Summary

**結論: showcase で output cache が再利用されなかった原因は、独立した 2 つの不具合（R1 と R2）だった。両方を修正し、starter / showcase のどちらでも「別ディレクトリへ復元した output cache から、変わっていない出力を安全に再利用する」ことが成立した。**

修正前後（showcase/100/no-change、output cache 復元あり）の決定的な差分:

| metrics | 修正前 | 修正後 |
| --- | --- | --- |
| `fullRegenerationRequired` | `true` | `false` |
| `reusedOutputCount` | `0` | `322` |
| `renderedOutputCount` | `268` | `0` |
| `enumeratedRouteCount` | `276` | `9` |
| `renderedRouteCount` | `268` | `0` |
| `skippedRouteCount` | `0` | `262` |
| `affectedOutputCount` | `0` | `0` |
| `unchangedOutputCount` | `322` | `322` |
| no-change fast path | 不成立 | 成立 |

- R1: 外部依存の解決が build-time plugin cache の有効化より先に走っていたため、plugin cache を使う外部依存（`rename`）が **毎回** 失敗扱いになり、`fullRegenerationRequired = true` になっていた。
- R2: `rename` の外部依存 fingerprint が「ビルド自身が書き換えるルート台帳の全体」を覆っていたため、台帳の更新だけで全出力が「影響あり」と判定されていた。
- 修正は Starter/Showcase の分岐を一切追加していない。どちらも既存アーキテクチャのまま正しく判定されるようになった。
- 正常系 10 シナリオ、異常系（既存スイート）のすべてで incremental 出力 = clean 出力を確認した。

**判定: READY。**

---

## 2. 根本原因

### 2.1 R1: 外部依存の解決が `enableBuildTime()` より先に走る

`ContentManager.createBuildPlan()`（`packages/core/src/content/content_manager.ts`）は `pluginRuntime.resolveExternalDependencies()` を呼ぶ。しかし build-time の plugin cache を有効化する `enableBuildTime()` は `buildManifest()` からのみ呼ばれており、SSG ビルドの最初の content 呼び出しは `ssg_plugin` → `content.getOutputChangeSet()` → `getBuildPlan()` → `createBuildPlan()` であるため、**外部依存の解決時点で `PluginRuntime.isBuildTime === false`** だった。

その結果 `cacheFor(plugin)` が `createUnavailablePluginCache()` を返し、`get()` が次の例外を投げる。

```
Plugin cache is available only through an explicit build context.
```

showcase で有効な外部依存プラグインは `webmention` と `rename`。このうち `rename` の `resolveExternalDependencies` は `cache.get("routes.lock")` を呼ぶため、例外が `{ kind: "unavailable", failure: { id: "rename:routes-lock", ... } }` に変換される。`determineOutputChanges`（`packages/core/src/content/output_dependency.ts`）は

```ts
fullRegenerationRequired =
  (externalDependencyFailures?.length ?? 0) > 0 ||
  current.some((output) => output.dependencies.some((d) => d.type === "unknown"));
```

であるため、**毎ビルドで `fullRegenerationRequired = true`** になっていた。

実測（計測用の一時ログ。修正 (1) の前後で `externalDependencyFailures` を観測）:

```json
{"cacheValid":false,"fullRegenerationReasons":["cache-missing-or-invalid","external-dependency-unavailable"],
 "failureIds":["rename:routes-lock"],
 "failureReasons":["Plugin cache is available only through an explicit build context."]}
```

`ssg_plugin.ts` の `canUseIncremental` は `!outputChangeSet.fullRegenerationRequired` を要求するため、showcase では output cache が常に棄却されていた。

なお、失敗した依存 ID は前回 state の `externalDependencies` にも現在のスナップショットにも現れないため、`changedExternalScopes` は空のままになる。これが Phase 1 で観測された「`unchangedOutputCount = 322`、`affectedOutputCount = 0`、それでも `reusedOutputCount = 0`、`fullRegenerationRequired = true`」という一見矛盾した組み合わせの正体である。

**修正 (1):** `createBuildPlan()` の先頭で `this.enableBuildTime()` を呼ぶ（`buildManifest()` 側にも従来どおり呼び出しがあり、二重呼び出しは冪等）。

### 2.2 R2: `rename` の外部依存 fingerprint がビルド自身の書き換える台帳全体を覆う

修正 (1) の後も再利用は成立しなかった。実測した増分ビルドの状態:

```json
{"cacheValid":true,"pipelineFingerprintMatch":true,"fullRegenerationReasons":[],
 "failureIds":[],"snapshotIds":["webmention:all-mentions","rename:routes-lock"],
 "previousSnapshotIds":["webmention:all-mentions","rename:routes-lock"],
 "added":0,"changed":0,"removed":0}
```

失敗は 0 件になった。しかし `affectedOutputCount = 322`、`unchangedOutputCount = 0` であり、`fullRegenerationRequired = false` なのに再利用できない。

`rename` は外部依存スナップショットを `scope: { type: "all" }`、`fingerprint: fingerprintExternalValue(lock)`（**ロック全体**）で公開していた。ロックにはルート台帳（`slug → { permalink, contentHash, id }`）が含まれ、`rename` 自身が `onManifestCreated` でそのロックを書き戻す。つまり:

1. コールドビルドでは plugin cache が空なので、解決されるロックは `emptyRouteLock()`。ビルドの最後に全ルートを含むロックを書き込む。
2. 次回（復元後）のビルドでは、解決されるロックに全ルートが入っている。fingerprint が変わる。
3. `externalDependenciesEqual(previous, current)` が false になり `plan.reusableOutputs` が undefined。
4. `determineOutputChanges` にフォールバックし、`rename:routes-lock` が `changedExternalScopes` に入る。`isAffectedByExternalScope` は scope `all` に対して常に true を返すため、**全 322 出力が affected** になる。

これは body edit でも同様に発生する（本文が変わるとロックの `contentHash` が変わり、ロック全体の fingerprint が変わる）。つまり修正前の showcase は、no-change だけでなく body edit でも rename 経由で全出力が無効化されていた。

**修正 (2):** `rename` の外部依存 fingerprint を「適用済みリダイレクト集合」に絞る。

```ts
fingerprint: fingerprintExternalValue(lock.redirects),
scope: { type: "all" },
value: lock,
```

`value` は従来どおりロック全体を渡す（`onManifestCreated` のリネーム検出に `previous.routes` が必要なため）。

**安全性の根拠:** `rename` の出力への影響は `applyRouteRedirects(manifest, result.lock.redirects)` だけである。ルートの追加・削除は content change set と output inventory（redirect は独立した `kind: "redirect"` 出力）ですでに無効化される。`reusableOutputs` が採用されるのは change set が空のときに限られ、その条件では `prev.routes === curr.routes`（同一の entry fingerprint と同一の pipelineFingerprint から決定的に導かれる）なので `diffRoutes` の追加は発生せず、出力は `prev.redirects` のみで決まる。scope は `all` のまま維持しているため、リダイレクト集合が変わったときは従来どおり全出力を保守的に無効化する。

---

## 3. Starter と Showcase で挙動が異なった理由

- Starter のプリセットには `resolveExternalDependencies` を実装したプラグインが 1 つも無い（`webmention` / `rename` / `diff` が実装しており、`diff` はどのプリセットにも入っていない）。したがって R1 の「plugin cache 未確立による外部依存失敗」が発生せず、`fullRegenerationRequired` は false のままだった。
- Starter には `rename` も無いため R2 も発生しない。
- Showcase は `rename` と `webmention` を含むため、R1（rename の解決失敗）と R2（rename の fingerprint 過剰）の両方を踏んでいた。
- 既存テストで検出されなかった理由: `packages/integrations/honox/test/ci_persistent_state.test.ts` のテストサイトは `demo` プラグインのみで構成され、`resolveExternalDependencies` を持つプラグインも plugin cache をビルド中に読み書きするプラグインも無い。R1・R2 はどちらも「plugin cache を外部依存の解決で読む」プラグインが無いと再現しない。

---

## 4. 修正内容

| # | ファイル | 変更 |
| --- | --- | --- |
| 1 | `packages/core/src/content/content_manager.ts` | `createBuildPlan()` の先頭で `enableBuildTime()` を呼ぶ |
| 2 | `packages/plugins/rename/index.ts` | 外部依存 fingerprint を `lock` から `lock.redirects` に変更 |
| 3 | `packages/integrations/honox/src/ssg_plugin.ts` | 棄却理由を構造化 metrics として出力（第 5 章） |
| 4 | tests | 下記の回帰テストを追加 |

プリセット固有の分岐、Starter/Showcase 専用の条件分岐、新しいキャッシュ層、新しいグローバル状態は追加していない。キャッシュ破損時・output cache 欠損時は従来どおり安全に全再生成へフォールバックする。

---

## 5. 増分判定 metrics

`canUseIncremental` の判定を、そのまま構造化 metrics として出力するようにした（`SsgOutputMetrics`）。

- `outputCacheDecision`: `{ changeSetPresent, changeSetRequiresFullRegeneration, outputCacheLoaded, appFingerprintMatch, clientManifestFingerprintMatch, uncoveredUnchangedCount }`
- `outputCacheRejectionReason`: 再利用したときは `null`、棄却したときは次のいずれか
  - `change-set-unavailable` — output change set が取得できない
  - `full-regeneration-required` — 外部依存の失敗、または `unknown` 依存が存在する
  - `output-cache-missing-or-invalid` — cache が無い、または整合性検査（スキーマ・entry ファイル・チェックサム）に失敗した
  - `app-fingerprint-changed`
  - `client-manifest-fingerprint-changed`
  - `unchanged-output-not-cached` — 変わっていない出力の一部が site 所有でも cache 内でもない

既存 metrics は維持しており、`fullRegenerationRequired` は「cache を棄却した」ことを意味する（従来と同じ意味）。人間向けログ（`RIEBECKITE_SSG_DIAGNOSTICS=1`）も `output cache miss (<reason>)` と理由を出す。絶対パスは判定にも cache key にも入らない。

---

## 6. 修正前後の性能比較

計測は `benchmarks/preset-ssg/ci-runner.mjs`、`--cacheOutput true`、100 記事。修正前の値は Phase 1 の再現計測（`--keep true` で再現した元の失敗、`fullRegenerationRequired = true`）と Phase 1 レポートの値。修正後は同一ハーネス・同一環境。

**この環境は他セッションと共有しており、壁時計時間はノイズが大きい。** ビルド総時間の大半は `ssrModuleLoad`（Vite/HonoX の SSR モジュール読込、5.6〜9.3 秒）という固定コストで、キャッシュ判定とは独立に毎回支払う。したがって下表では決定的なカウンタ（`reusedOutputCount` / `renderedOutputCount`）を主指標とし、壁時計は参考値として扱う。

### 6.1 showcase/100/no-change（output cache 復元あり）

| 指標 | 修正前 | 修正後 |
| --- | --- | --- |
| `fullRegenerationRequired` | `true` | `false` |
| `reusedOutputCount` | `0` | `322` |
| `renderedOutputCount` | `268` | `0` |
| `emittedOutputCount` | `336` | `330` |
| `candidateOutputCount` | `322` | `322` |
| `unchangedOutputCount` | `322` | `322` |
| `affectedOutputCount` | `0` | `0` |
| `cacheEntriesRead` | `330` | `330` |
| `cacheEntriesSerialized` | `330` | `330` |
| `enumeratedRouteCount` | `276` | `9` |
| `renderedRouteCount` | `268` | `0` |
| `skippedRouteCount` | `0` | `262` |
| `contentReusedCount` | `128` | `128` |
| `outputCacheRejectionReason` | （metrics 未実装。同条件の再計測では `full-regeneration-required`） | `null` |
| output cache 書き込み（entries write / copy / rename） | 825 / 304 / 248 ms | 20 / 6.5 / 5.4 ms |
| `coldMs` / `incrementalMs` / `cleanMs` | 17512 / 17662 / 21223 | 22046 / 21693 / 24170 |
| cache size | 30.37 MB | 28.99 MB |

修正後は no-change fast path が成立し、`outputRendered = 0`、`reused = 322`。cache の内容は変わらないため（修正は「使えるかどうか」の判定のみ）、容量は実質同一。entries の書き込みコストがほぼ消えているのは、変更された出力が 0 件で entry の再書き込みが発生しないためである。

### 6.2 starter/100/no-change（output cache 復元あり）

Starter は修正前から成立していた（Phase 1 の +14%）。修正後も同様に成立する。

| 指標 | 修正後 |
| --- | --- |
| `fullRegenerationRequired` | `false` |
| `reusedOutputCount` | `256` |
| `renderedOutputCount` | `0` |
| `candidateOutputCount` | `256` |
| `contentReusedCount` | `105` |
| `outputCacheRejectionReason` | `null` |
| `coldMs` / `incrementalMs` / `cleanMs` | 15825 / 14134 / 15353 |
| cache size | 5.28 MB |

### 6.3 シナリオ別（修正後、`--runs 1`、100 記事）

`aff` = affected, `unchg` = unchanged, `rend` = rendered, `reuse` = reused。`routes` は enumerated / rendered / skipped。

| preset | scenario | cold ms | inc ms | clean ms | contentReused | cand | aff | unchg | rend | reuse | full | routes | 出力一致 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| starter | no-change | 15825 | 14134 | 15353 | 105 | 256 | 0 | 256 | 0 | 256 | false | 5/0/212 | ✓ |
| starter | single-body-edit | 14101 | 16078 | 15654 | 104 | 256 | 246 | 10 | 212 | 10 | false | 216/212/0 | ✓ |
| starter | link-edit | 17188 | 17822 | 18366 | 104 | 256 | 246 | 10 | 212 | 10 | false | 216/212/0 | ✓ |
| starter | add | 18195 | 15993 | 24103 | 105 | 263 | 135 | 128 | 122 | 128 | false | 126/122/94 | ✓ |
| starter | delete | 19514 | 16559 | 17897 | 104 | 254 | 244 | 10 | 210 | 10 | false | 214/210/0 | ✓ |
| showcase | no-change | 22046 | 21693 | 24170 | 128 | 322 | 0 | 322 | 0 | 322 | false | 9/0/262 | ✓ |
| showcase | single-body-edit | 23983 | 23682 | 20815 | 127 | 322 | 174 | 148 | 163 | 148 | false | 171/163/99 | ✓ |
| showcase | link-edit | 22061 | 21691 | 20738 | 127 | 322 | 181 | 141 | 164 | 141 | false | 172/164/98 | ✓ |
| showcase | add | 22394 | 20517 | 23062 | 0 | 329 | 328 | 1 | 272 | 1 | false | 280/272/0 | ✓ |
| showcase | delete | 20236 | 21899 | 20219 | 0 | 320 | 319 | 1 | 266 | 1 | false | 274/266/0 | ✓ |

- showcase は body edit / link edit で部分再利用が成立する（修正前は rename の fingerprint 過剰により全出力が無効化されていた）。
- showcase の add / delete で `contentReused = 0`、`unchanged` がほぼ 0 になるのは `l10n` の global 依存によるもので、Phase 1 §8.4 で特定済みの別課題（P1-2）。output cache の再利用とは独立で、今回の修正ではこの過剰無効化は変わらない。
- 壁時計では増分が clean を明確に下回らないシナリオが多いが、これは上記の固定コスト（`ssrModuleLoad` 5.6〜9.3 秒）と環境ノイズが支配的で、100 記事規模では出力再利用の差が総時間に埋もれるためである。決定的カウンタでは rend/reuse が明確に改善している。

---

## 7. Clean Build との出力一致

ハーネスは各サンプルで「incremental の dist」と「同一ソースからの clean build の dist」を snapshot 比較する。第 6.3 章の 10 シナリオすべてで一致（`equal = true`）。`ci_persistent_state.test.ts` も全シナリオで `diffSnapshotKeys(incremental, cold) === []` を検証しており、こちらも PASS。

---

## 8. 回帰テスト

| スイート | 結果 |
| --- | --- |
| `packages/integrations/honox/test/ci_persistent_state.test.ts` | 29 subtests PASS（新規 2 件を含む。全体 46 tests / 0 fail で実行） |
| `packages/plugins/rename/test/rename.test.ts` | 16 tests / 0 fail（新規 1 件を含む） |
| `pnpm test:benchmark:presets` | 9 tests / 0 fail |
| `benchmarks/preset-ssg/ci-runner.mjs`（第 6 章） | 10 サンプルすべて `equal = true`、`full = false` |

追加したテスト:

1. `ci_persistent_state.test.ts` の `output-cache-external-dependency`（R1）: plugin cache を外部依存の解決で読み、ビルド中に書き戻すプラグイン（テストサポートに追加した `external` プラグイン。`rename` と同じ構造）を使い、output cache 復元後の no-change で `fullRegenerationRequired = false` / 再利用あり / `affectedOutputCount = 0` を検証する。修正 (1) の前はこのシナリオで再利用が成立しない。
2. `ci_persistent_state.test.ts` の `output-cache-app-fingerprint-change`（異常系）: 本文は変更せず app ソース（`app/render.ts` のタグ）だけを変え、output cache を復元する。`fullRegenerationRequired = true` / 再利用なし / `affectedOutputCount = 0` を検証する（= app fingerprint の不一致だけで cache が棄却される）。clean 出力との一致も同時に検証する。
3. `ssg_plugin.test.ts` の `output cache reuse is rejected whenever a safety condition fails`: `decideOutputCacheRejection` の 6 つの棄却理由（`change-set-unavailable` / `full-regeneration-required` / `output-cache-missing-or-invalid` / `app-fingerprint-changed` / `client-manifest-fingerprint-changed` / `unchanged-output-not-cached`）と、全条件成立時に `undefined`（= 再利用）を検証する。
4. `rename.test.ts` の `dependency fingerprint tracks applied redirects, not route bookkeeping`: ロックが空 → ルート台帳 populated に変わっても redirects が空なら fingerprint が不変であること、リダイレクトが発生すると fingerprint が変わることを検証する。

異常系（output cache 欠損・破損、content-state 破損、PCC 破損、スキーマ不一致、公開状態の変更、plugin 順序変更、cacheVersion 変更など）は既存の `ci_persistent_state.test.ts` のシナリオで引き続き検証しており、すべて PASS。テスト期待値を緩めることで PASS させた箇所は無い。

---

## 9. 変更ファイル

- `packages/core/src/content/content_manager.ts` — R1 修正
- `packages/plugins/rename/index.ts` — R2 修正
- `packages/integrations/honox/src/ssg_plugin.ts` — 棄却理由の構造化 metrics と診断ログ
- `packages/integrations/honox/test/ci_persistent_state.test.ts` — シナリオ 2 件、`renderTag` 差し替えのサポート
- `packages/integrations/honox/test/support/ssg_site.ts` — 外部依存プラグイン付きテストサイト
- `packages/integrations/honox/test/ssg_plugin.test.ts` — 棄却理由の unit test
- `packages/plugins/rename/test/rename.test.ts` — fingerprint の unit test
- `docs/docs/plugins/rename.md` / `rename.ja.md` — 増分ビルドでの fingerprint の範囲
- `docs/docs/glossary/output-cache.md` / `output-cache.ja.md` — 再利用判定と metrics
- `tests/external-site/preset-fast-path.ts` — showcase の no-change fast path ブロック理由の期待値更新（`unsafe-output-dependency` → `plugin-build-end`）。修正前の期待値は R1 の不具合を契約として固定していた。

---

## 10. 残課題・Phase 2B

1. **公式デプロイテンプレートが output cache を復元しない（Phase 1 P1-1）。** Phase 2A の修正は「復元された output cache を正しく使う」ための修正であり、復元されなければ従来どおり全再生成になる（`outputCacheRejectionReason = "output-cache-missing-or-invalid"`）。テンプレート側の対応が別途必要。
2. **l10n の global 依存による過剰無効化（Phase 1 P1-2）。** showcase の add / delete で `contentReused = 0` になる。output cache の部分再利用もほぼ 0 になる。
3. **`manifestHookCache` の肥大化（Phase 1 P0-2）**、`ssrModuleLoad` の固定コスト削減（P2-2）、content cache の GC（P2-1）は未着手。
4. showccase の CLI no-change fast path は依然としてプラグイン（`mermaid` の `buildEnd`）でブロックされる。これは SSG output cache の再利用とは別の判定であり、プラグイン側の対応が要る。
5. 計測は `--runs 1` のため、壁時計時間の比較は参考値に留まる。1000 記事規模は未計測。
