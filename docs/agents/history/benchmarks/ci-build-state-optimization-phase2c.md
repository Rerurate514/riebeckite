# Riebeckite Phase 2C レポート: Manifest Hook Cache と Build State の保存構造最適化

| 項目 | 内容 |
| --- | --- |
| 対象リポジトリ | riebeckite |
| ブランチ | main |
| ベースコミット | `93cb4f40`（Phase 2B 完了時点） |
| 計測環境 | Windows 11 / Node.js v24.11.1 / pnpm |
| 計測種別 | ローカル CI シミュレーション（実 GitHub Actions は未計測） |
| 計測ハーネス | `benchmarks/preset-ssg/ci-runner.mjs` |
| 関連レポート | Phase 1 `ci-incremental-build-audit.md` / Phase 2A `ci-output-cache-reuse-phase2a.md` / Phase 2B `ci-output-cache-phase2b.md` |

## 1. Executive Summary

Phase 2B のローカル CI シミュレーションでは、Showcase/1000 の CI キャッシュが 95.61 MiB に達し、うち Build State が 82.03 MiB（全体の 86%）を占めていた。Phase 1 の監査で、その大半は `manifestHookCache` であり、複数の manifest hook がマニフェスト全体のスナップショットを重複保存していることが指摘されていた。

Phase 2C では Build State の保存構造を監査し、次の 2 点だけを変更した。

1. `cacheable=false` の hook について、スナップショットを保存しない。
2. `cacheable=true` の hook について、マニフェスト全体ではなく、その hook が入力から変更した entry だけを差分として保存する。

保存形式が変わるため `CONTENT_BUILD_STATE_VERSION` を 16 から 17 へ上げた。旧バージョンの状態は読み込み時に棄却され、Cold Build へ安全にフォールバックする。hook の実行順序・副作用・マニフェスト最終結果・依存関係追跡・Output Cache の再利用判定は変更していない。

ローカル CI シミュレーション（`--runs 3` の中央値）の結果:

| Preset / 記事数 | Build State（前 → 後） | manifestHookCache（前 → 後） | CI キャッシュ合計（前 → 後） |
| --- | ---: | ---: | ---: |
| starter / 100 | 1.27 MiB → 0.70 MiB（−44.5%） | 0.99 MiB → 0.42 MiB（−57.1%） | 2.50 MiB → 1.94 MiB（−22.5%） |
| starter / 1000 | 11.74 MiB → 6.56 MiB（−44.1%） | 9.17 MiB → 3.99 MiB（−56.5%） | 21.99 MiB → 16.81 MiB（−23.5%） |
| showcase / 100 | 25.05 MiB → 8.76 MiB（−65.0%） | 23.89 MiB → 7.61 MiB（−68.2%） | 27.99 MiB → 11.71 MiB（−58.2%） |
| showcase / 1000 | 82.03 MiB → 23.78 MiB（−71.0%） | 78.04 MiB → 19.79 MiB（−74.6%） | 95.61 MiB → 37.36 MiB（−60.9%） |

すべての実行で増分ビルドの `dist/` は Clean Build と一致し、`contentReused` / `outputRendered` / fast path / full regeneration の決定的カウンタは前後で完全に同一だった。つまり容量だけを削って再利用を落としたのではなく、再利用の成立状況を変えずに保存量を削減している。

壁時計時間はこの環境では実行時期のマシン負荷で 20〜40% 変動し、前後比較の主軸にはならない（第 8 章）。

## 2. 変更前の Build State 構造

### 2.1 型定義

`packages/core/src/content/content_build_state.ts`:

```ts
export const CONTENT_BUILD_STATE_VERSION = 16;

export type ContentBuildState = {
  readonly version: number;
  readonly entries: Readonly<Record<string, ContentBuildEntry>>;
  readonly contentIndex: Readonly<Record<string, string>>;
  readonly pipelineFingerprint?: string;
  readonly manifestEntries?: readonly ContentManifestEntry[];
  readonly outputs?: readonly OutputDescriptor[];
  readonly externalDependencies?: readonly PersistedExternalDependency[];
  readonly manifestHookCache?: readonly ManifestHookCacheEntry[];
  readonly nextPublishingChangeAt?: string;
};

export type ManifestHookCacheEntry = {
  readonly pluginName: string;
  readonly cacheable: boolean;
  readonly pipelineFingerprint: string | undefined;
  readonly inputFingerprint: string;
  readonly outputFingerprint: string;
  readonly snapshot: ManifestHookSnapshot;
};

export type ManifestHookSnapshot = {
  readonly entries: readonly ContentManifestEntry[];
};
```

### 2.2 保存処理

- `ContentBuildCoordinator.commit()` が `ContentBuildState` を組み立て、`saveContentBuildState()` が一時ファイル + rename で `.riebeckite/build/content-state.json` へ書き込む。
- `manifestHookCache` は `PluginRuntime.getManifestHookCache()` が返した配列を、`manifestEntries` は hook 実行前の entry スナップショット（`cacheManifestEntries`）をそのまま保存する。
- `manifestHookCache` の各エントリは manifest hook の実行順に 1 件ずつ並ぶ。

### 2.3 Manifest Hook Cache の保存・復元

`packages/core/src/plugin/plugin_runtime.ts` の `runManifestCreated()` が実行順に処理する。

- hook 実行前後で、entry 以外の manifest 状態（`fingerprintManifestHookSideEffects`）、生成出力数、診断数の不変性を確認し、すべて不変なら `cacheable=true`。`resolveExternalDependencies` を持つプラグインは常に `cacheable=false`。
- `cacheable=true` の hook は、hook 実行後のマニフェスト全体を `inputFingerprint`（hook 入力の fingerprint）と `outputFingerprint`（hook 出力の fingerprint）とともに保存する。
- 変更前のスナップショット生成は次と等価だった。

```ts
snapshot = { entries: JSON.parse(JSON.stringify(manifest.entries)) };
```

つまり **hook ごとに、その時点の全 entry を丸ごと複製して保存** していた。

- 復元時は `cached.pluginName` / `cached.cacheable` / `cached.pipelineFingerprint` / `cached.inputFingerprint` の一致を確認し、スナップショットを適用して `outputFingerprint` を再計算する。一致すれば hook をスキップして再利用し、不一致なら復元点へ戻して hook を実行する。

### 2.4 無効化条件

`manifestHookCacheMissReason()` が返す理由は次のとおり。

| 理由 | 条件 |
| --- | --- |
| `cache-missing` | 前回のキャッシュエントリが存在しない |
| `plugin-order-changed` | 同じ位置の pluginName が異なる |
| `uncacheable` | 前回のエントリが `cacheable=false` |
| `pipeline-fingerprint-changed` | pipeline fingerprint が異なる |
| `manifest-input-changed` | hook 入力の fingerprint が異なる |
| `snapshot-invalid` | 上記以外（適用結果が `outputFingerprint` と一致しない） |

### 2.5 バージョン管理と依存関係

- Build State は top-level の `version` を持ち、`loadContentBuildState()` は `version === CONTENT_BUILD_STATE_VERSION` かつ形が正しいときだけ復元する。それ以外は `undefined` を返し、呼び出し側は Cold Build へフォールバックする。
- Content Cache との依存: `entries[].processedContentCacheFingerprint` と `pipelineFingerprint`。
- Output Cache との依存: `outputs[]`（出力記述子）。`determineOutputChanges()` が現在の manifest と前回の `outputs` を比較し、再利用する出力を決める。`manifestHookCache` は出力記述子を持たないため、Output Cache の再利用判定には直接関与しない。
- `manifestEntries` は hook 実行前の entry を保持し、次回の増分ビルドで未変更 entry をそのまま再利用するために使う。

## 3. 容量の内訳

以下は Showcase/1000（変更前 v16、`ci-runner` の no-change・run-1 の `incremental-content-state.json`）の実測である。

### 3.1 Build State の top-level 内訳

| フィールド | 容量 | 備考 |
| --- | ---: | --- |
| `version` | 2 B | |
| `entries` | 502,678 B | Content Cache の増分判定用メタデータ |
| `contentIndex` | 228,772 B | content id → slug |
| `pipelineFingerprint` | 66 B | |
| `manifestEntries` | 2,627,424 B | hook 実行前の全 entry（1,036 件） |
| `outputs` | 816,293 B | Output Cache の出力記述子 |
| `externalDependencies` | 274 B | |
| `manifestHookCache` | 81,835,773 B | **全体の 95.1%** |
| 合計 | 86,011,419 B（82.03 MiB） | |

`manifestHookCache` が Build State の 95% を占める。Content 関連メタデータ（`entries` + `contentIndex`）は 731 KB、Output 関連メタデータ（`outputs`）は 816 KB、その他の保存データ（`manifestEntries` など）は 2.6 MB であり、いずれも hook cache に比べて小さい。

### 3.2 hook ごとの保存容量（変更前）

Showcase/1000 は manifest hook を 21 件実行する。すべてのスナップショットが「その時点の全 1,036 entry」を丸ごと保持している。

| # | hook | cacheable | snapshot entries | 容量 |
| ---: | --- | --- | ---: | ---: |
| 1 | canvas | true | 1036 | 2,627,750 B |
| 2 | excalibrain | true | 1036 | 3,685,969 B |
| 3 | l10n | true | 1036 | 3,904,417 B |
| 4 | properties | true | 1036 | 3,904,423 B |
| 5 | webmention | **false** | 1036 | 3,904,424 B |
| 6 | series | true | 1036 | 3,904,419 B |
| 7 | folder-pages | **false** | 1036 | 3,904,426 B |
| 8 | breadcrumbs | true | 1036 | 4,545,745 B |
| 9 | gallery | true | 1036 | 4,551,951 B |
| 10 | discord-embed | true | 1036 | 3,774,025 B |
| 11 | bases | true | 1036 | 3,770,513 B |
| 12 | dataview | true | 1036 | 3,776,948 B |
| 13 | flashcards | true | 1036 | 3,776,950 B |
| 14 | kanban | true | 1036 | 3,776,946 B |
| 15 | query | true | 1036 | 3,776,137 B |
| 16 | hover-preview | true | 1036 | 4,041,788 B |
| 17 | ux | true | 1036 | 4,041,777 B |
| 18 | rename | **false** | 1036 | 4,041,782 B |
| 19 | quality | **false** | 1036 | 4,041,783 B |
| 20 | diagnostics | **false** | 1036 | 4,041,787 B |
| 21 | responsive-image | true | 1036 | 4,041,791 B |
| | **合計** | | | **81,835,773 B** |

容量の大きい順では上位 5 件が `breadcrumbs`（4.55 MB）、`gallery`（4.55 MB）、`l10n` / `properties` / `webmention`（各 3.90 MB）である。差は「その hook が何件の entry を変更したか」ではなく「その時点までの累積 entry サイズ」を反映しているにすぎない。

### 3.3 同一内容の重複スナップショット数

各スナップショットは直前に実行された hook の出力と同一の entry を大量に含む。変更前の 21 スナップショットを入力と比較すると、実際に内容が変わった entry 数は次のとおり。

- `html` を変更する hook: excalibrain(65)、gallery(16)、bases(8)、dataview(8)、query(8)、hover-preview(112) の 6 件。
- `headTags` を変更する hook: l10n(130)、breadcrumbs(130)、discord-embed(136) の 3 件。
- それ以外の 12 件（canvas / properties / webmention / series / folder-pages / flashcards / kanban / ux / rename / quality / diagnostics / responsive-image）は **entry を 1 件も変更していない**。それでも全 1,036 entry を保存していた。

対象期間で変更される entry フィールドは `html` と `headTags` だけで、entry の追加・削除・並び替えは発生していない（全 hook で added=0 / removed=0 / orderChanged=false）。したがって変更前の 21 スナップショットは、ほぼ全量が重複である。

### 3.4 cacheable=true / false ごとの保存量（変更前）

| 区分 | エントリ数 | 容量 |
| --- | ---: | ---: |
| cacheable=true | 16 | 61,901,549 B（75.6%） |
| cacheable=false | 5 | 19,934,202 B（24.4%） |

`cacheable=false` の 5 hook（webmention / folder-pages / rename / quality / diagnostics）のスナップショットは、後続の再利用には決して使われない（`cacheable` チェックで除外される）にもかかわらず、合計 19.9 MB を保存していた。

## 4. Manifest Hook Cache の必要性

各 hook のスナップショットの用途は「その hook の実行結果を再利用するためのキャッシュ」であり、後続 hook の差分判定に必要なデータではない。後続 hook の入力変化判定は `inputFingerprint`（現在のマニフェスト全体の fingerprint）が担うため、先行 hook の出力スナップショットを後続の差分判定に使う必要はない。各 hook のスナップショットが復元時に必須なのは「その hook 自身の出力を再現する」ときだけである。

必要なデータを分類すると次のとおり。

| データ | 用途 | 削減可否 |
| --- | --- | --- |
| `cacheable=true` のスナップショット（変更した entry のみ） | hook 出力の再現（再利用） | **保持** |
| `cacheable=true` のスナップショットの未変更 entry | 入力から再構成できる | **削除**（入力と同一は `inputFingerprint` で保証） |
| `cacheable=false` のスナップショット | 再利用に決して使われない | **削除**（位置合わせのメタデータのみ残す） |
| 変更 0 の hook のスナップショット | 入力と同一 | 空の差分として保存 |
| `pluginName` / `cacheable` / `pipelineFingerprint` / `inputFingerprint` | 位置合わせと無効化判定 | **保持** |

`cacheable=false` の hook のスナップショットは、後続処理でも参照されない。`getNoChangeFastPathBlockReason()` と `manifestHookCacheMissReason()` はどちらも `cacheable` を見て判定し、スナップショット本体は読まない。`cacheable=false` が後続 hook に与える影響は「hook を毎回実行し、その副作用（`folderLocations` の更新、診断の追加など）を再現する」ことのみであり、副作用は実行時に再生成されるためスナップショットは不要である。

診断専用のデータは保存していない。`manifestHookCache` のエントリはすべて再利用のために保存されたものであり、参照されない診断データは確認できなかった。

## 5. 最適化方針と選定理由

タスクの指定どおり、A（不要データの保存停止）→ B（重複スナップショットの排除）→ C（差分保存）→ D（シリアライズ形式の改善）の順に検討した。

### 5.1 採用: A + B/C（entry 単位の差分保存）

- **A**: `cacheable=false` の hook はスナップショット（`snapshot` と `outputFingerprint`）を保存しない。位置合わせに必要なメタデータだけを残す。
- **B/C**: `cacheable=true` の hook は、入力に対して変更した entry だけを `snapshot.entries` として保存する。entry の並び順が変わった場合のみ `snapshot.order`（全 slug の順序）を保存する。

復元時は、現在の `manifest.entries` を基底にし、`snapshot.entries` を slug で上書きマージして派生 index を再構築する。未変更 entry が入力と同一であることは `inputFingerprint` の一致で保証されるため、これで hook 後の全 entry を過不足なく再現できる。

選定理由:

- 既存の `snapshot.entries` という保存フィールドと意味（「hook の出力 entry」）を維持でき、キャッシュ構造の複雑化を最小限にできる。新しい型・新しいキャッシュ層を追加しない。
- 適用処理は「slug で上書きマージ」だけで、entry の追加・削除・並び替えも `order` で表現できる。
- 入力の fingerprint 検証により、未変更 entry の同一性が保証される。安全性を犠牲にしていない。

### 5.2 不採用の案

| 案 | 不採用の理由 |
| --- | --- |
| 全 hook のスナップショットを廃止 | `cacheable=true` hook の再利用が失われ、増分ビルドの正しさは保てても性能要件を壊す |
| 21 hook で 1 つのスナップショットを共有 | hook ごとの出力が異なるため、hook 単位の再利用が成立しない |
| `cacheable=false` のエントリごと削除 | 実行順の位置合わせが壊れる。メタデータのみ残すのが最小の変更である |
| field 単位の浅い差分（変更した `html` / `headTags` だけを保存） | さらに小さい（Showcase/1000 で約 20.8 MB → 約 4.3 MB 相当）が、マージ・キー削除・検証の面が増える。タスクが D（形式改善）を最後の選択肢としているため、測定済みの残課題として記録する（第 10 章） |
| 圧縮・バイナリ形式 | タスクが最後の選択肢としている |

## 6. 変更後の保存形式

### 6.1 型定義

`packages/core/src/content/content_build_state.ts`:

```ts
export const CONTENT_BUILD_STATE_VERSION = 17;

export type ManifestHookCacheEntry = {
  readonly pluginName: string;
  readonly cacheable: boolean;
  readonly pipelineFingerprint: string | undefined;
  readonly inputFingerprint: string;
  readonly outputFingerprint?: string;
  readonly snapshot?: ManifestHookSnapshot;
};

export type ManifestHookSnapshot = {
  readonly entries: readonly ContentManifestEntry[];
  readonly order?: readonly string[];
};
```

- `cacheable=false`: `outputFingerprint` と `snapshot` を持たない。
- `cacheable=true`: `snapshot.entries` は「入力から変更した entry のみ」、`snapshot.order` は entry の並び順が変わったときだけ持つ。

### 6.2 保存処理

`packages/core/src/content/manifest_hook_cache.ts`:

- `serializeManifestEntries(entries)` が `slug → JSON.stringify(entry)` の Map を作る。
- `createManifestHookCacheEntry(pluginName, cacheable, pipelineFingerprint, inputFingerprint, manifest, beforeEntries, afterEntries)` が、hook 入力と出力の entry シリアライズを比較し、変更された entry だけを `snapshot.entries` に入れる。`cacheable=false` のときはメタデータのみを返す。
- `applyManifestHookSnapshot(manifest, snapshot)` が、現在の `manifest.entries` を基底に `snapshot.entries` を slug で上書きマージし、`order` があればその順に並べ替え、`bySlug` / `byAlias` / `byTag` / `byAsset` / `outgoingLinks` / `incomingLinks` / `byPermalink` などの派生 index を再構築する。

`packages/core/src/plugin/plugin_runtime.ts` の `runManifestCreated()`:

- hook 実行前に entry を 1 回シリアライズし、実行後に再度シリアライズして差分を計算する。`cacheable` の判定は従来どおり（entry 以外の副作用・生成出力数・診断数の不変性）である。
- 復元時は復元点を確保してから `applyManifestHookSnapshot()` を適用し、`outputFingerprint` が一致すれば再利用する。一致しなければ復元点へ戻して hook を実行する（従来と同じ安全性）。

## 7. 互換性と安全性

### 7.1 バージョン更新の判断

保存形式（`snapshot` の意味）が変わるため、`CONTENT_BUILD_STATE_VERSION` を 16 から 17 へ上げた。理由:

- 旧 v16 の `snapshot.entries` は「全 entry」であり、新形式は「差分 entry」である。バージョンを据え置くと、旧形式を新形式として解釈して `order` のない差分としてマージし、**誤ったマニフェストを復元する恐れがある**。
- 旧形式を読み分ける互換コードを足すより、`version` 不一致として棄却し Cold Build へフォールバックするほうが安全で、複雑度も低い。

### 7.2 安全性の確認事項

| 確認事項 | 挙動 |
| --- | --- |
| 旧キャッシュを安全に読み込めるか | v16 の状態は `version === 17` を満たさず棄却され、Cold Build になる |
| 読み込めない場合に Cold Build へフォールバックするか | `loadContentBuildState()` が `undefined` を返し、呼び出し側が全体再生成する |
| 古い Manifest Hook Cache が誤って採用されないか | state 全体が棄却されるため採用されない。仮に採用経路でも `inputFingerprint` / `outputFingerprint` の不一致で棄却される |
| 一部欠損時に安全に再生成されるか | state 全体が棄却されるか、hook 単位で `manifest-input-changed` として再実行される |
| 不正なデータでクラッシュしないか | `isManifestHookCache()` が形を検証し、`snapshot.entries` が配列でない、`order` が文字列配列でない場合は state を棄却する。適用は `try/catch` で、失敗時は hook を実行する |

### 7.3 維持した不変条件

- hook の実行順序と副作用を維持する。
- マニフェストの最終結果を変更しない（差分は hook 後の entry と等価に再構築される）。
- 依存関係追跡（`inputFingerprint` / `pipelineFingerprint` / `processedContentCacheFingerprint`）を維持する。
- 公開境界を維持する（`publicEntries` / `discoverableEntries` は復元時に現在の slug から再構築する）。
- Output Cache の再利用判定を壊さない（`outputs` と `determineOutputChanges()` は未変更）。
- Starter / Showcase の両方に適用できる（Preset 固有の分岐を追加していない）。

## 8. 修正前後の容量比較

いずれも同一ハーネス・同一コマンド（`--runs 3` の中央値、`--scenarios no-change`）。

### 8.1 Build State と manifestHookCache

| Preset / 記事数 | Build State 前 | Build State 後 | 削減 | manifestHookCache 前 | manifestHookCache 後 | 削減 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| starter / 100 | 1,327,860 B | 737,458 B | −44.5% | 1,033,644 B | 443,242 B | −57.1% |
| starter / 1000 | 12,310,048 B | 6,883,137 B | −44.1% | 9,611,398 B | 4,184,487 B | −56.5% |
| showcase / 100 | 26,266,591 B | 9,188,057 B | −65.0% | 25,054,942 B | 7,976,408 B | −68.2% |
| showcase / 1000 | 86,011,419 B | 24,931,308 B | −71.0% | 81,835,773 B | 20,755,662 B | −74.6% |

### 8.2 内訳（Showcase/1000）

変更前は `manifestHookCache` が Build State の 95.1% を占めていたが、変更後は 83.3% になり、その絶対量は 78.04 MiB から 19.79 MiB へ減った。残る 19.79 MiB は `cacheable=true` の 16 hook が実際に変更した entry（`html` / `headTags`）である。`cacheable=false` の 5 hook の合計は 19,934,202 B から 1,096 B へ減った（メタデータのみ）。

| 区分 | 変更前 | 変更後 |
| --- | ---: | ---: |
| cacheable=true | 61,901,549 B | 20,754,544 B |
| cacheable=false | 19,934,202 B | 1,096 B |
| 変更を保存した hook 数 | 21 | 9 |

Showcase/1000・変更後の hook ごとの保存量（差分 entry 数）:

| hook | cacheable | 差分 entries | 容量 |
| --- | --- | ---: | ---: |
| canvas | true | 0 | 328 B |
| excalibrain | true | 488 | 2,511,170 B |
| l10n | true | 977 | 3,798,859 B |
| properties | true | 0 | 332 B |
| webmention | false | — | 220 B |
| series | true | 0 | 328 B |
| folder-pages | false | — | 222 B |
| breadcrumbs | true | 977 | 4,440,187 B |
| gallery | true | 16 | 709,741 B |
| discord-embed | true | 1036 | 3,774,025 B |
| bases | true | 8 | 599,485 B |
| dataview | true | 8 | 605,920 B |
| flashcards | true | 0 | 332 B |
| kanban | true | 0 | 328 B |
| query | true | 8 | 605,109 B |
| hover-preview | true | 959 | 3,707,738 B |
| ux | true | 0 | 324 B |
| rename | false | — | 216 B |
| quality | false | — | 217 B |
| diagnostics | false | — | 221 B |
| responsive-image | true | 0 | 338 B |
| **合計** | | | **20,755,662 B** |

変更 0 の hook は 324〜338 B（メタデータのみ）になり、差分を持つ hook も変更した entry の分しか保存しない。

### 8.3 CI キャッシュ合計

CI キャッシュ合計 = Content Cache + Build State + Output Cache。

| Preset / 記事数 | 前 | 後 | 削減 |
| --- | ---: | ---: | ---: |
| starter / 100 | 2,624,781 B（2.50 MiB） | 2,034,372 B（1.94 MiB） | −22.5% |
| starter / 1000 | 23,058,695 B（21.99 MiB） | 17,631,777 B（16.81 MiB） | −23.5% |
| showcase / 100 | 29,352,671 B（27.99 MiB） | 12,274,130 B（11.71 MiB） | −58.2% |
| showcase / 1000 | 100,259,753 B（95.61 MiB） | 39,179,635 B（37.36 MiB） | −60.9% |

Content Cache と Output Cache は変更していないため、合計の削減幅は Build State の削減幅より小さくなる（starter では固定費の比率が高いため −22〜24% に留まる）。

### 8.4 決定的カウンタ（前後で同一）

| Preset / 記事数 | contentReused | outputRendered | fastPath | fullRegeneration | Clean Build 一致 |
| --- | ---: | ---: | --- | --- | --- |
| starter / 100 | 105 | 0 | true | false | true |
| starter / 1000 | 1005 | 0 | true | false | true |
| showcase / 100 | 128 | 0 | true | false | true |
| showcase / 1000 | 1028 | 0 | true | false | true |

前後で完全に同一であり、容量削減によって再利用が落ちていないことを示す。

## 9. 性能比較

wall-clock は machine load の影響を受けるため、確定値である容量・カウンタ（8 章）と区別する。いずれも `--runs 3` の中央値。

### 9.1 Cold Build と No-change Build

「後（計測1）」は保存形式のみ変更した実装、「後（計測2）」は hook 前後の entry シリアライズを 1 回に統合した最終実装での計測である。同一マシン上で計測時刻が異なる。

| Preset / 記事数 | 種別 | 前（v16） | 後（計測1） | 後（計測2） |
| --- | --- | ---: | ---: | ---: |
| starter / 100 | Cold | 12,889 ms | 18,329 ms | 14,120 ms |
| starter / 100 | No-change | 12,595 ms | 15,936 ms | 14,220 ms |
| starter / 1000 | Cold | 46,169 ms | 40,320 ms | 41,839 ms |
| starter / 1000 | No-change | 23,663 ms | 17,413 ms | 19,584 ms |
| showcase / 100 | Cold | 19,552 ms | 22,035 ms | 17,302 ms |
| showcase / 100 | No-change | 17,034 ms | 19,776 ms | 14,324 ms |
| showcase / 1000 | Cold | 50,266 ms | 61,410 ms | （計測1のみ） |
| showcase / 1000 | No-change | 26,456 ms | 32,491 ms | （計測1のみ） |

Clean Build は本変更の影響を受けない経路だが、同じく変動している（ノイズの目安）:

| Preset / 記事数 | Clean 前 | Clean 後（計測1） | Clean 後（計測2） |
| --- | ---: | ---: | ---: |
| starter / 100 | 13,216 ms | 17,158 ms | 13,259 ms |
| starter / 1000 | 51,163 ms | 40,789 ms | 42,745 ms |
| showcase / 100 | 20,550 ms | 20,563 ms | 16,219 ms |
| showcase / 1000 | 53,888 ms | 54,333 ms | （計測1のみ） |

### 9.2 キャッシュ保存・復元時間

ローカルディスク上のコピー時間であり、`actions/cache` の転送時間は含まない。

| Preset / 記事数 | save 前 → 後 | restore 前 → 後 |
| --- | ---: | ---: |
| starter / 100 | 398 ms → 431 ms | 379 ms → 424 ms |
| starter / 1000 | 4,139 ms → 3,460 ms | 3,872 ms → 3,178 ms |
| showcase / 100 | 542 ms → 510 ms | 563 ms → 505 ms |
| showcase / 1000 | 3,853 ms → 3,959 ms | 3,663 ms → 4,073 ms |

save / restore は対象バイト数にほぼ比例する。1000 記事では Build State が 8 MB 以上減ったため starter/1000 では短縮したが、showcase/1000 の計測1は Control が効いておらず、wall-clock のノイズが支配している。

### 9.3 hook スナップショット生成のマイクロベンチマーク

決定性のある比較として、hook 1 回あたりのスナップショット生成コストを 1036 entry（Showcase/1000）で計測した（15 ラウンドの中央値）。

| 処理 | ms/call |
| --- | ---: |
| 旧: `JSON.parse(JSON.stringify(manifest.entries))`（全 entry 複製） | 9.389 |
| 新: 変更なし（before と after が同一） | 3.746 |
| 新: 全 entry 変更（最悪ケース） | 7.172 |

entry 単位の差分は、最悪ケースでも旧実装の全 entry 複製より速い。21 hook で 50〜130 ms/build 程度の差であり、数秒規模のビルドに対して無視できる。さらに全 entry スナップショットを 21 個分メモリに保持しないため、ピークメモリも改善する。

### 9.4 考察

- ビルド時間の差は符号が一定せず、`--runs 3` の中央値でも ±10〜20% 変動した。影響を受けない Clean Build が同時に 13.2 s → 17.2 s へ変動していることから、差は machine load によるノイズである。
- 容量・再利用カウンタ・Clean Build 一致は前後で完全に同一であり、性能への有意な悪化は確認されない。9.3 のマイクロベンチマークは「hook cache の処理はむしろ軽くなった」ことを示す。
- 本レポートの wall-clock はすべてローカル環境の値であり、実 GitHub Actions の転送・展開コストは別途計測が必要（12 章）。

### 9.5 Body Edit（部分変更）

`--sizes 1000 --scenarios single-body-edit --runs 3` の中央値。no-change と同じ保存形式で計測している。

| Preset / 記事数 | Cold | Body Edit（増分） | Clean | contentReused | outputRendered | 一致 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| starter / 1000 | 34,270 ms | 40,959 ms | 35,647 ms | 1,004 | 1,942 | ✅ |
| showcase / 1000 | 53,793 ms | 55,015 ms | 99,388 ms | 1,027 | 1,064 | ✅ |

Body Edit 後の Build State は 6,883,137 B（starter/1000）/ 24,931,308 B（showcase/1000）で、no-change の値と一致する。差分として保存される entry は hook の挙動で決まり、編集された記事に依存しないためである。

## 10. 回帰テスト結果

変更後の作業ツリーで以下をすべて実行し、すべて PASS（exit 0）。

| 種別 | コマンド | 結果 |
| --- | --- | --- |
| 型チェック | `node scripts/typecheck_packages.mjs` | 146 projects OK |
| Lint / Format | `npx biome check`（変更 5 ファイル） | No fixes applied |
| Core ユニットテスト | `node --import tsx --test "test/*.test.ts"`（packages/core） | 302 pass / 0 fail |
| Honox 統合テスト（CI Persistent State / SSG Output Cache を含む） | `node --import tsx --test "test/*.test.ts"`（packages/integrations/honox） | 164 pass / 0 fail |
| Scaffold Golden | `pnpm --filter create-riebeckite test:golden` | 10 pass / 0 fail |
| Scaffold 契約 | `pnpm --filter create-riebeckite test` | 90 pass / 0 fail |
| CI シミュレーション | `pnpm test:benchmark:presets` | 10 pass / 0 fail |
| Preset Fast Path E2E | `pnpm test:e2e:preset-fast-path` | Empty / Minimal / Starter / Showcase PASS |
| Scaffold 検証 | `node scripts/check_scaffold.mjs` | PASS |
| Docs | `node scripts/check_docs.mjs` / `check_plugin_docs_parity.mjs` / `sync_theme_docs.mjs --check` | 835 files / 70 plugins / 12 READMEs PASS |

### 10.1 追加したテスト

`packages/core/test/incremental_content_processing.test.ts` に、manifest hook cache の保存・再利用について 7 ケースを追加した。

| # | ケース | 確認内容 |
| --- | --- | --- |
| 1 | cacheable=true の hook のみ | 変更した entry だけを保存し、warm build で再利用される |
| 2 | cacheable=false の hook のみ | スナップショットを保存せず、毎回実行される |
| 3 | cacheable=true / false 混在 | cacheable な hook だけが再利用される |
| 4 | 複数 hook が同一 Manifest を生成 | 各 hook が自分の差分を保存し、重複しない |
| 5 | 前段 hook の変更が後続 hook に影響 | 入力が変わると後続 hook も再実行される |
| 6 | hook が Manifest を変更しない | 空の差分を保存し、再利用される |
| 7 | hook が大量の entry を追加 | 追加後の entry 順序（`order`）を保存・復元する |

容量削減だけで PASS とせず、いずれも warm build の出力が Cold Build の出力と一致すること、および実行・再利用カウンタが期待値どおりであることを確認している。

### 10.2 安全性の回帰

- 破損したスナップショット（`snapshot.entries` が配列でない）では state 全体が棄却され、次のビルドが Cold Build として安全に回復する（既存テスト）。
- 旧バージョン（v16）の state は棄却される（honox `state-schema-mismatch`、`cacheVersion-change`）。
- Content State のみ・PCC のみ・どちらも破損など、キャッシュ欠損の組み合わせテストが honox 側で PASS。

### 10.3 シナリオ網羅

タスク指定のシナリオは、honox の `ci_persistent_state` / `incremental_ssg` と、ローカル CI シミュレーション（`--scenarios` 全種、100 記事）で網羅し、いずれも Clean Build との出力一致を確認している。

| シナリオ | 主なカバレッジ |
| --- | --- |
| Cold Build | ci-runner `cold` / 各テストの初回ビルド |
| No-change | ci-runner `no-change` / honox `no-change` |
| Body Edit | ci-runner `single-body-edit` / honox `body-edit` |
| Link Edit | ci-runner `link-edit` |
| Add / Delete / Rename | ci-runner `add` / `delete` / `rename` / honox 同名 |
| Public → Draft / Draft → Public | ci-runner `publication-change` / `draft-to-public` / honox `visibility-change` |
| Plugin config 変更 | honox `plugin-config-change` / `config-change` |
| Plugin order 変更 | honox `plugin-ordering-change` |
| Hook 追加・削除 | 追加テスト 1〜7、honox `plugin-config-change` |
| キャッシュ欠損 | honox `cache-missing` / `content-state-only` |
| キャッシュ破損 | honox `content-state-corruption` / `output-cache-corruption` / `pcc-corruption` |
| 旧 Build State 復元 | honox `cacheVersion-change` / `state-schema-mismatch` |
| 異なるディレクトリへの復元 | ci-runner の fresh site（別絶対パスへ restore） |

すべての実行で、決定的カウンタ（`contentReused` / `outputRendered` / fast path / full regeneration）が変更前と一致し、Clean Build との出力一致（`equal: true`）を確認した。

## 11. 変更ファイル

| 区分 | ファイル |
| --- | --- |
| 保存形式 | `packages/core/src/content/content_build_state.ts` |
| 状態の検証 | `packages/core/src/content/content_build_state_store.ts` |
| 差分の保存・適用 | `packages/core/src/content/manifest_hook_cache.ts` |
| hook 実行 | `packages/core/src/plugin/plugin_runtime.ts` |
| テスト | `packages/core/test/incremental_content_processing.test.ts` |
| 用語集（EN） | `docs/docs/glossary/build-state.md` |
| 用語集（JA） | `docs/docs/glossary/build-state.ja.md` |
| 本レポート | `benchmarks/reports/ci-build-state-optimization-phase2c.md` |

コアのキャッシュアーキテクチャ（Content Cache、Output Cache、増分判定）は変更していない。新しいキャッシュ層も追加していない。

## 12. 残課題

1. **field 単位の差分（形式改善）。** 対象期間で entry フィールドの変更は `html` と `headTags` のみである。変更した entry 全体ではなく変更したフィールドだけを保存すれば、Showcase/1000 の `manifestHookCache` を約 20.8 MB から約 4.3 MB 程度まで下げられる見込みである（同一マニフェストに対する試算）。ただしマージ・キー削除・検証の面が増えるため、本フェーズでは entry 単位の差分に留めた。将来の形式改善候補とする。
2. **実 GitHub Actions での計測。** `actions/cache` の転送時間、圧縮率、Runner のディスク性能はローカルでは再現できない。本レポートの保存・復元時間はローカルディスクのコピー時間である。
3. **1000 記事の他シナリオ。** no-change のみ計測した。body edit / link edit / 削除 / 公開状態変更を 1000 記事で計測していない。
4. **`manifestEntries`（hook 実行前 entry）の容量。** Showcase/1000 で 2.6 MB あり、`manifestHookCache` の削減後は Build State の中で相対的に大きくなった。entry 単位の差分や Content Cache との共有を検討する余地がある。
5. **wall-clock の変動。** 100 記事はビルド固定費が支配的で、同一条件でも実行時期により 20〜40% 変動した。

## 13. Phase 2D へ進めるか

Phase 2C の完了条件（根本原因の特定、hook ごとの保存データの必要性確認、安全に削減できる重複・不要データの削減、旧キャッシュとの互換性または安全なフォールバック、Clean Build との出力一致、Output Cache 再利用の維持、必須回帰テスト、容量と性能の前後比較、英日ドキュメント同期）は満たした。

Build State の肥大化は解消し、Showcase/1000 の CI キャッシュは 95.61 MiB から 37.36 MiB へ減った。次の課題は Content Cache の GC / 未使用エントリの整理や、`manifestEntries` の共有などが候補になる。実 GitHub Actions の計測を残課題として、Phase 2D へ進められる。
