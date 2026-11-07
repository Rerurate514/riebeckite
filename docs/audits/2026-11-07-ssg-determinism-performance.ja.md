# Full SSG 決定性・性能監査

- 日付: 2026-11-07（計測の一部は 2026-11-08 未明まで継続）
- 対象: Rerurate514/riebeckite
- ブランチ: `perf/ssg-determinism-and-optimization`
- 起点: `e88d403fd8796d39504257ba05c77c250486c181`（当時の main）
- 決定性修正後の HEAD: `6718e9877ea9fcfa30e62b075eff109396f1cbcd`
- 環境: Windows / Node.js v24.22.1 / pnpm v12.15.0 / Vite 8.3.5（Rolldown 1.2.14）

## 結論

| 項目 | 判定 | 内容 |
| --- | --- | --- |
| Phase 1 決定性 | READY | 原因を特定し、最小の順序修正で解消。Starter/Showcase 100 ノートの全 20 シナリオで incremental と clean が実バイト一致 |
| Phase 2 計測 | PARTIAL | 100 ノートは 5 回計測を完了。1,000 / 5,000 ノートは未計測。計測中に環境の再起動と並行プロセスが発生し、一部の数値は競合の影響を受けた |
| Phase 3 最適化 | PARTIAL | 計測に基づく候補（standalone SSR bundle の再利用）を特定したが、新しい派生キャッシュの整合性リスクを許容できるだけの検証時間がなく、実装を見送った |
| 総合 | PARTIAL | 決定性の修正は完了。性能改善は候補評価までで、採用した最適化はない |

## 対象と方法

### ベンチマーク

`benchmarks/preset-ssg` の公式プリセットランナーを使用した。Starter/Showcase を実際の `scaffoldRiebeckiteSite` で生成し、HonoX/Vite の SSG を実行する。

- 各サンプルはサイトを新規作成し、必要なら baseline を 1 回ビルドする
- シナリオを適用して incremental ビルドを実行する
- incremental の `dist` をスナップショットする
- `.riebeckite` と `dist` を削除して clean ビルドを実行する
- clean の `dist` をスナップショットし、パス・サイズ・SHA-256 を比較する
- `--runs 5` で各シナリオを 5 回繰り返し、median / p95 / min / max / stdev を保存する
- `--retainOutputs true` で baseline / incremental / clean の実ファイルを保持できる

スナップショットは `readdir` を名前順にソートし、各ファイルを `{ bytes, sha256 }` として記録する。比較は SHA-256 とサイズの両方で行う。

### 測定上の注意

- `timingsMs.outputWrite` は並行に実行される書き込み時間を加算した値であり、プロセスの wall-clock ではない。wall-clock を超えることがあるため、クリティカルパスとして扱っていない。
- `spansMs` も並行処理の加算を含む。工程別の内訳として使い、合計を wall-clock とみなさない。
- ベンチマークの `buildOnce` はサーバービルドのみを実行し、`mode: "client"` のクライアントビルドを実行しない。実サイトの CLI ビルドよりクライアント資産が少ないという忠実度の限界がある。
- 100 ノートの 5 回計測中に、環境の再起動と別プロセス（`benchmarks/chaos.mjs --size=1000`、テストスイート）が動作した。特に後半の wall-clock と p95 は競合の影響を含む。

## Phase 1: 決定性

### 再現

修正前の main 相当（`e88d403f`）で Starter/100 を実行した。Cold は一致したが、no-change、本文編集、リンク編集、公開状態変更で `dist/index.js` だけが一致しなかった。

| シナリオ | incremental | clean | 差分 |
| --- | --- | --- | --- |
| cold | 24,562 ms | 23,956 ms | なし |
| no-change | 12,732 ms | 21,823 ms | `index.js` のみ |
| single-body-edit | 19,537 ms | 25,629 ms | `index.js` のみ |
| link-edit | 19,983 ms | 24,166 ms | `index.js` のみ |
| publication-change | 19,771 ms | 22,117 ms | `index.js` のみ |

修正前の `index.js` は次の値だった。

- Starter no-change: incremental 860,787 bytes / `54aa6017c36892fc257a44e45d3e5868417f948c548ab9309f099e52b22e62c1`、clean 856,437 bytes / `42035779406ae441eaf905d4a8b7bf0f31ec6660ce25a5cc72ef3ef02f21f32d`
- Showcase publication-change: incremental 867,013 bytes / `ad381a4c923a1744e678a60e3fcd4d24b40d77c00669dbc9651d44fd953624e8`、clean 861,937 bytes / `4482d9466fcab2337692132758fe6c01c2457b86a95e92dd23672d8f3e5d2313`

Starter の no-change では、baseline、incremental、clean の順に `index.js` を保持して確認した。baseline と clean は完全一致し、incremental だけが 4,350 bytes 大きかった。したがって最初の分岐は「出力キャッシュの再利用」ではなく、incremental の Vite サーバーバンドル生成時点にある。

### 原因

`dist/index.js` は `@hono/vite-build` の Node アダプターが生成するサーバーエントリである。このアダプターの virtual entry の `load()` は、`config.publicDir` と `config.build.outDir` を `readdirSync` し、各トップレベルエントリを `mainApp.use('/<name>', serveStatic(...))` としてサーバーエントリに埋め込む。

riebeckite の SSG プラグインは、サーバービルドの出力先を一時的な `.riebeckite/build-output` にしている。修正前の `buildStart` は、クライアントビルド成果物がない場合に前回の公開出力（`dist`）をこの staging にコピーした直後に return していた。`buildStart` はアダプターの virtual entry の `load()` より先に実行されるため、前回の HTML、`folders/*`、`record-*.html` などが static path としてサーバーエントリに混入した。

その結果、Rolldown のモジュール解決とミニファイ後のシンボル順序が変わり、`index.js` のサイズとハッシュが変わった。minify の有無は原因ではない。`minify: false` でも不一致が再現したため、この実験は破棄した。

### 修正

`packages/integrations/honox/src/ssg_plugin.ts` のみを変更した。

1. `configResolved` で、サーバービルドの staging（`.riebeckite/build-output`）をアダプターの `load()` より前に空にする。
2. `buildStart` では前回の `dist` を staging にコピーしない。
3. `generateBundle` でクライアント成果物を復元し、`collectBuildOutputPaths`、SSR モジュールの読み込み、出力変更セットの解決を終えた後に、前回の `dist` を staging にコピーする。これにより、アダプターが見る時点では staging は空で、その後の SSG 出力処理では従来どおり前回出力を再利用できる。

前回出力のコピーを `collectBuildOutputPaths` と SSR モジュール読み込みの後ろに移したことで、前回出力がクライアント資産として出力計画に混入せず、SSR 読み込みが失敗した場合にも staging へ前回出力が残らないことを確認した（`ownerConflictCount` は 0）。

過去に試した「`enforce: "pre"` にして `configResolved` で `build.outDir` 自体を staging に書き換える」案は、Vite のサーバー成果物が `dist` から消え、`missingInDistCount` が 3 になったため採用しなかった。

### 修正後の結果

Phase 1 の全マトリクス（Starter/Showcase、100 ノート、10 シナリオ、各 1 回）は `benchmarks/results/ssg-phase1-final/2026-11-07T08-11-06-506Z-preset-ssg.json` に保存した。全 20 行で `equivalent: true`、`missingInDistCount: 0` だった。

| Preset | シナリオ | incremental (ms) | clean (ms) | planned / actual |
| --- | --- | ---: | ---: | --- |
| Starter | cold | 19,544 | 19,479 | 263 / 263 |
| Starter | no-change | 11,033 | 20,078 | 263 / 263 |
| Starter | full | 16,484 | 19,113 | 263 / 263 |
| Starter | single-body-edit | 16,729 | 19,313 | 263 / 263 |
| Starter | link-edit | 16,586 | 18,933 | 263 / 263 |
| Starter | add | 16,798 | 22,700 | 270 / 270 |
| Starter | delete | 19,025 | 22,332 | 263 / 261 |
| Starter | rename | 16,186 | 19,953 | 263 / 263 |
| Starter | publication-change | 17,448 | 19,798 | 263 / 261 |
| Starter | draft-to-public | 17,807 | 19,789 | 265 / 265 |
| Showcase | cold | 41,963 | 40,821 | 415 / 415 |
| Showcase | no-change | 34,950 | 41,100 | 415 / 415 |
| Showcase | full | 40,121 | 41,516 | 415 / 415 |
| Showcase | single-body-edit | 39,294 | 40,845 | 415 / 415 |
| Showcase | link-edit | 38,909 | 41,099 | 415 / 415 |
| Showcase | add | 38,800 | 40,630 | 422 / 422 |
| Showcase | delete | 39,524 | 40,475 | 415 / 413 |
| Showcase | rename | 40,225 | 39,936 | 415 / 415 |
| Showcase | publication-change | 41,345 | 38,802 | 415 / 413 |
| Showcase | draft-to-public | 38,776 | 39,847 | 417 / 417 |

`actual < planned` は削除予定の出力を含む行であり、`missingInDistCount` は 0 である。クリーン出力との差分は全行で空だった。

## Phase 2: 性能計測

### 100 ノート・5 回

実行コマンド（`RIEBECKITE_BENCHMARK_SKIP_BUILD=1`、事前に `pnpm build:packages` 済み）:

```text
pnpm benchmark:presets -- --presets starter,showcase --sizes 100 \
  --scenarios cold,no-change,full,single-body-edit,link-edit,publication-change \
  --runs 5 --out benchmarks/results/ssg-phase2-final-100
```

結果: `benchmarks/results/ssg-phase2-final-100/2026-11-07T14-18-15-985Z-preset-ssg.json`

#### レイテンシとメモリ

| Preset | シナリオ | n | wall median (ms) | p95 (ms) | σ (ms) | clean median (ms) | CPU median (ms) | peak RSS (MB) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Starter | cold | 5 | 25,233 | 34,664 | 4,019 | 25,786 | 44,563 | 1,107 |
| Starter | no-change | 5 | 12,914 | 14,085 | 886 | 24,497 | 28,719 | 961 |
| Starter | full | 5 | 21,310 | 42,574 | 9,132 | 25,630 | 38,579 | 1,006 |
| Starter | single-body-edit | 5 | 21,434 | 23,222 | 983 | 24,004 | 39,438 | 1,015 |
| Starter | link-edit | 5 | 20,461 | 22,191 | 1,521 | 22,708 | 37,656 | 1,025 |
| Starter | publication-change | 5 | 18,162 | 18,806 | 559 | 21,483 | 34,515 | 995 |
| Showcase | cold | 5 | 44,116 | 56,448 | 5,594 | 45,242 | 101,968 | 1,716 |
| Showcase | no-change | 5 | 41,047 | 45,488 | 2,160 | 49,382 | 97,328 | 1,727 |
| Showcase | full | 5 | 48,955 | 53,085 | 3,922 | 43,916 | 107,718 | 1,725 |
| Showcase | single-body-edit | 5 | 40,612 | 45,073 | 2,363 | 42,164 | 93,781 | 1,746 |
| Showcase | link-edit | 5 | 45,787 | 49,726 | 2,311 | 46,263 | 100,797 | 1,718 |
| Showcase | publication-change | 5 | 44,137 | 56,780 | 5,907 | 50,150 | 100,156 | 1,708 |

#### キャッシュと工程別内訳

値は 5 回の median。`outputWrite` は並行加算のため wall-clock と比較しない。

| Preset | シナリオ | cache hit / miss | content processed / reused | output rendered / reused | SSR module load (ms) | output dependency resolution (ms) | toSSG (ms) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Starter | cold | 0 / 256 | 105 / 0 | 212 / 0 | 3,453 | 6,488 | 6,982 |
| Starter | no-change | 260 / 0 | 0 / 105 | 0 / 256 | 3,287 | 290 | 503 |
| Starter | full | 0 / 256 | 0 / 105 | 212 / 0 | 3,510 | 447 | 6,541 |
| Starter | single-body-edit | 260 / 0 | 1 / 104 | 212 / 10 | 3,533 | 1,055 | 6,370 |
| Starter | link-edit | 260 / 0 | 1 / 104 | 212 / 10 | 3,357 | 940 | 5,705 |
| Starter | publication-change | 260 / 0 | 99 / 6 | 210 / 10 | 2,947 | 1,398 | 5,104 |
| Showcase | cold | 0 / 404 | 137 / 0 | 299 / 0 | 5,501 | 25,352 | 3,932 |
| Showcase | no-change | 412 / 0 | 8 / 129 | 0 / 404 | 5,770 | 581 | 23,678 |
| Showcase | full | 0 / 404 | 8 / 129 | 299 / 0 | 5,866 | 629 | 27,340 |
| Showcase | single-body-edit | 412 / 0 | 9 / 128 | 205 / 182 | 5,180 | 21,319 | 2,809 |
| Showcase | link-edit | 412 / 0 | 9 / 128 | 206 / 172 | 5,776 | 23,604 | 3,505 |
| Showcase | publication-change | 412 / 0 | 108 / 29 | 296 / 62 | 5,509 | 22,636 | 3,677 |

### ボトルネック

- **Starter/100 の no-change**: wall median 12.9 秒のうち SSR module load が約 3.3 秒、output cache の検証と出力再利用が残り。SSR バンドルの再生成は、変更がないビルドでも毎回発生している。
- **Showcase/100**: wall median は 41〜49 秒。SSR module load が約 5〜6 秒、`toSSG` が約 24〜28 秒（no-change / full）。出力数が 404 と多く、Hono のルート列挙と HTML 生成のコストが支配的。
- **cold / full**: `outputDependencyResolution` が Starter で 6.5 秒、Showcase で 25 秒。フル再生成時の依存解決が大きな固定費になっている。
- **メモリ**: Starter/100 は約 1.0 GB、Showcase/100 は約 1.7 GB。5,000 ノートへの単純な線形外挿は危険で、Showcase は特にメモリ制約が強い。
- **outputWrite**: 値が wall-clock を超える（例: 547,736 ms）ため、並行書き込みの加算値と解釈する。現時点では wall-clock のボトルネックとは断定できない。

### 1,000 / 5,000 ノート

1,000 ノートと 5,000 ノートは今回のセッションでは完了できなかった。理由は、100 ノートの 5 回計測だけで約 1 時間を要し、途中で環境の再起動と並行プロセスが発生したためである。5,000 ノートは Showcase/100 の peak RSS が約 1.7 GB であることから、同じ 5 回計測はメモリと時間の両面で非現実的と判断した。未計測を「問題なし」と扱わない。

## Phase 3: 最適化の評価

### 候補: standalone SSR bundle の再利用

計測上、Starter/100 の no-change では `ssrModuleLoad` が約 3.3 秒、Showcase/100 では約 5〜6 秒かかっている。`ssg/server/standalone.ts` は毎回 Vite の nested build を実行して `ssg-server.mjs` を生成してから import している。アプリの `bundleFingerprint` が変わっていなければ、このバンドルを再利用できる可能性がある。

期待効果は no-change で wall の約 10〜25%。ただし、次の理由から今回は実装しなかった。

- `bundleFingerprint` はアプリ、設定ファイル、ローカル workspace、`NODE_ENV` / `VITE_*` を対象にするが、プログラムから渡す Vite 設定の `define`、`oxc`、プラグインオプションを完全には表現しない。
- 再利用用の新しい派生キャッシュを導入すると、`RIEBECKITE_SSG_FULL_REGENERATION`、クライアントマニフェスト、公開境界、障害時の再生成の意味論を追加で検証する必要がある。
- 失敗時に古いバンドルを import すると、誤った HTML を公開する危険がある。atomic な marker と破損時の再生成を含む設計が必要で、今回の検証時間では安全性を十分に示せない。

### 採用しなかった案

- **minify の無効化**: `minify: false` でも `index.js` の不一致が再現した。原因ではない。
- **`configResolved` で `build.outDir` を staging に書き換える案**: サーバー成果物 3 ファイルが `dist` から消えた。
- **output write の並列度制御**: `outputWriteTimeMs` は並行加算で wall-clock を超えるため、改善量を wall-clock で示せない。現時点では採用根拠がない。

## 検証

実行して PASS したもの:

- `pnpm typecheck`（3 projects）
- `pnpm build:packages`（116 packages）
- `pnpm exec biome check`（変更した TypeScript / benchmark ファイル）
- `node --import tsx --test --test-name-pattern "snapshot comparison" benchmarks/preset-ssg/runner.test.mjs`（1 pass）
- `node --import tsx --test --test-reporter=spec --test-name-pattern "runner executes the clean output comparison" benchmarks/preset-ssg/runner.test.mjs`（1 pass、158.8 秒）
- Phase 1 全 20 シナリオ（Starter/Showcase、100 ノート）で `equivalent: true`、`missingInDistCount: 0`
- `incremental_ssg.test.ts` 8 pass、`ssg_plugin.test.ts` と `standalone.test.ts` 26 pass
- マージ後の Starter/100 no-change 1 回で `equivalent: true`、`missingInDistCount: 0`

未実行または未完了:

- リポジトリ全体の `pnpm test`（長時間のため未実行）
- 1,000 / 5,000 ノートの計測
- 追加の最適化の実装と A/B 計測

## リスク

- 今回の修正は `@hono/vite-build` の virtual entry が `config.build.outDir` を走査するという依存先の実装に依存している。依存先の挙動が変わった場合は再発する可能性がある。
- `generateBundle` での前回出力コピーは、クライアント成果物の復元、`collectBuildOutputPaths`、SSR モジュール読み込み、出力変更セットの解決の後に実行する順序が重要である。順序を戻すと出力計画への混入や、失敗時の staging 残留が再発する。
- ベンチマークはクライアントビルドを含まないため、実サイトの wall-clock を過小評価する可能性がある。
- 100 ノートの計測は並行プロセスの影響を受けた。数値は同一環境内の比較に留め、絶対値として一般化しない。
- Showcase のメモリ使用量から、5,000 ノートの 5 回計測は非現実的である。

## 今後

1. 1,000 ノートを 1 回以上計測し、100 ノートとのスケーリングを確認する。
2. 5,000 ノートはメモリ制約を先に評価し、必要ならストリーミング/分割生成を設計する。
3. standalone SSR bundle の再利用を、marker、破損時の再生成、full regeneration の意味論を含めて実装し、A/B で wall-clock を検証する。
4. クライアントビルドを含む実 CLI 相当のベンチマークを追加し、忠実度を上げる。
5. `outputWrite` の加算値を並行度と critical path に分解する計測を追加する。

## 成果物

- 決定性修正: `567a8983`、追加修正: `6718e987`
- ベンチマーク改善: `a83a296e`
- Phase 1 最終結果: `benchmarks/results/ssg-phase1-final/2026-11-07T08-11-06-506Z-preset-ssg.json`
- Phase 2 100 ノート: `benchmarks/results/ssg-phase2-final-100/2026-11-07T14-18-15-985Z-preset-ssg.json`
- 修正前の再現: `benchmarks/results/ssg-phase1/`
- 決定性修正の回帰テスト: `benchmarks/preset-ssg/runner.test.mjs`

## 最終判定

**PARTIAL**

Phase 1 の決定性修正は完了し、100 ノートの全シナリオで実バイト一致を確認した。Phase 2 は 100 ノートの 5 回計測まで完了したが、1,000 / 5,000 ノートが未計測である。Phase 3 は候補評価までで、採用した最適化はない。したがって、決定性については READY、性能改善については PARTIAL と判定する。
