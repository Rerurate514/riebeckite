# Riebeckite CI 増分ビルド監査レポート

対象リポジトリ: `riebeckite`
計測時の HEAD: starter 系は `aea6c79b241fe9d21d02159e993279c7df391172` 前後、showcase 系は `202d943c7132b708372af8dd1a8e2fa200b5fa11`（いずれもブランチ `main`）。計測中に別セッションが同時にコミット・編集していたため、厳密には 1 つの HEAD ではない（第 11 章参照）
計測環境: Windows 11 (win32/x64) / Node.js v24.11.1 / pnpm 11.5.3 / Intel Core i7-14700KF (28 スレッド) / RAM 32 GB
計測種別: **ローカル CI シミュレーション**（GitHub Actions 上では未計測）

---

## 1. Executive Summary

**結論: 公式デプロイ経路（GitHub Actions テンプレート）では、Riebeckite の増分ビルドは「内容処理の再利用」は機能するが、「出力（SSG）レベルの再利用」は機能しない。そのため CI の総ビルド時間はほとんど短縮されない。**

主な実測事実:

1. **公式テンプレートは SSG output cache を復元しない。** 復元対象は `.riebeckite/cache` と `.riebeckite/build/content-state.json` のみ（`packages/create-riebeckite/templates/scaffold/deployment/github-actions/deploy.yml`）。output cache（`.riebeckite/ssg-output-cache.json` ほか）が無いと `canUseIncremental` が偽になり（`packages/integrations/honox/src/ssg_plugin.ts:332-343`）、`fullRegenerationRequired = true` となって**全ルートが再レンダリングされる**。
2. その結果、**incremental ビルド時間は clean ビルド時間とほぼ同じ**（100 記事では差はほぼノイズ、しばしば僅かに遅い）。コンテンツは再利用される（`reusedContentCount ≈ 全件`）が、SSG の描画・出力書き込みは節約されない。
3. **output cache まで復元すると効果が出る。** starter/100 の no-change は fast path に乗り、体感は clean 比 +14%、`renderedOutputCount = 0`。ただしキャッシュ容量は 1.45 MB → 5.53 MB に増える。**showcase では output cache を復元しても再利用が成立しなかった**（原因未特定・第 8 章）。
4. **固定コストが大きい。** `ssrModuleLoad`（Vite/HonoX の SSR モジュール読込）が毎回 5.6–9.3 秒かかり、100 記事ではビルド総時間の約半分を占める。キャッシュの有無に関係なく毎回支払う。
5. **キャッシュ容量が過大。** `content-state.json` の約 78% は `manifestHookCache` で、`cacheable=false` のフックも含めて到達マニフェスト全体を複製保存している（`packages/core/src/plugin/plugin_runtime.ts:372`）。CI 転送量は starter/1000 で 13.4 MB、showcase/1000 では **87.5 MB** に達する。
6. **l10n の global 依存（showcase）で過剰無効化が起きる。** 記事の追加・削除で content cache が全件無効化される（`contentReused = 0` を実測）。`packages/plugins/l10n/src/l10n.ts:75`。

**判定: NEEDS FIX。** 「キャッシュを復元すれば速くなる」という前提は、公式テンプレートのキャッシュ範囲では成立していない。速くするには (a) output cache の復元、または (b) 固定コスト削減のいずれかが必要で、いずれも Phase 2 の作業である。なお出力の正しさ（incremental 出力 = clean 出力）は全シナリオで確認できた。

---

## 2. 現在のキャッシュアーキテクチャ

増分ビルドに必要な永続状態は、すべて「管理対象状態ルート」配下に置かれる。honox 統合を使う場合、`config.buildDirectory` は `<appRoot>/.riebeckite`、生成サイトの出力は `config.outputDirectory`（既定 `<appRoot>/dist`）になる。

### 2.1 Content Build State

| 項目 | 内容 |
| --- | --- |
| 保存先 | `<buildDirectory>/build/content-state.json`。buildDirectory 未設定時は `<contentDir>/.riebeckite/content-state.json`（`resolveContentBuildStatePath`, `packages/core/src/content/content_build_state_store.ts:101-115`） |
| 保存内容 | `ContentBuildState`。`version`, `entries`（パス→fingerprint / aliases / dependencies / linkTargets / processedContentCacheFingerprint）, `contentIndex`, `pipelineFingerprint`, `manifestEntries`, `outputs`, `externalDependencies`, `manifestHookCache`, `nextPublishingChangeAt` |
| 保存・復元 | 起動時に `loadContentBuildState` / `readContentBuildStateStatus`、ビルド後に `saveContentBuildState`。書き込みは一時ファイル＋rename のアトミック書き込み |
| 無効化条件 | `CONTENT_BUILD_STATE_VERSION`（現在 16）不一致、形状不正、`pipelineFingerprint` 変化、公開状態の期限切れ、外部依存の失敗 |
| バージョン互換 | `packages/core/src/content/content_build_state.ts:5` の `CONTENT_BUILD_STATE_VERSION = 16`。`readContentBuildStateStatus` が `malformed-json` / `unsupported-version` / `invalid-shape` を返す |
| 再生成 | 可能。失われてもコールドビルドにフォールバックするだけ |
| 相対/絶対 | 保存内容は論理スラッグと forward-slash の相対パスのみ。絶対パス・mtime・inode は保存しない |

### 2.2 Persistent Content Cache

| 項目 | 内容 |
| --- | --- |
| 保存先 | `config.cache.directory/content`、なければ `<buildDirectory>/cache/content`、なければ `os.tmpdir()/riebeckite-content-cache/content`。配下は `v5/<sha256(key)>.json`（`packages/core/src/content/content_persistent_cache.ts:43-64`） |
| 保存内容 | `PersistentContentCacheEntry`。`schemaVersion`, `key`, `dependencies`, `value`（frontmatter と html） |
| 保存・復元 | `cache.lookup(key)` / `cache.set(key, value)`。アトミック書き込み |
| 無効化条件 | スキーマ不一致（5）、キー不一致、破損 JSON、エントリ形状不正。いずれも miss として扱いコールド再生成 |
| バージョン互換 | `CONTENT_CACHE_SCHEMA_VERSION = 5`, `CONTENT_CACHE_COMPATIBILITY_VERSION = 3`（`content_persistent_cache.ts:36-37`）。後者は `computePipelineFingerprint` に含まれる |
| キャッシュキー | `sha256(stableStringify({ schemaVersion, slug, source(本文文字列), frontmatter, pipelineFingerprint }))`（`:257`）。**パス非依存・内容ハッシュ依存** |
| CI 復元対象 | される（後述）。内容ハッシュ依存のため異なる checkout でも再利用できる |
| GC | なし。`clear()` 以外に古いエントリを削除する仕組みが存在しない（内容変更が続くと単調増加） |

### 2.3 Manifest Hook Cache

| 項目 | 内容 |
| --- | --- |
| 保存先 | `content-state.json` 内の `manifestHookCache` フィールド（独立ファイルなし） |
| 保存内容 | `ManifestHookCacheEntry`。`pluginName`, `cacheable`, `pipelineFingerprint`, `inputFingerprint`, `outputFingerprint`, `snapshot.entries`（そのプラグインが到達したマニフェストの**全エントリの複製**） |
| 書き込み | `packages/core/src/plugin/plugin_runtime.ts:372`。**`cacheable=false` のプラグインでもスナップショットを保存する**（例: `folder-pages`） |
| 無効化 | content-state のバージョン・形状検証に従う |

計測した starter/100 の `content-state.json` は 1,327,860 バイトで、内訳は `manifestHookCache` 1,033,644 バイト（5 フック、各 105 エントリの全マニフェスト複製）、`manifestEntries` 159,587、`outputs` 66,762、`entries` 44,681、`contentIndex` 22,979 だった。**content-state.json の約 78% が manifestHookCache** であり、サイズはノート数に比例して増える。

### 2.4 Plugin Cache

| 項目 | 内容 |
| --- | --- |
| 保存先 | `resolvePluginCacheDirectory`（`packages/core/src/plugin/plugin_cache.ts:124-131`）。`config.cache.directory` → `<buildDirectory>/cache` → `<contentDir>/../.riebeckite/cache`。各プラグインは `<ns>/v<hash(cacheVersion ?? "1")>/<hash(key)>.json` |
| 保存内容 | 任意 JSON 値（プラグイン依存） |
| 無効化 | 破損エントリは警告してスキップ。`cacheVersion` 変更でディレクトリが分離される |

### 2.5 SSG Output Cache / Output Inventory

| 項目 | 内容 |
| --- | --- |
| 保存先 | `<root>/.riebeckite/ssg-output-cache.json`、サイドカー `.riebeckite/ssg-output-cache.entries/`（出力ごとの実ファイル、GC あり）、`.riebeckite/ssg-output-cache.fast-path.json`（`outputCacheEntriesPath` / `fastPathCachePath`, `packages/integrations/honox/src/ssg_plugin.ts:1255-1256, 1331-1332`） |
| 保存内容 | `OutputCacheState`（version 4）: `appFingerprint`, `clientManifestFingerprint`, `outputs`（パス→cachePath/checksum）, `finalOutputInventory`（パス→sha256）, `publicDirectory/publicFingerprint`, `configFile`。`FastPathCacheState`（version 1） |
| 保存・復元 | `loadOutputCache`（`:1078-1133`）, `saveOutputCache`（`:1195-1253`）。fast path 判定は `verifyNoChangeFastPath`（`:940-991`） |
| 無効化条件 | version 不一致、app/client fingerprint 変化、checksum 不一致、public fingerprint 変化、finalOutputInventory 不一致 |
| GC | `collectUnreferencedOutputCacheEntries`（`:1598-1627`）が未参照の `.entries` を削除 |

### 2.6 その他の永続状態

- Generated Output Registry（`packages/core/src/plugin/generated_output_registry.ts`）は**メモリのみ**で永続化しない。

### 2.7 CI から復元すべきか / 再生成可能か / 容量（starter/100 実測）

| 状態 | パス | 容量 (100 notes) | CI 復元 | 再生成 |
| --- | --- | ---: | --- | --- |
| Content Cache | `.riebeckite/cache/content/v5` | 105 ファイル / 124,268 B | 公式テンプレートが復元 | 可能 |
| Content Build State | `.riebeckite/build/content-state.json` | 1,327,860 B | 公式テンプレートが復元 | 可能 |
| Manifest Hook Cache | （上記に内包） | 1,033,644 B | 同上 | 可能 |
| Plugin Cache | `.riebeckite/cache/<plugin>/v1/*` | `cache` 配下に合算 | 公式テンプレートが復元 | 可能 |
| SSG Output Cache | `.riebeckite/ssg-output-cache.json(.entries/.fast-path.json)` | json 73,810 B + `.entries` 数百ファイル | **公式テンプレートは復元しない** | 可能 |
| `dist/` | `<appRoot>/dist` | 263 ファイル | 復元しない | 可能 |

公式テンプレートが実際に復元するのは `.riebeckite/cache` と `.riebeckite/build/content-state.json` の 2 つで、starter/100 では合計 1,452,114 B（約 1.4 MB）だった。うち有効な内容キャッシュ本体は 124 KB に過ぎず、残りは content-state.json（その大半が manifestHookCache）である。

---

## 3. CI 互換性監査

GitHub Actions の ephemeral runner を対象に、コードとローカル再現の両面から確認した。

| 確認項目 | 結果 | 根拠 |
| --- | --- | --- |
| 新規 checkout 後にキャッシュを復元できるか | 可能 | 公式テンプレートが `actions/cache@v4` で `.riebeckite/cache` と `content-state.json` を復元 |
| 復元した Build State が有効と判定されるか | 有効 | 別ディレクトリに復元しても内容キャッシュが全件ヒット（後述の実測で `contentReusedCount = 105`） |
| ワークスペースの絶対パスに依存していないか | 依存しない | キーは内容ハッシュ＋論理スラッグ。状態ファイルの保存内容に絶対パスなし |
| OS / Node.js バージョン差で問題が起きるか | コアは問題なし | `computePipelineFingerprint` に OS/arch/Node を含めない（プラグイン独自 fingerprint は除く） |
| `pnpm install` 相当の依存導入後にキャッシュが無効になるか | 無効化されない | キャッシュキーは lockfile ではなく内容・パイプライン fingerprint に依存 |
| 異なる commit 間で再利用できるか | できる | 変更されたノートのみ再処理し、他は再利用（後述の Body/Link Edit 実測） |
| キャッシュ欠如時に Cold Build へフォールバックするか | する | `lookup` の全 miss 理由がコールド再生成に合流（`content_persistent_cache.ts:124-175`） |
| 並行する CI 実行で不整合が起きないか | **保護なし** | `saveContentBuildState` はアトミック rename のみでプロセス間ロックが無い（last-writer-wins） |

補足:

- 状態ファイルの**保存先**は `process.cwd()` / 設定に依存する。runner が毎回異なる作業ディレクトリを使う場合、`actions/cache` の `path` がリポジトリ相対で一致していれば問題ない。
- 公式テンプレートの `hashFiles('package-lock.json')` は、scaffold 直後は `package-lock.json` が存在しないため空文字になる。ドキュメントは「`npm install` 後に `package-lock.json` を必ずコミットする」ことを前提としており、`npm ci` 自体が同ファイルを要求する。

---

## 4. 公式 Scaffold の対応状況

### 4.1 プリセット

| プリセット | 言語 | l10n | 主なプラグイン | 増分との関係 |
| --- | --- | --- | --- | --- |
| `empty` | — | なし | なし | 影響なし |
| `minimal` | en | なし | obsidianMarkdown | 単純。全再利用可能 |
| `starter` | en | なし | seo, toc, properties, alias, backlinks, breadcrumbs, navigationStarter, relatedPosts, recentPosts, responsiveImage, lightbox, taxonomy, folderPages, hoverPreview ほか | `dependencyMode: global` / `unsafe` を含まず、依存ベースの無効化が効く |
| `showcase` | 7 言語 | **あり** | 上記に加え l10n, changelog, webmention, rename, series, mermaid, graphviz, d2, plantuml ほか約 60 | **l10n が `dependencyMode: "global"`** のため全内容が全体依存になる |

`packages/plugins/l10n/src/l10n.ts:75` が `processedContentCache { version: "l10n-global-content-locations-v1", dependencyMode: "global" }` を宣言している。このため showcase では `hasGlobalContentDependency` が真となり、`computeContentScopeFingerprint(locations)` がパイプライン fingerprint に混入して、ロケーション/permalink の変化が全内容キャッシュキーを無効化しうる。

### 4.2 GitHub Actions デプロイテンプレート

`packages/create-riebeckite/templates/scaffold/deployment/github-actions/deploy.yml` は `actions/cache@v4` で以下を復元する。

```yaml
path: |
  .riebeckite/cache
  .riebeckite/build/content-state.json
key: riebeckite-build-v1-${{ runner.os }}-${{ hashFiles('package-lock.json') }}-${{ github.run_id }}-${{ github.run_attempt }}
restore-keys: |
  riebeckite-build-v1-${{ runner.os }}-${{ hashFiles('package-lock.json') }}-
  riebeckite-content-v3-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
```

| 確認項目 | 結果 |
| --- | --- |
| CI で増分ビルドが有効になるか | 一部有効（内容処理のみ）。出力レベルの増分は無効（後述） |
| キャッシュ復元処理があるか | ある |
| キャッシュ保存処理があるか | ある（`actions/cache` のポストステップ） |
| キャッシュキーは適切か | 概ね妥当。ただし `github.run_id` を含むため毎回新規エントリが作られ、古いエントリが自動削除されない |
| restore-keys は安全か | 安全だが、2 行目 `riebeckite-content-v3-...` は保存キー `riebeckite-build-v1-...` と接頭辞が一致せず**常にマッチしない** |
| 不要ファイルが含まれていないか | `content-state.json` の約 78% が manifestHookCache（他プラグインのスナップショット重複）で、転送対象としては過大 |
| デプロイ成果物が完全に生成されるか | 生成される |
| 削除されたページが成果物から除去されるか | 除去される（検証済み・第 7 章） |
| キャッシュがなくても正常にデプロイできるか | できる（コールドへフォールバック） |

`dist/` と `.riebeckite/ssg-output-cache.json`（`.entries`・`.fast-path.json` を含む）は意図的にキャッシュ対象外。ドキュメント（`docs/docs/guides/deployment/github-actions.md:441`）は「output cache は大きく、ビルド短縮分が転送コストに見合わないため永続化しない」と明記しており、テンプレートと一致する。

### 4.3 その他の公式経路

- Cloudflare 向けは上記 `deploy.yml` が `cloudflare/wrangler-action@v3` を使う形のみ。別個の Cloudflare 専用キャッシュテンプレートは存在しない。
- リポジトリ自身の `.github/workflows/deploy.yml` と `ci.yml` は Riebeckite 状態を**一切キャッシュしない**（`ci.yml` は puppeteer のみ）。`benchmark.yml` は `pnpm benchmark:presets` を実行するが、ベースライン→増分の間で `.riebeckite` を保持するだけで、`actions/cache` による復元は再現しない。

---

## 5. ベンチマーク環境・計測方法

### 5.1 既存ハーネスとその制限

- 既存の `benchmarks/preset-ssg/runner.mjs`（`pnpm benchmark:presets`）は、ベースラインと増分の間で `.riebeckite` を保持する。したがって増分時の SSG output cache がそのまま残り、**CI の `actions/cache` 復元を再現できない**。この制限を明示したうえで、本監査では CI 復元を再現する追加ハーネスを用いた。
- 既存の `benchmark:preset-fast-path`（`tests/external-site/preset-fast-path-benchmark.ts`）は tarball を外部サイトへインストールして CLI を別プロセス起動する点で現実に近いが、こちらも `.riebeckite` を保持するため CI キャッシュ復元は再現しない。

### 5.2 追加ハーネス `benchmarks/preset-ssg/ci-runner.mjs`

各 (preset, size, scenario, run) について:

1. `origin` サイトを scaffold → scaffold 直後の状態を保存
2. ベースラインビルドを実行し、`.riebeckite/cache` と `.riebeckite/build/content-state.json` を cache-store へコピー（**保存時間とバイト数を計測**）
3. `origin` を破棄し、**別の絶対パス**に `fresh` サイトを scaffold
4. cache-store から `fresh` へ復元（**復元時間を計測**）
5. シナリオを適用して増分ビルド（wall 時間と各 span・カウンタを計測）
6. `fresh` の `.riebeckite` と `dist` を削除してクリーンビルド
7. 増分出力とクリーン出力をファイル単位 sha256 で比較（除外パスなし）

Cold シナリオは復元なしでビルドし、その出力とクリーンビルドを比較する。`--cacheOutput` を付けると SSG output cache も cache-store に含めて保存・復元する（output cache をキャッシュした場合の比較用）。

各シナリオは独立した `origin` から開始し、シナリオ間でキャッシュ状態を引き継がない。増分出力は 100 notes で `dist` 換算 200 超ファイルを全件比較する。

### 5.3 計測の分離と N/A

| 区間 | 計測可否 | 備考 |
| --- | --- | --- |
| 依存関係インストール | **N/A** | ハーネスはワークスペース・パッケージを直接リンクするため `npm ci` を再現しない。GitHub Actions の npm キャッシュ・ネットワークに依存 |
| キャッシュ復元 | 計測 | cache-store からのコピー時間 |
| キャッシュ検証 | 計測（近似） | `outputDependencyResolution` / fingerprint span / `loadOutputCache` を含む |
| Content 処理 | 部分計測 | `processedContentCount` / `reusedContentCount` は計測するが、専用の span は無く `ssrModuleLoad` と `outputDependencyResolution` に混在 |
| Manifest 生成 | **N/A（専用 span なし）** | 内容キャッシュ効果として間接的に観測 |
| Plugin Hook 処理 | 計測 | `manifestHookDurationMs`（starter/100 では 0.1 ms 未満のため実質ゼロ） |
| HonoX / Vite 起動・SSR モジュール読込 | 計測 | `ssrModuleLoad` |
| SSG 実行 | 計測 | `toSSG` |
| Output Cache 処理 | 計測 | `outputCacheEntriesWrite` / `outputCacheEntryCopy` ほか |
| キャッシュ保存 | 計測 | cache-store へのコピー時間 |
| デプロイ成果物の検証 | 計測対象外 | スナップショット比較は実行するが時間は計測しない |
| GitHub Actions への転送 | **N/A** | 実 GitHub Actions 上では未計測 |

計測は各条件 100 notes で 3 回、1000 notes で 1 回とし、中央値を採用した。すべて **ローカル CI シミュレーション**であり、実 GitHub Actions 上の数値ではない。

---

## 6. シナリオ別実測結果

すべて **ローカル CI シミュレーション**（実 GitHub Actions では未計測）。100 記事は 3 回測定の中央値、1000 記事は 1 回測定。`cold` 列はそのシナリオの origin サイトでのコールドビルド時間。`clean比` は `(clean - incremental) / clean`（正なら clean より速い）。

### 6.1 公式テンプレートのキャッシュ範囲（`.riebeckite/cache` + `content-state.json` のみ復元）

starter / 100（3 runs、cache 1,452,114 B）:

| scenario | cold ms | incremental ms | clean ms | clean 比 | save ms | restore ms | content reused | rendered | fast path | full regen | 一致 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| cold | 12905 | 12905 | 14722 | — | N/A | N/A | 0 | 212 | false | true | true |
| no-change | 17576 | 16528 | 16133 | -2.4% | 143 | 133 | 105 | 212 | false | true | true |
| single-body-edit | 14486 | 15819 | 14014 | -12.9% | 124 | 140 | 104 | 212 | false | true | true |
| link-edit | 13375 | 13675 | 12533 | -9.1% | 114 | 119 | 104 | 212 | false | true | true |
| add | 12941 | 13218 | 15066 | +12.3% | 115 | 109 | 105 | 216 | false | true | true |
| delete | 14709 | 15654 | 14744 | -6.2% | 125 | 113 | 104 | 210 | false | true | true |

starter / 1000（1 run、cache 13,426,101 B）:

| scenario | cold ms | incremental ms | clean ms | clean 比 | save ms | restore ms | content reused | rendered | full regen | 一致 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cold | 107344 | — | 92186 | — | N/A | N/A | 0 | 1942 | true | true |
| no-change | 133483 | 114443 | 94948 | -20.5% | 1612 | 1490 | 1005 | 1942 | true | true |
| single-body-edit | 100316 | 122874 | 134400 | +8.6% | 1586 | 1415 | 1004 | 1942 | true | true |
| link-edit | 123605 | 77515 | 89438 | +13.3% | 1157 | 1090 | 1004 | 1942 | true | true |
| add | 85565 | 74576 | 93226 | +20.0% | 1207 | 1077 | 1005 | 1946 | true | true |
| delete | 80516 | 79652 | 80231 | +0.7% | 1000 | 1012 | 1004 | 1940 | true | true |

showcase / 100（3 runs、cache 26,732,101 B）:

| scenario | cold ms | incremental ms | clean ms | clean 比 | save ms | restore ms | content reused | rendered | full regen | 一致 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cold | 19270 | 19270 | 18478 | — | N/A | N/A | 0 | 268 | true | true |
| no-change | 25915 | 18488 | 17588 | -5.1% | 158 | 158 | 128 | 268 | true | true |
| single-body-edit | 18350 | 18796 | 19219 | +2.2% | 164 | 172 | 127 | 268 | true | true |
| link-edit | 20340 | 17877 | 19849 | +9.9% | 171 | 177 | 127 | 268 | true | true |
| add | 19088 | 19099 | 21186 | +9.9% | 176 | 186 | **0** | 272 | true | true |
| delete | 23364 | 22599 | 21736 | -4.0% | 181 | 191 | **0** | 266 | true | true |

showcase / 1000（1 run、cache 87,507,697 B）:

| scenario | cold ms | incremental ms | clean ms | clean 比 | save ms | restore ms | content reused | rendered | full regen | 一致 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cold | 72101 | — | 56001 | — | N/A | N/A | 0 | 2016 | true | true |
| no-change | 60882 | 53739 | 69990 | +23.2% | 1198 | 1127 | 1028 | 2016 | true | true |
| single-body-edit | 53115 | 43221 | 62803 | +31.2% | 1156 | 1215 | 1027 | 2016 | true | true |
| link-edit | 53941 | 46342 | 53192 | +12.9% | 1048 | 846 | 1027 | 2016 | true | true |
| add | 58989 | 55483 | 56828 | +2.4% | 1216 | 921 | **0** | 2020 | true | true |
| delete | 51327 | 51992 | 69845 | +25.6% | 1072 | 1060 | **0** | 2014 | true | true |

### 6.2 参考: SSG output cache も復元した場合（`--cacheOutput`）

starter / 100（3 runs、cache 5,527,235 B）:

| scenario | cold ms | incremental ms | clean ms | clean 比 | restore ms | content reused | rendered | fast path | full regen | 一致 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| cold | 17472 | 17472 | 15611 | — | N/A | 0 | 212 | false | true | true |
| no-change | 15168 | 12556 | 14597 | **+14.0%** | 396 | 105 | **0** | **true** | false | true |
| single-body-edit | 13650 | 13126 | 14317 | +8.3% | 372 | 104 | 212 | false | false | true |

showcase / 100（3 runs、cache 30,499,441 B）:

| scenario | cold ms | incremental ms | clean ms | clean 比 | content reused | rendered | full regen | 一致 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| no-change | 20372 | 20230 | 27432 | +26.3% | 128 | 268 | true | true |
| single-body-edit | 22455 | 21684 | 23110 | +6.2% | 127 | 268 | true | true |

### 6.3 読み取り

- **公式テンプレートの範囲（6.1）では、100 記事の増分は clean とほぼ同等**（clean 比 -13%〜+12%、符号も一定しない）。1000 記事では一見 +10〜30% の短縮が出るが、**1 run のみで clean の分散が大きい**（starter/1000 の clean は 80〜134 秒）ため割り引いて読む必要がある。この短縮は SSG 出力の再利用ではなく **content cache の再利用**（`reusedContentCount ≈ 全件`）によるもの。`fullRegen = true` なので出力再利用は一切起きていない。
- **showcase の add/delete では `contentReused = 0`**。記事の追加・削除で content cache が全件無効化される（第 8 章 8.4）。
- **output cache を復元した starter/100 の no-change だけが明確な勝ち筋**（+14.0%、`rendered = 0`、fast path 成立）。ただし容量は 1.45 MB → 5.53 MB。**showcase は output cache を復元しても fast path に乗らない**（第 8 章 8.5）。
- 固定コスト `ssrModuleLoad` は 100 記事で 5.6〜7.6 秒、1000 記事で 5.1〜9.3 秒。キャッシュ有無に関わらず毎回発生する。

---

## 7. Clean Build との出力一致検証

方法: 各サンプルで増分ビルド後の `dist` と、`.riebeckite` と `dist` を削除してから同一入力で作った clean ビルドの `dist` を、ファイル単位の sha256 で全件比較した（除外パスなし）。HTML / CSS / JS / JSON / assets / sitemap / RSS を区別せず、`dist` 配下の全ファイルが対象。

結果:

- **本計測 10 サンプル（starter 100/1000、showcase 100/1000、および output cache 版の 3+3 サンプル）はすべて一致（差分 0 件）。**
- 削除の反映: `delete` シナリオの `rendered` は no-change より 1 件少なく（starter/100 で 212→210、showcase/100 で 268→266）、一致も true。**削除されたページが出力に残存しない**ことを確認した。
- 追加の反映: `add` シナリオの `rendered` は 1 件増え（212→216、268→272）、一致 true。追加ページが成果物に含まれる。
- リンク変更: `link-edit` は依存先の出力を再生成しており、一致 true。
- 公開→非公開、schema 不一致、キャッシュ破損時の安全性は、リポジトリ既存のテスト `packages/integrations/honox/test/ci_persistent_state.test.ts` が網羅している（`visibility-change`, `content-state-corruption`, `pcc-corruption`, `state-schema-mismatch` などで `expectFullRegeneration: true` を検証）。本監査は重複して作り直していない。

**非決定的な値について:** RSS / sitemap / search-data.json を含め、増分出力と clean 出力に差分は出なかった。タイムスタンプ由来の非決定性は観測されなかった（生成物は内容のみに依存している）。

**例外的に 1 件だけ `equal: false` が出た診断ラン（`workRoot=ci-sim-diag2`, `2026-10-18T02-04-11-951Z-ci-outputcache.json`）** では、差異は `de/examples.html`, `es/examples.html`, `examples.html`, `explore.html`, `fr/examples.html`, `ja/examples.html`, `ko/examples.html`, `reference/plugins.html`, `search-data.json` の 9 ファイルだった。これは**別セッションが計測中に showcase の scaffold テンプレート（`app/components/site-header.tsx`, `app/style.css`）を編集中で、origin と fresh の scaffold が変更をまたいだため**と判断する。同一条件の再実行（`ci-sim-diag3`, 3 サンプル）では全件一致し、`incremental-dist` と clean の `dist` を直接比較しても 333 ファイル対 333 ファイルで差分 0 だった。**したがって PASS 扱いにはせず、環境要因の異常として第 11 章に残す。**

---

## 8. ボトルネック分析

各項目に【実測】/【推測】を明示する。実測は本監査の計測値、推測はコード読解からの判断。

### 8.1 CI で SSG output cache が復元されず全ルート再生成される【実測＋コード】

- 公式テンプレートは `.riebeckite/cache` と `content-state.json` のみ復元し、`ssg-output-cache.json`（`.entries` / `.fast-path.json` を含む）を復元しない。
- `canUseIncremental`（`packages/integrations/honox/src/ssg_plugin.ts:332-343`）は `previousOutputCache` が非 null であることを要求する。output cache が無いと偽 → `metrics.fullRegenerationRequired = !canUseIncremental`（`:379`）→ `RIEBECKITE_SSG_FULL_REGENERATION=1` を設定（`:398-401`）→ `content_route.ts` の `riebeckiteSsgParams` が全 permalink を返し、全ルートを再描画。
- 実測: 全シナリオで `fullRegenerationRequired = true`、`reusedOutputCount = 0`、`renderedOutputCount = 全ルート数`。100 記事では incremental ≈ clean。
- CLI 側の no-change fast path も `verifyNoChangeFastPath`（`:940-991`）が `.riebeckite/ssg-output-cache.fast-path.json` を要求するため、CI では発動しない（`packages/cli/src/commands/build.ts:146-195`）。

### 8.2 `ssrModuleLoad` の固定コスト（毎回 5.6〜9.3 秒）【実測】

- 実測 span: starter/100 cold 6141 ms、no-change 7491 ms、showcase/1000 で最大 9269 ms。100 記事ではビルド総時間の約 40〜50%。
- キャッシュの有無に関係なく毎回発生するため、CI の増分ビルドでも削減されない。SSR バンドルの構築とプラグイン初期化を含む。【推測】Vite/Rolldown の SSR ビルドが主因。専用の内訳 span が無く、これ以上の分解は未計測。

### 8.3 `content-state.json` の肥大化（`manifestHookCache` が 78%）【実測＋コード】

- 実測（starter/100 → 1,327,860 B）: `manifestHookCache` 1,033,644 B（78%）、`manifestEntries` 159,587、`outputs` 66,762、`entries` 44,681、`contentIndex` 22,979。
- `manifestHookCache` は 5 フック分で、各フックが**到達マニフェスト 105 エントリ全体の複製**を保持する（`properties` 159,917 / `folder-pages` 159,920 / `breadcrumbs` 219,834 / `hover-preview` 246,982 / `responsive-image` 246,985）。
- `folder-pages` は `cacheable = false` にもかかわらずスナップショットが保存されている。`packages/core/src/plugin/plugin_runtime.ts:372` が miss 時に `cacheable` の値を見ずに `createManifestHookCacheEntry` を push している。
- 影響: CI が復元・保存する `content-state.json` がノート数に比例して肥大（1000 記事で 13.4 MB、showcase/1000 では 87.5 MB）。転送・シリアライズコストに直結する。

### 8.4 l10n の global 依存による過剰無効化【実測＋コード】

- 実測: showcase の `add` / `delete` で `contentReused = 0`（no-change / body-edit / link-edit は 127〜128）。
- `packages/plugins/l10n/src/l10n.ts:75` が `processedContentCache { version: "l10n-global-content-locations-v1", dependencyMode: "global" }` を宣言。
- `hasGlobalContentDependency`（`content_persistent_cache.ts:495`）が真 → `content_manager.ts:754` が `computeContentScopeFingerprint(locations)` を pipeline fingerprint に混入（`content_persistent_cache.ts:317`）。記事の追加・削除でロケーション集合が変わると**全 content cache キーが無効化**される。

### 8.5 showcase は output cache を復元しても再利用が成立しない【実測＋未解決】

- 実測（showcase/100, output cache 復元, no-change）: `candidateOutputCount = 322`、`unchangedOutputCount = 322`、`reusedOutputCount = 0`、`cacheEntriesRead = 330`、`renderedOutputCount = 268`、`fullRegenerationRequired = true`。starter は同条件で `reused = 256`、`rendered = 0`。
- 診断: origin と fresh の `appFingerprint` は一致（`28b55...8594`）、`clientManifestFingerprint` は両方 undefined、content-state の `outputs`（322）に unknown 依存は 0 件、unchanged(322) ⊆ output cache(330)。
- **`ssg_plugin.ts:332-343` のどの条件で弾かれたかは特定できなかった**（未解決）。候補は (a) `siteOwnedOutputPaths` に含まれない unchanged 出力の存在、(b) `outputChangeSet.fullRegenerationRequired` の残存。根拠として、origin output cache にはあるが `content-state.json.outputs` に無い 8 出力（`atom.xml`, `feed.json`, `feed.xml`, `robots.txt`, `search-data.json`, `sitemap.xml`, `taxonomy/index.json`, `webmentions.json`）が存在し、COLD ビルドでも `content-state.outputs`(322) < output cache(330) になっている（これら生成出力は output cache 側にのみ記録される）。Phase 2 で計器を足して確定させる。

### 8.6 content cache の GC が無い【コード】

- `content_persistent_cache.ts:207-213` の `clear()` 以外に古いエントリを削除する仕組みが無い。内容変更が続くと `.riebeckite/cache/content/v5` が単調増加し、CI 転送量が時間とともに増える。output cache 側は `collectUnreferencedOutputCacheEntries`（`ssg_plugin.ts:1598-1627`）で GC される。

### 8.7 Manifest 生成・Plugin Hook【実測（軽微）】

- `manifestHooksReused = 4` / `manifestHookCacheMiss = 1`（`folder-pages`, reason `uncacheable`）、`manifestHookDurationMs` は 1 ms 未満。**Manifest 生成そのものはボトルネックではない**。ただし 8.3 のとおり保存データは過大。

### 8.8 キャッシュ転送【未計測】

- テンプレートのキャッシュ量: starter/100 = 1.45 MB、starter/1000 = 13.4 MB、showcase/100 = 26.7 MB、showcase/1000 = **87.5 MB**。ローカルでのコピー（保存/復元）は 0.1〜1.6 秒だが、**GitHub Actions のキャッシュ転送時間は未計測**（第 11 章）。87.5 MB の転送が 20 秒前後の削減に見合うかは、実測なしに判断できない。

### 8.9 リポジトリ自身の CI は恩恵を受けていない【コード】

- `.github/workflows/deploy.yml` / `ci.yml` は Riebeckite 状態の `actions/cache` を持たない。したがって公式テンプレートでさえ有効でない経路が、リポジトリ自身ではさらに使われていない。

---

## 9. 改善優先順位

既存のキャッシュ機構は作り直さない。以下は既存実装の延長・修正に限定した提案。優先順位は「実利用者への効果 → CI 総時間 → 正しさ → 複雑さ → アーキ整合 → 保守コスト」で決めた。

### P0-1: showcase で output cache 再利用が成立しない原因の特定と修正

- 問題: showcase では output cache を復元しても `reusedOutputCount = 0`、全ルート再生成のまま（8.5）。
- 根本原因: `ssg_plugin.ts:332-343` の `canUseIncremental` のどの条件で弾かれているか未特定。`content-state.outputs`(322) と output cache(330) のずれ（生成出力 8 件）が関与している可能性。
- 修正対象: `packages/integrations/honox/src/ssg_plugin.ts`（`canUseIncremental`, `loadOutputCache`, `buildOutputInventory` 相当）、必要なら `packages/core/src/content/output_dependency.ts`。
- 実装方針: まず**計器（各条件の評価結果を metrics に出す）を追加**して弾かれた項を確定する。その上で、生成出力（feed/sitemap/search-data 等）を `content-state.outputs` と output inventory の双方で一貫して扱うよう修正する。推測で条件を緩めない。
- 期待効果: showcase（最重量・最利用のデモ）で fast path が成立すれば 100 記事でも明確な短縮（starter 相当で +14%、`rendered = 0`）。
- リスク: 条件を誤って緩めると不要出力の再利用・出力欠落を招く。**正しさ最優先**で、既存の `ci_persistent_state.test.ts` の期待（output-cache あり → `expectReuse: true`）を回帰として使う。
- 検証方法: `--cacheOutput` 版 ci-runner で showcase の `reusedOutputCount > 0` / `renderedOutputCount = 0` を確認し、clean との一致（第 7 章の方法）を全件確認。`ci_persistent_state.test.ts` を実行。
- 完了条件: showcase の no-change が fast path に乗り、増分出力 = clean 出力（差分 0）。

### P0-2: `manifestHookCache` の肥大化解消

- 問題: `content-state.json` の 78% が `manifestHookCache`。CI 転送量とシリアライズコストに直結（8.3）。
- 根本原因: `plugin_runtime.ts:372` が `cacheable = false` のフック（`folder-pages`）でも全マニフェスト複製を保存し、複数フックが同一マニフェストを重複保持している。
- 修正対象: `packages/core/src/plugin/plugin_runtime.ts`、`packages/core/src/content/content_build_state.ts`（`manifestHookCache` の形）。
- 実装方針: (a) `cacheable = false` のエントリは保存しない、(b) フック横断で到達マニフェストを共有／差分のみ保持して複製をやめる。保存形式の後方互換（version 16 → 17）とロード時のフォールバックを用意する。
- 期待効果: `content-state.json` を大幅縮小（試算で 78% 分の重複が対象）。CI 転送・保存・ロードのすべてを削減。
- リスク: フックキャッシュの取り違え。`inputFingerprint` / `pipelineFingerprint` 検証は維持する。
- 検証方法: `manifestHookCache` のサイズ計測（本レポート 2.3 の手法）、`manifestHooksReused` が従来同等（4 / 5）であること、`ci_persistent_state.test.ts` 通過。
- 完了条件: `content-state.json` の `manifestHookCache` が数分の一になり、フック再利用数が維持され、増分出力 = clean 出力。

### P1-1: 公式デプロイテンプレートで output cache を復元する

- 問題: テンプレートが output cache を復元しないため、利用者の CI で fast path が一切発動しない（6.1, 8.1）。
- 根本原因: `deploy.yml` のキャッシュ対象と docs（`github-actions.md:441`）が「output cache は大きいので永続化しない」としている。
- 修正対象: `packages/create-riebeckite/templates/scaffold/deployment/github-actions/deploy.yml`、`docs/docs/guides/deployment/github-actions.md`。
- 実装方針: output cache を `actions/cache` の対象に加える。容量対策として (a) `.entries` をバイナリ圧縮、(b) P0-2 と併用して総量を縮小、(c) `restore-keys` で内容変更時は安全にミスさせる。**showcase のように効果が出ないケースがあるため、実際に効果が出る条件（P0-1 の結論）を確認してから既定化する。**
- 期待効果: starter 系で fast path 成立時 +14%（100 記事、8.5 実測ベース）。
- リスク: 転送量増（1.45 MB → 5.53 MB、showcase はさらに大）。**損益分岐点は実 GHA での転送計測が必要（未検証）。**
- 検証方法: 実 GitHub Actions での restore/save 時間とビルド短縮の比較。ローカルは `--cacheOutput` 版 ci-runner。
- 完了条件: 実 GHA で、復元＋保存込みの総時間が output cache 無しより短いことを確認。

### P1-2: l10n（global 依存）の無効化範囲の見直し

- 問題: showcase で記事の追加・削除時に content cache が全件無効化（`contentReused = 0`、8.4）。
- 根本原因: `dependencyMode: "global"` により `computeContentScopeFingerprint(locations)` が pipeline fingerprint に混入し、ロケーション集合の変化で全キーが変わる（`l10n.ts:75`, `content_manager.ts:754`, `content_persistent_cache.ts:317,495`）。
- 修正対象: `packages/plugins/l10n/src/l10n.ts`、`packages/core/src/content/content_persistent_cache.ts`。
- 実装方針: global 依存を「全ロケーション」から「当該コンテンツの言語・翻訳関係」へ分解し、無関係な記事の追加・削除で他記事のキャッシュを無効化しないよう、依存の粒度を上げる。
- 期待効果: showcase の add/delete で contentReused を 0 から部分再利用へ。
- リスク: 多言語リンク（翻訳対応）の取り違え。翻訳関係を含むシナリオの回帰テストが必須。
- 検証方法: showcase の add/delete で `contentReused > 0` かつ増分出力 = clean 出力。多言語ナビゲーションの既存テスト。
- 完了条件: add/delete で contentReused が十分な件数になり、出力一致を維持。

### P2-1: content persistent cache の GC / 容量上限

- 問題: 内容変更が続くと `.riebeckite/cache/content/v5` が単調増加（8.6）。
- 根本原因: `content_persistent_cache.ts:207-213` の `clear()` 以外に削除手段が無い。
- 修正対象: `packages/core/src/content/content_persistent_cache.ts`。
- 実装方針: 参照されなくなった（contentIndex に現れない）エントリをビルド後に削除。上限バイト数・件数超過時の LRU 削除を追加。
- 期待効果: CI 転送量の経年肥大を防止。
- リスク: 誤削除。contentIndex 基準の判定で安全に。
- 検証方法: 追加→削除を繰り返し、`cache/content` のサイズが収束すること。
- 完了条件: 参照ゼロのエントリが残らない。

### P2-2: `ssrModuleLoad` 固定コストの内訳計測と削減

- 問題: 毎回 5.6〜9.3 秒（8.2）。100 記事では支配的。
- 根本原因: 【推測】Vite/Rolldown の SSR ビルド。専用 span が無く未確認。
- 修正対象: `packages/integrations/honox/src/ssg_plugin.ts` 周辺の計測、必要ならビルド構成。
- 実装方針: まず内訳 span を追加して実体を特定してから最適化を検討（本監査では推測の段階）。
- 期待効果: 特定できれば全 CI 実行に恒常的に効く最大の改善余地。
- リスク: ビルド構成変更は影響範囲が広い。
- 検証方法: span 内訳と総時間の変化。
- 完了条件: 内訳が判明し、削減策の効果が実測で示される。

### P3-1: 並行 CI の競合と restore-keys の死んだ接頭辞

- 問題: (a) `saveContentBuildState` にプロセス間ロックが無く last-writer-wins（3 章）。(b) テンプレートの `restore-keys` 2 行目 `riebeckite-content-v3-...` は保存キー `riebeckite-build-v1-...` と接頭辞が一致せず**常にマッチしない**。
- 根本原因: ロック無し設計、キー命名の不整合。
- 修正対象: `packages/core/src/content/content_build_state_store.ts`、`deploy.yml`（restore-keys の 2 行目削除）。
- 実装方針: restore-keys の誤りは削除して整理。ロックは必要性が低ければ「同一 runner で並行ビルドしない」前提を docs に明記するに留める。
- 期待効果: 無駄なキャッシュ参照の除去、ドキュメント整合。
- リスク: 低。
- 検証方法: テンプレートのゴールデン更新、`ci_persistent_state.test.ts`。
- 完了条件: restore-keys が実際に機能する 1 系に整理される。

---

## 10. Phase 2 の推奨実装計画

前提: 既存キャッシュ機構は維持する。Phase 2 は「計測 → 修正 → 効果検証」の順で進め、推測で条件を緩めない。

1. **計器の追加（P0-1 の前提）**: `ssg_plugin.ts:332-343` の `canUseIncremental` 各条件と `outputChangeSet.fullRegenerationRequired`、`siteOwnedOutputPaths` と unchanged 出力の差分を metrics に出力する。これで showcase がどの条件で弾かれるかを確定する。あわせて `ssrModuleLoad` の内訳 span（P2-2）も追加する。
   - 完了条件: showcase/100 no-change（output cache 復元）で「弾かれた条件」が metrics に出る。
2. **showcase の再利用不成立を修正（P0-1）**: 生成出力（feed/sitemap/search-data 等）を `content-state.outputs` と output inventory で一貫して扱う。`ci_persistent_state.test.ts` の `output-cache-*` 系（`expectReuse: true`）を回帰として維持。
   - 完了条件: showcase の no-change が fast path 成立、増分出力 = clean 出力。
3. **`manifestHookCache` 縮小（P0-2）**: `cacheable=false` を保存しない＋マニフェスト共有。バージョンを上げ、旧形式はコールドへフォールバック。
   - 完了条件: `content-state.json` が大幅縮小し、`manifestHooksReused` 維持、出力一致。
4. **テンプレートと docs の更新（P1-1）**: output cache をキャッシュ対象に加える（P0-2 の縮小後）。showcase のように効果が出ない条件を踏まえて既定化を判断する。
   - 完了条件: ゴールデン更新＋実 GHA で転送込み総時間の改善を確認。
5. **l10n の無効化粒度改善（P1-2）**: global 依存を翻訳関係へ分解。
   - 完了条件: showcase の add/delete で `contentReused > 0`、出力一致。
6. **content cache GC（P2-1）** と **restore-keys 整理（P3-1）**。
7. **実 GitHub Actions での効果測定**: restore/save の実時間を含めた損益分岐点を計測し、P1-1 の既定化を最終判断する。

各段階で `packages/integrations/honox/test/ci_persistent_state.test.ts` と `pnpm test:benchmark:presets` を回帰として実行する。

---

## 11. 未検証事項・制約

- **実 GitHub Actions では未計測。** 本監査はすべて「ローカル CI シミュレーション」であり、`actions/cache` の実転送時間、`npm ci` の実時間、ネットワーク、runner の CPU 差は含まない。キャッシュの restore/save はローカルファイルコピーで近似した（0.1〜1.6 秒）ため、**転送込みの損益分岐点は算出できていない**。
- **showcase の output cache 再利用不成立の原因は未特定**（8.5, P0-1）。app/client fingerprint 一致・unknown 依存 0・unchanged ⊆ output cache という確認までは済んだが、`canUseIncremental` のどの項で弾かれたかは計器不足で確定できなかった。
- **1000 記事の結果は 1 回測定のみ**で、clean ビルド時間の分散が大きい（starter/1000 で 80〜134 秒）。10〜30% の短縮値は割り引いて解釈すべき。1000 記事は 3 回以上未実施。
- **計測が複数の HEAD にまたがる。** 計測中に別セッションが `main` へコミット・編集を続けており（starter 系は `aea6c79b` 前後、showcase 系は `202d943c`）、厳密には単一リビジョンではない。各シナリオは同一ツリーから origin/fresh/clean を作るためシナリオ内の比較は有効だが、プリセット間・時系列間の厳密比較には注意を要する。
- **同一条件の診断ラン 1 件で `equal: false`** が出た（第 7 章）。別セッションのテンプレート編集（`site-header.tsx`, `style.css`）が origin と fresh の間に入った環境要因と判断し、再実行で再現しなかったため PASS には数えていない。恒久的な再検証項目として残す。
- **専用 span が無い区間**: Content 処理そのもの、Manifest 生成には専用 span が無いため N/A とし、推測で埋めていない（第 5.3 表）。
- **依存関係インストール時間は N/A**: ハーネスはワークスペース・パッケージを直接リンクし `npm ci` を再現しない。
- **10,000 記事は対象外**（指示により除外）。
- showcase 計測は、公式 `runner.mjs` でも再現する puppeteer 解決不具合を回避するため `packages/plugins/node_modules` へ junction を追加して実施した（環境側の回避であり、計測値の意味は変えない）。
- 未検証: output cache を復元した状態での 1000 記事の効果（容量・時間）、`ssrModuleLoad` の内訳、並行 CI 実行時の競合の実害。
