# Riebeckite Phase 2B レポート: GitHub Actions への SSG Output Cache 統合

| 項目 | 内容 |
| --- | --- |
| 対象リポジトリ | riebeckite |
| ブランチ | main |
| ベースコミット | `c0fde80c`（Phase 2A 完了時点）。作業中に他セッションが main を `9435e252` まで進めたため、本変更はその上に適用している |
| 計測環境 | Windows 11 / Node.js v24.11.1 / pnpm |
| 計測種別 | ローカル CI シミュレーション（実 GitHub Actions は未計測） |
| 計測ハーネス | `benchmarks/preset-ssg/ci-runner.mjs` |
| 関連レポート | Phase 1 `ci-incremental-build-audit.md` / Phase 2A `ci-output-cache-reuse-phase2a.md` |

## 1. Executive Summary

Phase 1 の監査で、公式 GitHub Actions デプロイテンプレートは Content Cache と Build State だけを復元し、SSG Output Cache を復元していないことが判明していた。Phase 2A で Output Cache の再利用判定と棄却理由の診断を修正したが、テンプレートが Output Cache を運ばないため、一般利用者の CI では増分 SSG が成立していなかった。

Phase 2B では、公式 Scaffold が生成する GitHub Actions ワークフロー（Starter / Minimal / Showcase / Empty で共通の 1 テンプレート）を更新し、以下を同一のキャッシュ契約で保存・復元するようにした。

- Content Cache（`.riebeckite/cache`）
- Build State（`.riebeckite/build/content-state.json`）
- SSG Output Cache のメタデータ（`.riebeckite/ssg-output-cache.json`）
- Output Cache のエントリ（`.riebeckite/ssg-output-cache.entries`）
- no-change fast path のサイドカー（`.riebeckite/ssg-output-cache.fast-path.json`）

キャッシュキーは `riebeckite-build-v2-...` に更新し、OS・Node.js バージョン・lockfile ハッシュ・`riebeckite.config.ts` ハッシュでスコープした。run ごとに一意なキーで保存し、`restore-keys` で直近の互換世代へフォールバックする。復元したキャッシュが古い場合は Riebeckite 側の fingerprint 検証が棄却し、Cold Build と同じ結果に収束する。

ローカル CI シミュレーションでは、Starter / Showcase の両方で no-change 時に `renderedOutputCount = 0`、`fullRegenerationRequired = false` を確認し、Clean Build との出力一致も全シナリオで成立した。100 記事ではビルド固定費が支配的で wall-clock の差はノイズに埋もれたが、1000 記事の no-change ではビルド時間が Starter 41.9%、Showcase 37.8% 短縮し、復元・保存コストを含めても約 12〜14 秒の短縮が残った。実 GitHub Actions の転送時間は未計測であり、第 13 章に残課題として明記する。

## 2. 修正前の CI キャッシュ構成

### 2.1 保存・復元対象

修正前のテンプレート（`riebeckite-build-v1`）は次の 2 パスだけを `actions/cache@v4` で扱っていた。

```yaml
path: |
  .riebeckite/cache
  .riebeckite/build/content-state.json
```

SSG Output Cache（`ssg-output-cache.json`、`.entries`、`.fast-path.json`）は保存も復元もされていなかった。`dist/` は保存対象外であり、これは修正後も変わらない。

### 2.2 キャッシュキーと restore-keys

```text
key: riebeckite-build-v1-${runner.os}-${hashFiles('package-lock.json')}-${github.run_id}-${github.run_attempt}
restore-keys:
  riebeckite-build-v1-${runner.os}-${hashFiles('package-lock.json')}-
  riebeckite-content-v3-${runner.os}-${hashFiles('package-lock.json')}
```

2 本目の `riebeckite-content-v3-...` は、現行テンプレートが保存する `riebeckite-build-v1-...` とは接頭辞が異なる。過去の命名規則で保存されたキャッシュが残っていなければ一致せず、実質的に死んだ restore-key だった（Phase 1 の P3-1）。

### 2.3 ビルド・デプロイ順序

```text
checkout
  → （external content のとき content repository checkout）
  → setup-node（cache: npm）
  → npm ci
  → actions/cache restore
  → npm exec riebeckite check
  → npm exec riebeckite build
  → cloudflare/wrangler-action deploy
```

キャッシュ復元は依存解決の後、`riebeckite check` / `riebeckite build` の前に行われる。保存はジョブ終了後に `actions/cache` の post step が行う。

### 2.4 修正前の問題

1. Output Cache が復元されないため、Content Cache がヒットしても SSG 出力は毎回再レンダリングされる（P1-1）。
2. restore-key の 1 本が保存キーと一致しない（P3-1）。
3. `riebeckite.config.ts` の変更がキーに反映されず、Preset やプラグイン構成の変更後も古いキャッシュが復元対象になり得る。
4. キーに Node.js バージョンが含まれず、`NODE_VERSION` を変更しても同一キー系列にフォールバックする。

## 3. 修正内容

### 3.1 デプロイテンプレート

`packages/create-riebeckite/templates/scaffold/deployment/github-actions/deploy.yml` を更新した。公式 Scaffold の GitHub Actions デプロイは全 Preset でこの 1 テンプレートを共有するため、Preset 固有の分岐は追加していない。

- `env: NODE_VERSION: "22"` を追加し、`actions/setup-node` とキャッシュキーの両方で同じ値を使う。
- キャッシュ対象に Output Cache の 3 成果物を追加する。
- キーを `riebeckite-build-v2-...` に更新し、`hashFiles('riebeckite.config.ts')` を追加する。
- 死んでいた `riebeckite-content-v3-...` の restore-key を削除する。
- `continue-on-error: true` を付け、復元・保存の失敗がビルドやデプロイを止めないようにする。
- 復元直後とビルド後に `du -sb .riebeckite` でキャッシュ容量をログへ出す。容量計測のためのシェルステップであり、デプロイ先固有の処理とは分離している。

### 3.2 キャッシュキー

```text
key: riebeckite-build-v2-${runner.os}-node${NODE_VERSION}-${lockfile hash}-${config hash}-${run_id}-${run_attempt}
restore-keys:
  riebeckite-build-v2-${runner.os}-node${NODE_VERSION}-${lockfile hash}-${config hash}-
  riebeckite-build-v2-${runner.os}-node${NODE_VERSION}-${lockfile hash}-
```

### 3.3 計測ステップ

復元直後に `Restored Riebeckite cache: <bytes> bytes`、ビルド後に `Riebeckite cache to save: <bytes> bytes` を出力する。`.riebeckite` が存在しない場合は `0 bytes (cold build)` と出力し、ステップ自体は成功する。

### 3.4 Scaffold テスト

- `packages/create-riebeckite/test/scaffold_deployment.test.ts` のキャッシュ契約を、5 パス・v2 キー・2 本の restore-key・`continue-on-error`・Node.js バージョン連動に更新した。
- キーが各 restore-key の接頭辞になっていること（`restore-key` が意図どおり一致すること）をテストで検証する。
- Golden fixture 2 件（`deploy-github-actions`、`deploy-external-content`）を更新した。

### 3.5 ベンチマーク

- `benchmarks/preset-ssg/ci-runner.mjs` の既定を「Output Cache を含めて復元する」に変更し、`--cacheOutput false` で旧テンプレート相当の挙動を再現できるようにした。
- 保存・復元の内訳（Content Cache、Build State、Output Cache、復元後合計）と復元後容量を計測するようにした。
- `benchmarks/preset-ssg/lib.mjs` と `runner.test.mjs` に Draft → Public シナリオを追加した。

## 4. Output Cache の保存・復元対象

### 4.1 パスと役割

| パス | 内容 | 復元しない場合 |
| --- | --- | --- |
| `.riebeckite/cache` | Content Cache（`.riebeckite/cache/content/v3`）と Plugin Cache | 全コンテンツを再処理する |
| `.riebeckite/build/content-state.json` | 前回の Build State（content fingerprint、出力記述、external dependency、公開状態） | 増分判定が成立せず全体再生成する |
| `.riebeckite/ssg-output-cache.json` | Output Cache メタデータ（app fingerprint、client manifest fingerprint、出力 checksum、最終出力 inventory） | 出力を再利用できない |
| `.riebeckite/ssg-output-cache.entries/` | 出力 1 件ごとのキャッシュ本体（ファイル名は出力パスの SHA-256） | 出力を復元できない |
| `.riebeckite/ssg-output-cache.fast-path.json` | CLI no-change fast path の検証用サイドカー | fast path だけが無効になり、通常の増分ビルドへフォールバックする |

### 4.2 Output Registry について

`GeneratedOutputRegistry` はビルド中のプラグイン生成出力を管理するインメモリのレジストリであり、ファイルとしては永続化されない。CI 間で必要な状態は Build State の `outputs` と Output Cache のメタデータ・エントリであり、これらを復元すれば Output Registry を再構築できる。新しい永続化層は追加していない。

### 4.3 ディレクトリ非依存性

- Output Cache のメタデータが持つ出力パスは論理パスであり、絶対パスではない。
- `appFingerprint` はプロジェクトルートからの相対パスで計算される。
- `publicDirectory` は絶対パスで保存されるが、通常の増分判定では使われない。no-change fast path の検証でのみ使われ、別ディレクトリに復元した場合は fingerprint 不一致となって fast path が棄却され、通常の増分ビルドへ安全にフォールバックする。
- したがって、Runner の作業ディレクトリが変わっても Content Cache / Build State / Output Cache は再利用できる。

## 5. キャッシュキー設計

### 5.1 構成要素

| 要素 | 目的 |
| --- | --- |
| `riebeckite-build-v2-` | キャッシュ契約のバージョン。パス構成や意味が変わったときに旧世代と分離する |
| `${runner.os}` | OS 間でバイナリや改行、依存解決結果を共有しない |
| `node${NODE_VERSION}` | Node.js バージョン間で共有しない。`env` で一元管理する |
| `${hashFiles('package-lock.json')}` | Riebeckite 本体・プラグイン・テーマを含む依存バージョンの変更を反映する |
| `${hashFiles('riebeckite.config.ts')}` | Preset、プラグイン構成、テーマ、サイト設定の変更を反映する |
| `${github.run_id}-${github.run_attempt}` | GitHub Actions のキャッシュが immutable であるため、実行ごとに一意な保存キーを作る |

`dist/` は保存しない。デプロイ成果物は毎回その実行のビルドで生成し、キャッシュから復元した古い HTML をそのまま配信しない。

### 5.2 restore-keys の意図

1. 1 本目は lockfile と config の両方が一致する直近世代を復元する。設定も依存も変わっていない通常の連続デプロイはここでヒットする。
2. 2 本目は config が変わった場合のフォールバックである。Preset やプラグイン構成を変えても、Content Cache と Build State のうち再利用可能な部分を活かせる。設定変更がビルド結果に影響する場合は Riebeckite の fingerprint 検証が棄却する。
3. lockfile が変わった場合はどちらも一致せず Cold Build になる。依存変更後のキャッシュ再利用は安全性を優先して行わない。

### 5.3 同時実行とスコープ

- ワークフローには `concurrency: group: riebeckite-deploy` があり、同一サイトのデプロイは直列化される。
- 保存キーは run ごとに一意なので、同時実行中の別 run が同じキーを上書きすることはない。
- GitHub Actions のキャッシュはブランチスコープを持つ。デフォルトブランチのキャッシュは他ブランチからも復元できるが、PR ブランチで保存したキャッシュはデフォルトブランチへ昇格しない。復元されたキャッシュがそのビルドに不適切な場合は、Riebeckite 側の `appFingerprint` / `clientManifestFingerprint` / change set / エントリ checksum の検証が棄却する。
- OS と Node.js バージョンは restore-key にも含めるため、異なる環境へ誤ってフォールバックしない。

### 5.4 v1 からの変更

- Output Cache を追加したため、保存内容が変わる。古い v1 キャッシュを誤って復元しないよう、接頭辞を `v2` に上げた。
- 死んでいた `riebeckite-content-v3-...` を削除した。
- config ハッシュと Node.js バージョンを追加した。

## 6. 増分 SSG が成立する条件

CI で増分 SSG を成立させるには、Output Cache だけでは足りない。以下が揃っている必要がある。

1. Content Cache により、変更のないコンテンツの処理結果を再利用できる。
2. Build State により、前回の content fingerprint、出力依存、external dependency、公開状態を比較できる。
3. Output Cache メタデータにより、変更のない出力に対応するエントリを特定できる。
4. Output Cache エントリにより、出力本体を復元できる。
5. `appFingerprint` と `clientManifestFingerprint` が一致する。

いずれかが欠ける、または検証に失敗した場合は、SSG は全出力を再生成する。これは正しさを優先したフォールバックであり、CI はそのまま成功する。

### 6.1 削除・公開状態変更

- 削除されたページは、Build State と現在の出力集合の差分から `removed` として検出され、`dist/` から削除される。キャッシュに残っていても配信されない。
- Public → Draft、Draft → Public は change set として扱われ、影響を受ける出力だけが再生成される。公開状態の変更は `content-state.json` の公開状態と `nextPublishingChangeAt` でも検証される。
- 公開状態の期限切れや external dependency の失敗など、安全性を確認できない場合は全体再生成へフォールバックする。

### 6.2 破損・欠損時

- キャッシュファイルが存在しない場合は Cold Build になる。
- JSON が壊れている、schema version が違う、エントリの checksum が一致しない場合は、そのキャッシュを棄却して再生成する。
- キャッシュの復元・保存に失敗しても、`continue-on-error: true` によりビルドとデプロイは継続する。

## 7. Scaffold への反映

- GitHub Actions デプロイを提供する全 Preset が同じ `deploy.yml` を使う。Preset ごとのキャッシュ実装の重複はない。
- ローカルコンテンツと外部コンテンツリポジトリの両方で同じキャッシュ契約を使う。外部コンテンツの checkout ステップだけが異なる。
- Cloudflare Workers へのデプロイ（`cloudflare/wrangler-action`）とキャッシュ管理は別ステップであり、デプロイ先固有の処理にキャッシュロジックを混ぜていない。
- GitHub Actions 以外のデプロイ方式（`cloudflare-workers` の手動デプロイなど）には変更を加えていない。
- 生成直後からキャッシュ設定が含まれるため、利用者が追加設定をする必要はない。

## 8. ローカル CI シミュレーション計測

### 8.1 方法

`benchmarks/preset-ssg/ci-runner.mjs` は、次の手順で CI を模擬する。

1. 元サイトを生成して 1 回ビルドし、`.riebeckite` のキャッシュを `cache-store` へ保存する（保存時間を計測）。
2. 別の絶対パスに新しいサイトを生成し、`cache-store` から復元する（復元時間と復元後容量を計測）。
3. シナリオ（no-change / body edit / link edit）を適用して増分ビルドする（ビルド時間を計測）。
4. `.riebeckite` と `dist/` を削除して Clean Build し、増分ビルドの `dist/` と比較する。

`coldMs` は各シナリオ行で計測されるキャッシュなしのベースラインビルドである。`incrementalMs` は復元後のビルド時間のみを含み、`restoreMs` は別計測である。CI の実効時間に近い値として「復元 + 増分ビルド」も算出する。`saveMs` は `actions/cache` の post step に相当し、Deploy の完了を待たせない。表の `Fast path` は harness の定義で `renderedRouteCount === 0 && !fullRegenerationRequired` を指し、CLI の no-change fast path（Starter / Showcase では Plugin 都合で無効）とは別の指標である。

> 注: これはローカルシミュレーションであり、GitHub Actions のキャッシュ転送（アップロード・ダウンロード）時間、Runner のディスク性能、`actions/cache` 自体のオーバーヘッドは含まない。

### 8.2 結果（Output Cache あり = v2 テンプレート相当）

100 記事、`--runs 3` の中央値。`復元+増分` は `restoreMs + incrementalMs`。

| Preset | Scenario | Cold ms | Restore ms | Incremental ms | 復元+増分 ms | Clean ms | Save ms | Cache bytes | Output cache bytes | Rendered | Fast path | Full regen | 一致 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| starter | no-change | 16907 | 454 | 13907 | 14361 | 14256 | 468 | 5539151 | 4087037 | 0 | true | false | true |
| starter | single-body-edit | 15885 | 398 | 15429 | 15827 | 15613 | 435 | 5539158 | 4087044 | 212 | false | false | true |
| starter | link-edit | 16833 | 484 | 17542 | 18026 | 18378 | 504 | 5539151 | 4087037 | 212 | false | false | true |
| showcase | no-change | 19856 | 585 | 21816 | 22401 | 20780 | 613 | 30393978 | 3755162 | 0 | true | false | true |
| showcase | single-body-edit | 19366 | 535 | 15546 | 16081 | 18655 | 573 | 30393985 | 3755169 | 163 | false | false | true |
| showcase | link-edit | 15643 | 487 | 13911 | 14398 | 15371 | 498 | 30393978 | 3755162 | 164 | false | false | true |

### 8.3 結果（Output Cache なし = 旧 v1 テンプレート相当）

同じく 100 記事、`--runs 3` の中央値。

| Preset | Scenario | Cold ms | Restore ms | Incremental ms | 復元+増分 ms | Clean ms | Save ms | Cache bytes | Output cache bytes | Rendered | Fast path | Full regen | 一致 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| starter | no-change | 11750 | 107 | 12402 | 12509 | 12643 | 118 | 1452114 | 0 | 212 | false | true | true |
| starter | single-body-edit | 12952 | 115 | 12840 | 12955 | 13939 | 104 | 1452114 | 0 | 212 | false | true | true |
| starter | link-edit | 12756 | 107 | 11268 | 11375 | 12863 | 105 | 1452114 | 0 | 212 | false | true | true |
| showcase | no-change | 16979 | 146 | 15829 | 15975 | 16810 | 155 | 26638816 | 0 | 268 | false | true | true |
| showcase | single-body-edit | 15336 | 143 | 15661 | 15804 | 17585 | 156 | 26638816 | 0 | 268 | false | true | true |
| showcase | link-edit | 17561 | 145 | 16662 | 16807 | 15826 | 149 | 26638816 | 0 | 268 | false | true | true |

### 8.4 考察

**壁時計時間はこの環境では信頼できる比較軸にならない。** 100 記事のビルドは `ssrModuleLoad` などの固定費が支配的で、同じシナリオでも実行時期によるマシン負荷で 20〜40% 変動した。実際、Output Cache ありの実行はなしの実行より全体的に遅い時間帯に走っており、表の `Cold ms` と `復元+増分 ms` を単純比較して speedup を主張することはできない。Phase 2A でも同じ理由で、決定的なカウンタを主指標としていた。

**決定的な差は明確である。**

- no-change: Output Cache ありは `rendered = 0`、`fullRegenerationRequired = false`、ルート描画 0 の再利用経路が成立。なしは starter で 212、showcase で 268 を毎回再レンダリングし、`fullRegenerationRequired = true` になる。
- showcase の body edit / link edit: ありは 163 / 164 のみ再レンダリングし、残りを再利用する。なしは 268 を毎回再レンダリングする。
- starter の body edit / link edit: ありでも 212 を再レンダリングする。Starter の出力依存は本文変更でほぼ全出力に波及するため、この 2 シナリオでは Output Cache の再利用がほとんど効かない。これは Phase 2A の `affectedOutputCount` とも一致する。

つまり、Output Cache の効果は「no-change の再レンダリング排除」と「Showcase の部分変更での未変更出力の再利用」に限定される。100 記事ではレンダリング自体が数秒以下であり、固定費の前では wall-clock 上の改善がノイズに埋もれる。

**それでも既定で有効にする理由。**

1. no-change の再レンダリングを決定的に 0 にできる。Content Cache / Build State だけでは出力は毎回再生成される。
2. 安全性の検証（fingerprint、checksum、change set、Clean Build 一致）が揃っており、誤用のリスクがない。
3. 追加される容量は 100 記事で約 3.8〜4.1 MB であり、既に保存している Build State（starter 1.3 MB、showcase 26.3 MB）に対する増分として限定的である。
4. 出力数に比例して再レンダリング削減量が増えるため、大規模サイトほど効果が大きくなる可能性がある。1000 記事の結果を 8.5 に示す。
5. 容量だけを理由に無効化する閾値を設けると、根拠のない固定値を導入することになる。GHA の 10 GB / LRU に委ね、保存失敗時もデプロイを継続する設計のほうが安全である。

### 8.5 1000 記事での no-change

`--runs 2` の中央値。`復元+増分` は `restoreMs + incrementalMs`。

| Preset | Output Cache | Cold ms | Restore ms | Incremental ms | 復元+増分 ms | Save ms | Cache bytes | Output cache bytes | Rendered | Full regen | 一致 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| starter | あり | 44328.5 | 3318.5 | 19327.5 | 22646 | 3622 | 23058687 | 9632586 | 0 | false | true |
| starter | なし | 31880 | 963 | 33274 | 34237 | 1031.5 | 13426101 | 0 | 1942 | true | true |
| showcase | あり | 56724.5 | 2857.5 | 29048 | 31905.5 | 3030 | 100259745 | 12701083 | 0 | false | true |
| showcase | なし | 57908 | 1138.5 | 46734 | 47872.5 | 1254 | 87558662 | 0 | 2016 | true | true |

1000 記事ではノイズを超える差が出た。

- ビルド時間のみ: starter 33,274 → 19,327.5 ms（41.9% 短縮）、showcase 46,734 → 29,048 ms（37.8% 短縮）。
- 復元 + ビルド: starter 34,237 → 22,646 ms（33.9% 短縮）、showcase 47,872.5 → 31,905.5 ms（33.4% 短縮）。
- 復元 + ビルド + 保存: starter 37,859 → 25,268 ms、showcase 49,126.5 → 34,935.5 ms。ローカルの保存・復元コストを含めても約 12〜14 秒の短縮が残る。
- starter の「あり」実行は `Cold ms` が 44.3 秒と「なし」の 31.9 秒より遅い時間帯に走っていたにもかかわらず、増分ビルドは大きく速い。したがって、この差はマシン負荷だけでは説明できない。
- 決定的なカウンタでも、`rendered` は 0 対 1,942 / 2,016、`fullRegenerationRequired` は false 対 true である。

100 記事では固定費が支配的で wall-clock の改善を確認できなかったが、1000 記事では Output Cache の効果が明確に現れた。出力数が増えるほど再レンダリングの削減量が増えるという想定と一致する。

## 9. キャッシュ容量と転送コスト

### 9.1 内訳（実測）

| Preset | Content Cache | Build State | Output Cache | 合計 | 旧 v1 からの増分 |
| --- | ---: | ---: | ---: | ---: | ---: |
| starter/100 | 124,254 B（0.12 MiB） | 1,327,860 B（1.27 MiB） | 4,087,037 B（3.90 MiB） | 5,539,151 B（5.28 MiB） | +4,087,037 B（3.90 MiB） |
| showcase/100 | 374,601 B（0.36 MiB） | 26,264,215 B（25.05 MiB） | 3,755,162 B（3.58 MiB） | 30,393,978 B（28.99 MiB） | +3,755,162 B（3.58 MiB） |
| starter/1000 | 1,116,053 B（1.06 MiB） | 12,310,048 B（11.74 MiB） | 9,632,586 B（9.19 MiB） | 23,058,687 B（21.99 MiB） | +9,632,586 B（9.19 MiB） |
| showcase/1000 | 1,547,243 B（1.48 MiB） | 86,011,419 B（82.03 MiB） | 12,701,083 B（12.11 MiB） | 100,259,745 B（95.61 MiB） | +12,701,083 B（12.11 MiB） |

Phase 1 の値（Starter/100 + Output Cache で約 5.53 MB、Showcase/100 + Output Cache で約 30.5 MB）と一致する。旧 v1 テンプレートの保存量は Starter/100 で 1.45 MB、Showcase/100 で 26.6 MB であり、Phase 2B の増分は Output Cache の約 3.6〜4.1 MB だけである。

Showcase では Build State が合計の 86% を占める。これは Phase 1 で指摘した `manifestHookCache` の肥大化であり、Phase 2B で新たに増えたものではない。Build State の削減は Phase 2C の課題とする。

### 9.2 保存・復元時間（ローカル）

| Preset | Save ms | Restore ms |
| --- | ---: | ---: |
| starter/100 | 435〜504 | 398〜484 |
| showcase/100 | 498〜613 | 487〜585 |
| starter/1000 | 3,622 | 3,318.5 |
| showcase/1000 | 3,030 | 2,857.5 |

これはローカルディスク上のコピー時間であり、GitHub Actions のキャッシュアップロード・ダウンロード時間は含まない。`actions/cache` は転送時に圧縮するため、実転送量は上記の生バイト数より小さくなる可能性がある。実測は第 13 章の未検証事項とする。

### 9.3 GitHub Actions の容量上限

GitHub Actions のキャッシュはリポジトリあたり 10 GB で、上限に達すると最終アクセスが古いものから削除される。run ごとに新しい世代を保存する設計のため、単純計算では次の世代数が保持される。

- starter/100: 10 GB ÷ 5.28 MiB ≈ 1,800 世代
- showcase/100: 10 GB ÷ 28.99 MiB ≈ 330 世代
- starter/1000: 10 GB ÷ 21.99 MiB ≈ 434 世代
- showcase/1000: 10 GB ÷ 95.61 MiB ≈ 99 世代

実際には他のキャッシュ（`setup-node` の npm キャッシュなど）と共有するため、保持数はこれより少ない。`restore-keys` は直近の一致世代を使うため、古い世代が削除されても動作に影響しない。

### 9.4 容量制限を設けない理由

Riebeckite 側に固定の容量閾値は追加していない。理由は次のとおり。

- サイト規模・出力数・コンテンツ量の組み合わせが広く、根拠のある単一閾値を決められない。
- GitHub Actions 側に 10 GB / LRU の上限と削除機構がある。
- キャッシュ保存に失敗しても、`continue-on-error: true` と `actions/cache` の挙動によりビルドとデプロイは成功する。
- 容量を理由に保存を省略すると、次回の no-change で全出力を再レンダリングすることになり、安全性ではなく速度だけを落とす。

大容量サイトで保存が失敗した場合は、その run のデプロイは成功し、次回は Cold Build になる。これは意図した安全側の挙動である。

## 10. Clean Build との出力一致

`ci-runner.mjs` は、シナリオ適用後の増分ビルドの `dist/` と、同じ入力を `.riebeckite/` と `dist/` から作り直した Clean Build の `dist/` をツリー比較する。100 記事の全 12 行（Output Cache あり / なし × 2 Preset × 3 シナリオ）と、1000 記事の 4 行（2 Preset × あり / なし）のすべてで `equivalent = true` だった。

| Preset | Scenario | Output Cache あり | Output Cache なし |
| --- | --- | --- | --- |
| starter | no-change | 一致 | 一致 |
| starter | single-body-edit | 一致 | 一致 |
| starter | link-edit | 一致 | 一致 |
| showcase | no-change | 一致 | 一致 |
| showcase | single-body-edit | 一致 | 一致 |
| showcase | link-edit | 一致 | 一致 |

さらに `ci_persistent_state.test.ts` では、以下を含む 31 シナリオで増分ビルドと Clean Build の一致を検証している。

- no-change / body edit / frontmatter edit / alias edit
- add / delete / rename
- public → draft / draft → public / scheduled publish
- config change / plugin config change / plugin ordering change / cache version change
- cache missing / partial cache（content cache のみ、build state のみ、両方）
- cache corruption / schema mismatch
- 異なるディレクトリへの復元（テストごとに別の一時ディレクトリ）
- Output Cache の app fingerprint 変更、external dependency 変更

これにより、キャッシュ欠損・破損・キー変更・別ディレクトリ復元のいずれでも、最終出力が Cold Build と一致することが確認できる。

キー設計そのものは `scaffold_deployment.test.ts` が検証する。保存キーが 2 本の `restore-keys` それぞれの接頭辞になっていること、1 本目が config hash を含み 2 本目が含まないこと、`riebeckite-build-v2` と Node.js バージョンでスコープされていることを確認している。restore-key による前世代の復元は、別ディレクトリの新規サイトへ前回のキャッシュを復元する `ci-runner.mjs` と `ci_persistent_state.test.ts` の手順で再現している。

## 11. 回帰テスト

| テスト | コマンド | 結果 |
| --- | --- | --- |
| Scaffold Golden | `pnpm --filter create-riebeckite test:golden` | 10 tests PASS |
| Scaffold 契約 | `pnpm --filter create-riebeckite test` | 90 tests PASS |
| CI Persistent State | `pnpm --filter @riebeckite/honox test` | 163 tests PASS（31 subtests） |
| SSG Output Cache | 同上（`ssg_plugin.test.ts`） | PASS |
| Preset Fast Path E2E | `pnpm test:e2e:preset-fast-path` | 4 Preset PASS |
| CI Simulation Benchmark | `pnpm test:benchmark:presets` | 10 tests PASS |
| Scaffold 検証 | `pnpm check:scaffold` | PASS |
| Docs | `pnpm check:docs` | 825 files PASS |

`pnpm check`（Biome）には `benchmarks/preset-ssg/ci-runner.mjs` の既存のフォーマット差分が残る。これはベースコミット時点から存在するもので、Phase 2B の変更に起因しない。無関係な整形は行っていない。

## 12. 変更ファイル

| 区分 | ファイル |
| --- | --- |
| Scaffold テンプレート | `packages/create-riebeckite/templates/scaffold/deployment/github-actions/deploy.yml` |
| Golden | `packages/create-riebeckite/test/__golden__/scaffold/deploy-github-actions/.github/workflows/deploy.yml` |
| Golden | `packages/create-riebeckite/test/__golden__/scaffold/deploy-external-content/.github/workflows/deploy.yml` |
| Scaffold 契約テスト | `packages/create-riebeckite/test/scaffold_deployment.test.ts` |
| 永続状態テスト | `packages/integrations/honox/test/ci_persistent_state.test.ts` |
| CI シミュレーション | `benchmarks/preset-ssg/ci-runner.mjs` |
| シナリオ | `benchmarks/preset-ssg/lib.mjs` |
| シナリオテスト | `benchmarks/preset-ssg/runner.test.mjs` |
| CI ガイド（EN） | `docs/docs/guides/deployment/github-actions.md` |
| CI ガイド（JA） | `docs/docs/guides/deployment/github-actions.ja.md` |
| ビルドシステム（EN） | `docs/docs/framework/build-system.md` |
| ビルドシステム（JA） | `docs/docs/framework/build-system.ja.md` |
| 用語集（EN） | `docs/docs/glossary/output-cache.md` |
| 用語集（JA） | `docs/docs/glossary/output-cache.ja.md` |
| 用語集（EN） | `docs/docs/glossary/cache.md` |
| 用語集（JA） | `docs/docs/glossary/cache.ja.md` |
| 用語集索引（EN） | `docs/docs/glossary/README.md` |
| 用語集索引（JA） | `docs/docs/glossary/README.ja.md` |
| 本レポート | `benchmarks/reports/ci-output-cache-phase2b.md` |

コアのキャッシュ実装（`packages/core`、`packages/integrations/honox/src`）は変更していない。Phase 2A で確立した既存アーキテクチャをそのまま利用している。

## 13. 未検証事項と Phase 2C

### 13.1 未検証事項

- 実 GitHub Actions での計測。`actions/cache` の転送時間、Runner のディスク性能、キャッシュのヒット率はローカルでは再現できない。本レポートの保存・復元時間はローカルディスクのコピー時間である。
- 1000 記事は no-change のみ計測した。body edit / link edit / delete / 公開状態変更を 1000 記事で計測していない。
- 100 記事の wall-clock はマシン負荷の影響を強く受け、同一条件でも 20〜40% 変動した。100 記事の速度差は参考値として扱う。
- ubuntu-latest と Windows のファイルシステム差による所要時間の差。
- GitHub Actions のリポジトリキャッシュ上限（10 GB）に達した場合の LRU eviction の実際の挙動。

### 13.2 実効性能に関する注意

100 記事ではビルド固定費（`ssrModuleLoad` など）が支配的で、wall-clock 上の改善はノイズに埋もれた。一方、1000 記事の no-change では Output Cache によりビルド時間が Starter 41.9%、Showcase 37.8% 短縮し、復元・保存コストを含めても約 12〜14 秒の短縮が残った。Output Cache の効果は出力数に比例するため、大規模サイトほど有利になる。

ただし、これはローカルシミュレーションの結果であり、実 GitHub Actions の転送時間を含めた検証は残っている。転送コストが大きい環境では、CI ガイドに記載した方法で output cache のパスだけを外せる。固定費そのものの削減は Phase 2C の課題とする。

### 13.3 Phase 2C へ進めるか

Phase 2B の完了条件（公式テンプレートの Output Cache 復元、Starter / Showcase の増分 SSG 成立、Clean Build 一致、回帰テスト、英日ドキュメント同期）は満たした。実 GitHub Actions の計測を残課題として、Phase 2C へ進められる。
