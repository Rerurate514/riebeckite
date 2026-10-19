# Riebeckite Phase 2D レポート: l10n の依存関係粒度と増分無効化の改善

| 項目 | 内容 |
| --- | --- |
| 対象リポジトリ | riebeckite |
| ブランチ | main |
| ベースコミット | `a62e0df7`（Phase 2A〜2C 完了時点） |
| 計測環境 | Windows 11 / Node.js v24.11.1 / pnpm / Intel Core i7-14700KF (28) / 32 GB |
| 計測種別 | ローカル CI シミュレーション（実 GitHub Actions は未計測） |
| 計測ハーネス | `benchmarks/preset-ssg/runner.mjs`（`pnpm benchmark:presets`） |
| 関連レポート | Phase 1 `ci-incremental-build-audit.md` / Phase 2A `ci-output-cache-reuse-phase2a.md` / Phase 2B `ci-output-cache-phase2b.md` / Phase 2C `ci-build-state-optimization-phase2c.md` |

## 1. Executive Summary

Phase 1 の監査で P1-2 として残っていた「Showcase の記事追加・削除で Content Cache がほぼ全面的に無効化される」問題を修正した。

原因は l10n プラグインが宣言していた `processedContentCache.dependencyMode: "global"` と `contentOutputDependencies: [{ type: "global" }]` の 2 つである。

- `dependencyMode: "global"` は `hasGlobalContentDependency()` を真にし、**Content Location 全体の fingerprint を Content Cache のキーへ混入させる**。記事の追加・削除は Location 集合を変えるため、全ノートのキャッシュキーが変わり `contentReused = 0` になっていた。
- `contentOutputDependencies: [{ type: "global" }]` は全 Content Output を全 Content へ依存させる。

修正では l10n の依存を**ノート単位の fingerprint**へ置き換え、同時に Core へ「entry の processed-content fingerprint が変化した Content Output は影響ありとみなす」という汎用ルールを追加した。l10n 専用の分岐や巨大なキャッシュ層は追加していない。

結果（Showcase / 100、3 サンプル中央値）:

| シナリオ | contentReused（変更前 → 変更後） | contentProcessed | fullRegenerationRequired | Clean 出力一致 |
| --- | --- | --- | --- | --- |
| no-change | 128 → 128 | 8 | false | 一致 |
| add | **0 → 128** | 9 | false | 一致 |
| delete | **0 → 126** | 9 | false | 一致 |
| translation-add | （Phase 1 に計測なし）→ 126 | 11 | false | 一致 |
| translation-delete | （Phase 1 に計測なし）→ 125 | 10 | false | 一致 |

Showcase / 1000（1 サンプル）でも add で `contentReused 1028`（変更前 0）、delete で `1026`（変更前 0）となり、無関係な記事の再処理が解消された。No-change の Fast Path は維持されている。

## 2. global 依存の根本原因

### 2.1 Content レベルの全無効化

l10n は次のように宣言していた（変更前）。

```ts
processedContentCache: {
  version: "l10n-global-content-locations-v1",
  dependencyMode: "global",
},
contentOutputDependencies: [{ type: "global" }],
```

この宣言は `packages/core/src/content/content_persistent_cache.ts` の `hasGlobalContentDependency(config)` を真にする。`packages/core/src/content/content_manager.ts` はこれを見て次の 2 経路で Location 全体を fingerprint に畳み込む。

- `createBuildPlan()`: `hasGlobalContentDependency(config)` が真なら `computePipelineFingerprint(await getContentLocations())` を強制実行する。
- `computePipelineFingerprint(locations)`: `locations && hasGlobalContentDependency(config)` のときだけ `computeContentScopeFingerprint(locations)` を含める。

`computeContentScopeFingerprint()` は**全 Location の `{slug, permalink, language, redirects, metadata}` をソートしてハッシュ**する。この値は全ノート共通の Pipeline Fingerprint の一部になるため、

```
記事を 1 つ追加 → Location 集合が変わる → contentScopeFingerprint が変わる
                → 全ノートの pipelineFingerprint が変わる
                → 全ノートの Content Cache キーが変わる
                → contentReused = 0
```

という連鎖になる。これが Phase 1 で計測された Showcase `add` / `delete` の `contentReused = 0` の直接原因である。`Link Edit` や `Body Edit` は Location 集合を変えないため再利用できていた（127〜128）ことも、この説明と整合する。

さらに `createBuildPlan()` 側の強制再計算により、No-change 以外のあらゆるビルドでこの fingerprint が再計算される。

### 2.2 Output レベルの全無効化

`contentOutputDependencies: [{ type: "global" }]` は `buildOutputInventory()` を通じて**全 Content Output の依存に `{type:"global"}` を付与**する。`isOutputAffected()` はこれを

```ts
if (dependency.type === "global") return changedContent.size > 0;
```

と評価するため、Content が 1 つでも変化すると全 Content Output が「影響あり」になる。

### 2.3 l10n が本当に必要としていた依存

l10n の処理を 6 分類すると次のようになる。

| # | 依存の種類 | 該当処理 | 必要な追跡 |
| --- | --- | --- | --- |
| 1 | ノート自身の本文・frontmatter のみ | frontmatter からの lang / translationId 検出、permalink 生成 | 不要（Content Cache キーが source / frontmatter を既に含む） |
| 2 | 同一翻訳グループのノート | hreflang 生成、LanguageSwitcher、任意翻訳へのリンク解決 | **必要** |
| 3 | 同一言語内のノート | 特になし（permalink 衝突判定は Core 側） | 不要 |
| 4 | URL・permalink・alias | `slugsByPermalink` による Markdown リンク書き換え、`contentIndex` による WikiLink 解決 | **必要** |
| 5 | サイト全体の翻訳設定 | `defaultLang` / `languages` / `detect` | 既存の Pipeline Fingerprint が plugin options を含むため不要 |
| 6 | 真に global な処理 | なし | 不要 |

つまり l10n が global を必要としていたのは #2 と #4 だけで、いずれも「ノートごとに列挙可能」である。ここを global ではなく**ノート単位の fingerprint** として表現できれば、全無効化は不要になる。

## 3. 変更前後の無効化範囲

| 対象 | 変更前 | 変更後 |
| --- | --- | --- |
| Content Cache | 追加・削除で全ノートが無効（`contentReused = 0`） | グループ内のノートと、そのノートからリンクされるノートだけが無効 |
| Pipeline Fingerprint | 全 Location のハッシュを混入 | Location を含めない（plugin config と互換バージョンのみ） |
| Content Output | 全 Output が全 Content に依存 | entry 自身と、fingerprint が変化した entry に依存 |
| 他グループ | 再処理 | 再利用 |
| No-change | Fast Path あり（ただし Location fingerprint は再計算） | Fast Path あり（再計算も不要） |

変更後も**安全側に倒れる**のは次の場合である。

- `contentDependencyFingerprint` が `undefined` を返す（＝ l10n state がまだ構築されていない）ときは `isPersistentlyCacheable()` が unsafe と判定し、そのノートはキャッシュされない。
- 翻訳グループの解決が曖昧な場合（`conflictedGroups`）は `findTranslation()` が `null` を返し、その結果が fingerprint に含まれるため、重複・衝突の発生／解消が必ず無効化として現れる。

## 4. 新しい依存関係モデル

### 4.1 Content レベル: ノート単位の fingerprint

l10n は global をやめ、`tracked` と `contentDependencyFingerprint` を使う。

```ts
processedContentCache: {
  version: "l10n-content-locations-v2",
  dependencyMode: "tracked",
  contentDependencyFingerprint: ({ slug }) => state.signatures.get(slug),
},
```

`signatures` は `extendContentLocations` の中で全ノートについて 1 回だけ計算する。各ノートの signature は次の 4 種のトークンをソートして連結した文字列である。

1. `own:` — 自身の `lang` と `translationId`。
2. `group:` — 同一 `translationId` に属する全ノート（重複含む）の `lang / slug / permalink / 公開シグナル`。公開シグナルは `visibility` / `publishAt` / `publish` / `private` / `draft` のみを取り出す。
3. `wiki:` — 本文中の WikiLink ごとの解決結果。Core の `extractContentLinks(markdown, contentIndex)` を使うため、obsidian-markdown の解決（小文字化 + 同一 contentIndex）と**同一のキー**で列挙される。解決結果は `resolveLocalizedTarget()` を通した `slug / permalink`（解決不能なら空文字）。
4. `url:` — 本文中の Markdown リンクが指す permalink ごとの解決結果。

さらに `![[...]]` の埋め込みは、Core の `embedTrail` と同じ規則（深さ 3 未満・訪問済み除外）で埋め込み先のトークンを取り込む。

signature は Core 側で SHA-256 化され、Content Cache のキーと Build State の `processedContentCacheFingerprint` にのみ現れる。生の signature（非公開ノートの slug / permalink を含む）が公開出力へ出ることはない。

### 4.2 Output レベル: 汎用ルールの追加

l10n の `contentOutputDependencies` は削除した。代わりに Core の `determineOutputChanges()` へ任意入力 `contentFingerprints` を追加し、

> ある Content Output の entry について、今回の processed-content fingerprint が前回の Build State の値と異なるなら、その Output を影響ありとする

という**プラグイン非依存のルール**を追加した。実装は `collectRefreshedContent()` で、変化した slug を `changedContent` へ合流させるだけである。

このルールは l10n に限らず「処理済み Content が他の Content に依存する」すべてのプラグインに使える。逆に、fingerprint が同じなら何も起きないため No-change Fast Path はそのまま維持される。

## 5. Core API 変更の有無

後方互換な追加のみで、破壊的変更はない。

| ファイル | 変更 | 影響範囲 |
| --- | --- | --- |
| `packages/core/index.ts` | `extractContentLinks` を package root から再エクスポート | 追加のみ。既存の内部利用は不変 |
| `packages/core/src/content/output_dependency.ts` | `determineOutputChanges()` に入力 `contentFingerprints?: ReadonlyMap<string, string \| undefined>` を追加し、`collectRefreshedContent()` を実装 | 未指定なら従来と完全に同一の挙動 |
| `packages/core/src/content/content_manager.ts` | `buildManifest()` 内の `determineOutputChanges()` 呼び出しに `contentFingerprints: this.processedContentCacheFingerprints` を渡す | 追加引数のみ |

Core の既存契約（`processedContentCache` の 4 モード、記録依存の 3 種 `content` / `file` / `link`、`CachedContentDependency` の検証、Build State v17 の形式）は変更していない。Build State のバージョンも据え置きである（保存形式が変わらないため）。

`global` を宣言し続けている他プラグイン（`canvas` / `dataview` / `breadcrumbs` の `contentOutputDependencies`、および `processedContentCache` の各モード）は**一切変更していない**。挙動も従来どおりで、`pnpm --filter @riebeckite/core test` 302 件が全て通過している。

## 6. 翻訳グループ変更時の動作

### 6.1 設計上の期待とテストでの確認

| ケース | 内容 | 期待 | 実測（テスト） |
| --- | --- | --- | --- |
| A | 無関係なグループへ新規記事を追加 | 対象グループのみ新規処理、他グループは再利用 | `a.ja` / `a.en` / `b.ja` がある状態で `c.ja` を追加 → `reusedContentCount = 3` / `processedContentCount = 1` |
| B | 既存記事へ翻訳を追加 | 同一グループの hreflang・言語切替が更新、他グループは再利用 | `a.ja` / `a.en` / `b.ja` へ `b.en` を追加 → affected `["b.html", "en/b.html"]`、unchanged `["a.html", "en/a.html"]`、`reused 2` / `processed 2` |
| C | 翻訳を削除 | 削除 URL が消え、残存メンバーの hreflang が更新 | `keeps removed, relabeled, regrouped, and moved translations equivalent to a cold build`（4 サブケース）が通過 |
| D | 本文のみ変更 | 自身のみ再処理、翻訳関係が不変なら他言語は再処理しない | リンク解決結果が変わらなければ signature は不変 → 再利用 |

ケース B の「affected がグループ B の 2 出力だけ」は、Output レベルでも粒度が効いていることを示す。

### 6.2 リンク越しのグループ所属変更

`source.ja` が `[Target](/en/target#section)` を持ち、`target.en` しか存在しない状態から `target.ja` を追加すると、`source.ja` のリンクは `/en/target#section` から `/target#section` へ変わる必要がある。これは `url:` トークン（permalink `→` 解決結果）が `target.en` から `target.ja` へ変わることで `source.ja` の signature が変化し、確実に再処理される。既存テスト `keeps translation membership changes equivalent to a cold build` がこの挙動を検証しており、変更後も通過する。

WikiLink（`[[target.en]]`）についても `wiki:` トークンが同じ役割を果たす。`contentIndex` を使うため、Core / obsidian-markdown と同一の解決キーで列挙される。

### 6.3 安全側に倒れる残存ケース

- Markdown リンクの URL が**文字参照（`&#x74;` など）で難読化されている**場合、`url:` トークンとして検出できない可能性がある。この場合は無効化が起きないのではなく「解決結果が変わらない」と誤認する余地がある（後述の残課題）。
- `definition` ノード（参照形式リンク）は l10n の書き換え対象外であるため、fingerprint にも含めていない（l10n の `localizeLinks` は `link` ノードのみを処理する）。

## 7. 公開境界の安全性

### 7.1 変更が公開出力へ与える影響

- 公開可否の判定は従来どおり Core の `applyPublicView()` と `resolvePublishingState()` が行い、l10n 側では変更していない。`manifest.publicEntries` / `discoverableEntries` の構成は不変である。
- l10n signature に含まれる公開シグナルは**キャッシュ無効化のためだけ**に使う。非公開ノートが public へ変わる（またはその逆）と、同一グループの兄弟ノートの signature が変わり、そのページの hreflang と LanguageSwitcher が再計算される。これは必要かつ正しい波及である。
- `collectRefreshedContent()` が `changedContent` へ加える slug は、**再描画の対象を広げるだけ**である。出力される HTML / JSON は公開 View から生成されるため、非公開ノートの情報が hreflang・言語切替・ナビゲーション・検索インデックスへ混入しない。

### 7.2 検証済みの公開境界テスト

`packages/plugins/l10n/test/l10n.test.ts` と e2e (`tests/external-site/preset-fast-path.ts`) で確認している。

- `private.en.md`（`publish: false`）が `getLanguageFromPath()` から見えない。
- 翻訳が存在しないノートに hreflang を捏造しない（`only.ja` の headTags は 1 件のみ／`/en/only` は `byPermalink` に存在しない）。
- `visibility: draft` のノートが `publicEntries` と `generatedOutputs` から除外される（非公開 Markdown 画像も出力されない）。
- e2e で Public → Draft / Draft → Public / Unlisted → Public の遷移と、Unlisted が sitemap から除外されることを確認。

## 8. Build State v17 との整合性

Phase 2C の差分保存方式（Build State v17 / `manifestHookCache`）とは次のように連携する。

- l10n の signature は `processedContentCacheFingerprint` として **Build State v17 の既存フィールド**に保存される。保存形式を変えていないためバージョン据え置きが可能で、旧 Build State の棄却ルールにも手を入れていない。
- 翻訳グループが変化したビルドでは manifest 入力が変わるため、Phase 2C の設計どおり hook は再実行される（実測: add / delete / translation-* で `manifestHookCacheHit 0 / miss 21`、理由は `manifest-input-changed` 16 件と `uncacheable` 5 件）。No-change（Showcase/100）では `16 hit / 5 miss` で再利用される。
- 無関係な翻訳グループの hook は差分スナップショットの対象外であり、その出力は `unchanged` のまま `previousOutputCache` から復元される。
- l10n の hook 自身は `cacheable: true` で、`outputFingerprint` と entry 差分のみを保存する。再利用時に headTags が二重付与されないことは既存テスト `does not duplicate generated l10n fragments when entries are reused from cache` が検証している。
- No-change Fast Path は維持されている（Showcase/100 `fastPathApplied true` / Showcase/1000 `fastPathApplied true`）。

## 9. キャッシュ再利用数の比較

### 9.1 Showcase / 100（3 サンプル中央値）

| シナリオ | Processed / Reused | Rendered / Reused | Fast Path | Full Regeneration | Global / unknown | Equivalent |
| --- | --- | --- | --- | --- | --- | --- |
| no-change | 8 / 128 | 0 / 322 | true | false | false | true |
| add | 9 / 128 | 166 / 149 | false | false | false | true |
| delete | 9 / 126 | 162 / 147 | false | false | false | true |
| translation-add | 11 / 126 | 165 / 148 | false | false | false | true |
| translation-delete | 10 / 125 | 162 / 141 | false | false | false | true |

### 9.2 Showcase / 1000（1 サンプル）

| シナリオ | Processed / Reused | Rendered / Reused | affectedOutputCount | unchangedOutputCount | Full Regeneration | Equivalent |
| --- | --- | --- | --- | --- | --- | --- |
| no-change | 8 / 1028 | 0 / 2124 | 0 | 2124 | false | false（後述） |
| add | 9 / 1028 | 1067 / 1050 | 1081 | 1050 | false | true |
| delete | 9 / 1026 | 1063 / 1048 | 1074 | 1048 | false | true |

### 9.3 変更前との比較（Phase 1 監査 `ci-incremental-build-audit.md` §6.1）

| 規模 | シナリオ | contentReused（変更前） | contentReused（変更後） |
| --- | --- | --- | --- |
| showcase / 100 | add | 0 | 128 |
| showcase / 100 | delete | 0 | 126 |
| showcase / 1000 | add | 0 | 1028 |
| showcase / 1000 | delete | 0 | 1026 |

Phase 1 の計測は Phase 2A 以前のハーネスであり、Output Cache の復元がない（全行 `fullRegenerationRequired = true`）。したがって時間値の直接比較はできないが、**Content Cache 再利用数は同条件で比較できる**。

### 9.4 Starter / 100（l10n 非使用・3 サンプル中央値、回帰確認）

| シナリオ | Processed / Reused | Rendered / Reused | Fast Path | Equivalent |
| --- | --- | --- | --- | --- |
| no-change | 0 / 105 | 0 / 256 | true | true |
| add | 1 / 105 | 122 / 128 | false | true |
| delete | 0 / 104 | 210 / 10 | false | true |

l10n を含まない構成でも再利用数・Fast Path に退行はない。

### 9.5 Output Cache

全シナリオで `outputCacheMiss 0`（Showcase/100 は `330 / 0`、Showcase/1000 は `2132 / 0`）であり、Output Cache の再利用は維持されている。追加・削除では `removedOutputCount 2`（Showcase/100 の delete）など、削除 URL の GC も機能している。

### 9.6 Build State 容量について

本フェーズの計測に用いた `runner.mjs` の出力は Content Cache 容量と Build State 容量を列挙しない。取得可能なのは SSG Output Cache のファイルサイズ（`cacheFileSizeBytes`）で、Showcase/100 で約 93 KB、Showcase/1000 で約 610 KB である。Build State 容量（`content-state.json`）と Content Cache 容量は本フェーズでは未計測であり、推測値は記載しない。Phase 2C の削減（Showcase/1000 の CI キャッシュ 95.61 MiB → 37.36 MiB）に影響する変更は加えていない。

## 10. ビルド時間の比較

すべて同一ハーネス内の Incremental と Clean の比較（中央値、ms）。

### 10.1 Showcase / 100

| シナリオ | Incremental | Clean | 差分 |
| --- | ---: | ---: | ---: |
| no-change | 20881 | 24331 | -3450 |
| add | 23058 | 22256 | +802 |
| delete | 21972 | 22566 | -594 |
| translation-add | 22073 | 23861 | -1788 |
| translation-delete | 16945 | 15317 | +1628 |

### 10.2 Showcase / 1000

| シナリオ | Incremental | Clean | 差分 |
| --- | ---: | ---: | ---: |
| no-change | 66771 | 124140 | -57369 |
| add | 118700 | 130909 | -12209 |
| delete | 111972 | 126945 | -14973 |

### 10.3 Starter / 100

| シナリオ | Incremental | Clean | 差分 |
| --- | ---: | ---: | ---: |
| no-change | 17996 | 21022 | -3026 |
| add | 17562 | 16359 | +1203 |
| delete | 16270 | 17672 | -1402 |

### 10.4 考察

- 1000 規模では add / delete が Clean より 12〜15 秒短縮され、No-change は約 57 秒短縮される。Phase 1 時点の Showcase/1000 add（55483 ms、ただし full regen）と比べても、コンテンツ再利用が 0 → 1028 になった分の効果は明確である。
- 100 規模では add が Clean よりわずかに遅い。これは Content 再利用（128 件）に対して Output 再描画（166 件）が支配的で、他プラグイン（`canvas` / `dataview` / `breadcrumbs`）が宣言する `global` Output 依存により、Content が 1 つ変わると全 Content Output が影響ありになるためである。本フェーズの対象は l10n であり、これらのプラグインの依存は未変更である。
- Manifest Hook 時間は Showcase/1000 で 1.8〜2.3 秒（`breadcrumbs` が最大で 1.4〜1.8 秒）。Content 変更時は入力が変わるため全 hook を再実行する設計どおりの挙動である。

## 11. Clean Build との出力一致

本フェーズの 3 回の計測（Starter/100: 3 サンプル × 3 シナリオ = 9 行、Showcase/100: 3 サンプル × 5 シナリオ = 15 行、Showcase/1000: 1 サンプル × 3 シナリオ = 3 行、計 27 行）のうち 26 行で `equivalence.equivalent = true`（差異 0 件）。

唯一の不一致は Showcase/1000 `no-change` の 1 サンプルで、差異ファイルは `search-data.json` のみだった。調査の結果、これは **Phase 2D とは無関係な既存の非決定性**である。

- `no-change` では Fast Path が働き全出力を再利用する（`renderedOutputCount 0` / `reusedOutputCount 2124`）。したがって比較しているのは「無変更の入力に対する 2 回の独立した Cold Build」の出力である。Phase 2D の変更は Cold Build の HTML に影響しない。
- 差異は検索インデックスの `examples`（7 言語分）の `headings` / `body` のみで、ページ HTML 自体（`examples.html` など）は両ビルドでバイト一致した。
- 差分の内容は D2 図の SVG ラベルと Marp スライド見出しの有無であり、`examples.html` 側はどちらのビルドでも `data-d2="pending"`（フォールバック）である。
- 原因は、ビルド時レンダラを**遅延 import する非同期 rehype transformer**（`d2` の `rehypeD2Lazy` → `await import("./src/rehype.js")`、`marp` の `renderMarpDeck` → `await import("@marp-team/marp-core")`）が 1000 ノート規模の負荷下で同一 Content に対して異なる結果（描画あり／フォールバック）を返すことにある。100 規模では再現しない。

したがって、この不一致は l10n の依存関係変更に起因する回帰ではなく、残課題として扱う（§13）。

## 12. 回帰テスト結果

### 12.1 追加したテスト

| ファイル | テスト | 検証内容 |
| --- | --- | --- |
| `packages/core/test/output_dependency.test.ts` | `content output is affected when its dependency fingerprint changed` | fingerprint が変化した entry のみ `affected`、他は `unchanged`、`fullRegenerationRequired` は false |
| `packages/plugins/l10n/test/l10n.test.ts` | `reuses unchanged translation groups when another group is added` | 無関係グループ追加時に `reused 3` / `processed 1` |
| `packages/plugins/l10n/test/l10n.test.ts` | `marks sibling translation outputs as affected when a translation is added` | affected が `["b.html", "en/b.html"]` のみ、unchanged が `["a.html", "en/a.html"]`、`reused 2` / `processed 2` |

### 12.2 実行結果

| コマンド | 結果 |
| --- | --- |
| `pnpm --filter @riebeckite/plugin-l10n test` | 29 / 29 pass |
| `pnpm --filter @riebeckite/core test` | 302 / 302 pass |
| `pnpm test:benchmark:presets` | 10 / 10 pass |
| `pnpm test:e2e:preset-fast-path` | PASS（empty / minimal / starter / showcase） |
| `pnpm typecheck` | 146 projects OK |
| `node scripts/check_docs.mjs` | pass（837 markdown files） |
| `node scripts/check_plugin_docs_parity.mjs` | pass（70 plugins） |
| `node scripts/sync_theme_docs.mjs --check` | pass（12 READMEs） |
| `pnpm check` | exit 0 |

既存の重要テストも維持されている。

- `keeps translation membership changes equivalent to a cold build`
- `keeps removed, relabeled, regrouped, and moved translations equivalent to a cold build`
- `does not duplicate generated l10n fragments when entries are reused from cache`
- `rewrites WikiLinks and Markdown links after Obsidian resolution`
- `uses the embedded note as the source of locale-aware link resolution`

### 12.3 ベンチマーク用シナリオの追加

翻訳の追加・削除を計測するため、ハーネスに `translation-add` / `translation-delete` を追加した（既定のシナリオ一覧には含めず、明示指定時のみ実行）。

- `benchmarks/preset-ssg/lib.mjs`: `localizationScenarioNames` と `applyScenario` の 2 分岐（Showcase 以外では例外）。
- `benchmarks/preset-ssg/ci-runner.mjs` / `runner.mjs`: 検証と `preset` の受け渡し。
- `benchmarks/preset-ssg/runner.test.mjs`: グループ変更のテスト。
- `benchmarks/README.md`: シナリオの説明。

## 13. 残課題

1. **ビルド時レンダラの非決定性（優先度: 高）** — `d2` / `marp` ほか遅延 import 型のビルド時レンダラが 1000 ノート規模で単一 Content に対して異なる HTML を返す。`examples.*` と `search-data.json` にのみ現れるが、Clean 出力一致の観測を不安定にする。対策案は「パイプライン側で遅延レンダラを事前ロードまたは確実に await する」「レンダリングを決定的かつタイムアウト時に中断可能にする」。
2. **Markdown リンクの文字参照** — `url:` トークンの検出はソース文字列ベースのため、URL を文字参照で難読化した Markdown リンクは検出できない。検出できない場合は無効化漏れの余地がある。AST ベースの記録 API を Core に追加するのが本質的な解決策。
3. **他プラグインの Output レベル global 依存** — `canvas` / `dataview` / `breadcrumbs` は `contentOutputDependencies: [{type:"global"}]` を宣言しており、Content が 1 つ変わると全 Content Output が再描画される。本フェーズでは対象外としたが、同じ手法（per-entry の依存解決）で改善できる。
4. **Build State 容量の未計測** — 本フェーズのハーネス出力に Build State 容量が含まれないため、容量の前後比較は未実施。Phase 2C の削減に影響する変更は加えていない。
5. **Showcase/1000 の hook キャッシュ** — `no-change` で `manifestHookCacheHit 0 / miss 21` を観測した（Showcase/100 は 16 / 5）。Showcase/1000 は 1 サンプルのみで、複数サンプルでの確認が必要。
6. **`translation-add` / `translation-delete` の 1000 規模計測** — 100 規模では計測済みだが、1000 規模は未計測。

## 14. Phase 2E へ進めるか

進められる。

必須条件は満たしている。

- global 依存による過剰無効化の原因を特定し、コード経路まで特定した。
- 安全な粒度の依存関係（ノート単位 fingerprint + 汎用 Output ルール）を実装した。
- Showcase の無関係な Add / Delete で Content Cache 再利用が成立した（0 → 128 / 0 → 1026）。
- 翻訳グループの変更が正しく伝播することをテストで確認した。
- Public / Unlisted / Draft の公開境界を維持している。
- Clean Build との出力一致を確認した（唯一の不一致は既存のレンダラ非決定性で、Phase 2D とは独立）。
- Manifest Hook Cache（Build State v17）との整合性を確認した。
- Output Cache の再利用を維持した（`outputCacheMiss 0`）。
- 必須回帰テストが全て PASS した。
- 英日ドキュメントを同期した（`docs/docs/framework/build-dependency.md` / `.ja.md`）。
- 修正前後の計測結果を報告した。

Phase 2E の候補は、残課題 1（ビルド時レンダラの決定性）と残課題 3（他プラグインの Output 依存の粒度）である。
