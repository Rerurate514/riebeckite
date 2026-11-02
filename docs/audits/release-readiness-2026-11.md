---
date: 2026-11-02
title: Riebeckite Release Readiness Audit 2026-11
private: true
---
# Riebeckite リリース準備監査（2026-11）

- 監査日: 2026-11-02
- 対象リポジトリ: `C:\Users\rerur\.wk\others\riebeckite`
- 監査開始時 HEAD: `edb56e39`（Callout の折りたたみを details 要素で実装）
- 初回監査終了時 HEAD: `005784e1`（ドキュメントを利用者向けに再構成し全体監査を追加）
- 修正後再監査時 HEAD: `bb126fa6`（成果物の安全な置換ライターを追加）
- ブランチ: `main`
- 作業ツリー: 修正内容は未コミット（本作業では commit / push を行わない）。並行して追加された release workflow / changelog の変更も同じ作業ツリーに含まれる。

監査中に外部プロセス（ユーザーまたは別エージェント）が `005784e1` を作成しました。差分を確認した結果、`edb56e39..005784e1` のコード差分はなく、変更は `docs/**`、プラグイン README、`scripts/sync_plugin_docs.test.mjs` のみです。本レポートのコードに関する知見は両 HEAD に共通します。

> **更新（2026-11-02 修正後再監査）**: 初回監査の判定は **NOT READY**。修正と再検証の結果、P1 のコード欠陥は解消しましたが、npm 公開、可視回帰、5,000 ノート SSG、Linux、一部ブラウザ検証が未完了のため、最終判定は **CONDITIONAL** です。Finding ごとの修正・検証は「H. 修正後の再監査」を参照してください。

> **Integration branch update (2026-11-02):** `integration/release-transactional-performance` stages Client and SSG output through the Artifact Writer before publication. The 114-package build, dependency graph, documentation checks, release tests, 1,000-note Core equivalence, atomic SSG failure test, and external tarball E2E passed. Visual testing could not start because the required Chrome is not configured. Three-run 1,000-note full-SSG measurement and the typecheck parent process did not complete because of a Windows native crash (`0xC0000005`); these remain unverified.
## 0. 監査スコープと方法

### 0.1 対象

- 114 個の公開 npm パッケージ（すべて `0.0.35`）+ 非公開 `@riebeckite/web`
- 83 個の公式プラグイン
- 15 個の公式テーマ
- 4 個の integration（HonoX、Inspector、Analytics Cloudflare、Webmention Cloudflare）
- CLI、Core、Node、Runtime、Preview、SPA、Graph、UI、Diagnostics、Test、Create
- `apps/web`（riebeckite.dev の実サイト）
- CI（`.github/workflows/ci.yml`）、公開（`publish.yml`）、リリーススクリプト
- 人間向けドキュメント（英語・日本語）、`docs/agents/**` の設計規約

### 0.2 実施した検証

- 静的読解: パッケージ境界、Content Manager、Pipeline、Publication、Mutation、Migration、Derived Data、Provenance、Runtime、Preview、SSG、キャッシュ
- 実行: `pnpm build:packages`、`pnpm typecheck`、`pnpm check`、`pnpm check:docs`、`pnpm check:source-health`、`pnpm check:scaffold`、`pnpm check:templates`、`pnpm test:docs`、`pnpm test:release`、`pnpm test:registry`、`pnpm test:e2e:external`
- パッケージテスト: core、honox、cli、node、runtime、preview、spa、create-riebeckite、diagnostics、graph、ui、plugin-obsidian-markdown、plugin-dataview、plugin-bases
- 結合テスト: `tests/final-foundations/integration.ts`、`tests/content-mutation/integration.ts`
- 性能: `benchmarks/core.mjs` を 100 / 1,000 / 5,000 ノートで実行（結果は OS の一時ディレクトリへ出力）
- 配布: `npm pack --dry-run`、`npm view`、公開済み `0.0.35` tarball の内容確認
- セキュリティ: `pnpm audit --prod`、sanitizer、iframe CSP、公開境界、生成物のマーカー検査

### 0.3 制約・未検証

- Puppeteer の Chrome がこの環境で起動できず（`Code: 3221225595`）、ブラウザテストは実行できませんでした。ブラウザ挙動は **UNVERIFIED** です。
- Linux 実機、Cloudflare Workers への実デプロイ、GitHub Pages、外部ホスティングへの実デプロイは実施していません。
- 83 プラグインすべての個別テスト・組み合わせテストは実行していません。代表 3 プラグインと final-foundations の統合経路のみです。
- 5,000 ノートのフル SSG（Vite/SSR 含む）は、`build:packages` が失敗するため再計測できませんでした。1,000 ノートの数値は既存のベンチマーク成果物による **履歴値** です。
- `npm publish`、`git push`、デプロイは行っていません。

### 0.4 監査による生成物への影響

- `npm pack --dry-run` は `prepack` を実行するため、`packages/core`、`packages/cli`、`packages/create-riebeckite` の無視対象 `dist/` を再生成しました。ソース変更はありません。
- `tests/final-foundations` と `tests/content-mutation` の実行により、無視対象の `.work/` と一時 `dist/` を再生成しました。ソース変更はありません。
- 本レポート以外の追跡ファイルは作成・変更していません。

---

## A. Executive Summary

### 総合判定: **CONDITIONAL**（2026-11-02 修正後）

Riebeckite の Core は良質で、公開境界・サニタイザー・増分キャッシュ・7 基盤の横断シナリオには実装とテストの裏付けがあります。初回監査ではビルド・型検査・テスト・外部インストールが赤く、公開済み npm 0.0.35 と公開ドキュメントも一致していませんでした。修正後再監査では、**P1 のコード欠陥 9 件のうち 8 件を解消し、ビルド・型検査・パッケージテスト・外部 tarball インストール・1,000 ノートの clean/incremental 等価性を実測で確認**しました。残る阻害要因は、npm への次バージョン公開（本作業では禁止）と、視覚回帰・5,000 ノート SSG・Linux 実機の未検証です。HonoX registry テストは 0.1.62 への更新で解消しました。

### 正式リリースの阻害要因（修正後）

1. **解消**: `pnpm build:packages` の循環依存（RR-001）。
2. **解消**: 未公開 Inspector に起因する外部 E2E の 404（RR-002）。
3. **解消**: `pnpm typecheck` の 3 件の型エラー（RR-003）。
4. **解消**: CLI `doctor` と create-riebeckite の赤いテスト（RR-004、RR-010）。
5. **解消**: Hover Preview の unlisted 公開 JSON 混入（RR-005）。
6. **解消**: セキュリティ文書と実装の矛盾（RR-006）。
7. **解消**: CLI の `lz-string` 設定読込失敗（RR-007）。
8. **未解決（公開操作待ち）**: npm 0.0.35 と HEAD の差（RR-008）。文書にバージョン注意を追加したが、次バージョン公開までは解消しない。
9. **解消**: 1,000 ノートの clean/incremental 不一致（RR-009、検索索引の同着順を修正して実測一致）。

### 現在の強み

- `@riebeckite/core` の 474 テストは全件成功。公開状態、draft/scheduled/unlisted、エイリアス、リダイレクト、出力キャッシュ、破損キャッシュ、provenance、承認ワークフローを網羅している。
- `tests/final-foundations/integration.ts` が Mutation → Migration → Manifest → Derived Data → SSG → Publication → Provenance を一気通貫で検証し、成功した。
- その統合テストで incremental / no-change / clean の出力ハッシュが一致した（限られた 8 ページの fixture）。
- Markdown のサニタイズは `rehype-sanitize` + 独自スキーマで行われ、script / iframe / 危険な URL / 危険な style を除去する。Obsidian 系 34 テストも通過。
- 公開境界の主要な discovery surface（search、sitemap、feed、backlinks、graph、taxonomy、recent/related）は `discoverableEntries` を使っている。
- ドキュメントのリンク・英日対応・索引・プラグイン README 同期は `pnpm check:docs` で検証され、1,182 ファイルが整合している。
- `create-riebeckite` の scaffold は starter / minimal / showcase / empty を生成でき、Biome clean である。

### 最大の技術的リスク

**配布経路が壊れていること**です。ビルド循環、未公開の runtime 依存、CLI の設定ローダー、バージョン未更新が重なり、「ソースはあるが、第三者が npm から入れて再現できない」状態です。

### 最大のユーザー体験上のリスク

公開サイトのドキュメントは HEAD の機能を説明していますが、`npm install` で得られる 0.0.35 にはその機能がありません。さらに `doctor` / `inspect` / `content` が設定読込で落ちるため、初心者は最初の診断でつまずきます。

### 未検証領域

ブラウザ実挙動、Linux、Cloudflare/GitHub Pages への実デプロイ、全プラグイン組み合わせ、5,000 ノートのフル SSG、テーマの視覚回帰、アクセシビリティ自動監査。

---

## B. 領域別評価

| 領域 | 判定 | 根拠 | 問題数 | 主なリスク | テスト状況 | カバレッジ |
| --- | --- | --- | ---: | --- | --- | --- |
| アーキテクチャ | CONDITIONAL | 依存方向の違反・実行時 import cycle は `check:source-health` で検出されず。CLI → HonoX → Inspector → HonoX のパッケージ循環は解消済み（`check:cycles` で 0）。Core の Node 依存は残る | 1 | ビルド不能、配布不能 | 静的検査あり | 全 114 パッケージの manifest / import を走査 |
| 正確性・決定性 | CONDITIONAL | Core 474 / HonoX 194 / final-foundations は成功。no-change と clean の search-data 不一致の履歴 | 3 | 増分ビルドの再現性 | 単体・統合は強い | 一部の fixture のみ。全プラグインの clean/incremental は未検証 |
| セキュリティ | CONDITIONAL | sanitizer と iframe CSP は堅牢。unlisted の公開 JSON 混入、セキュリティ文書の誤記、moderate 依存脆弱性 | 4 | 公開境界の誤解、unlisted の検索性 | sanitizer テストあり | XSS は静的読解 + 一部テスト。SSRF/ブラウザは未検証 |
| 新基盤（7 システム） | CONDITIONAL | final-foundations が横断シナリオを通過。CLI からの利用は RR-007 で阻害 | 2 | CLI で操作できない | 統合テスト 1 本 | Mutation/Migration/Publication/Provenance は通過。Runtime はブラウザ未検証 |
| プラグイン・テーマ | CONDITIONAL | 83 プラグイン + 15 テーマの inventory と docs 同期は成功。テーマ単体テストなし、視覚回帰は CI 外 | 3 | 組み合わせ不具合、テーマ退行 | 代表 3 プラグインのみ実行 | 83 プラグイン中 3 を実行。テーマは画像 baseline のみ |
| Obsidian 互換性 | CONDITIONAL | WikiLink / embed / callout / image size / comment の 34 テスト成功。Dataview 14、Bases 29 成功 | 2 | 「Full」表記の過大評価、CALENDAR 未テスト | 静的構文は強い | CALENDAR、PDF、音声、Excalidraw の実ブラウザは未検証 |
| パフォーマンス | CONDITIONAL | Core は 5,000 ノート cold 30.6s / warm 5.3s / RSS 912MB。フル SSG は 1,000 ノート no-change 66.8s / RSS 1.5GB の履歴 | 2 | 大規模サイトの開発体験 | Core は実測、フル SSG は履歴 | 100/1,000/5,000 の Core。フル SSG は 1,000 のみ履歴 |
| DX | CONDITIONAL | `content --help` が usage error、公開版と docs の不一致。`doctor` の lz-string 失敗は解消 | 3 | 初回導入で離脱 | scaffold は成功 | CLI の主要経路を実行 |
| ドキュメント・公開サイト | CONDITIONAL | リンク・英日・索引は整合。セキュリティと visibility の説明が実装と不一致 | 4 | 誤った安全性判断、誤った設定 | check:docs は成功 | 1,182 ファイルの構造のみ。意味の整合は人手 |
| リリース・配布 | NOT READY | build / typecheck / test / external install が赤。npm 0.0.35 が HEAD より 275 コミット古い | 4 | リリース不能、導入不能 | 一部のみ | npm pack / npm view / tarball を確認 |
| テスト品質 | NOT READY | 赤いスイート、flake、ブラウザ未実行、テーマ視覚回帰が CI 外 | 3 | 退行の見逃し | 一部 | 上記の範囲 |

---

## C. Findings

重要度の定義は依頼どおりです。P0 は情報漏洩・破壊的データ損失・重大なセキュリティ問題ですが、本監査では **P0 と断定できるものはありません**。以下は P1 以下です。

### P1

#### RR-001: 公開パッケージの循環依存で `build:packages` が失敗する

- **Severity**: P1
- **Confidence**: High（実行で再現）
- **問題**: `scripts/build_packages.mjs` が `dependencies` / `devDependencies` / `peerDependencies` をすべてビルド順序に含めるため、`@riebeckite/cli → @riebeckite/honox → @riebeckite/honox-inspector → @riebeckite/honox` の循環でビルド順序が決まらない。
- **影響範囲**: CI の build / typecheck / test、`publish.yml`、`pnpm release`、`benchmark:presets`、`test:e2e:*`。リリース全体が停止する。
- **発生条件**: クリーンな作業ツリーで `pnpm build:packages` を実行したとき。必ず発生。
- **ファイルと箇所**:
  - `scripts/build_packages.mjs:39-49`（3 種類の依存を合算）
  - `packages/integrations/honox/package.json` の `dependencies["@riebeckite/honox-inspector"]`
  - `packages/integrations/honox-inspector/package.json` の `devDependencies["@riebeckite/honox"]`
- **再現手順**:
  1. `pnpm build:packages`
- **観測結果**:
  ```
  build:packages failed: Circular dependency among public packages; build order is undefined.
  ```
  `scripts/release.mjs` でも同じ循環が報告され、`pnpm test:release` は 28 件中 20 件失敗した。
- **期待結果**: 公開パッケージが依存順にビルドされ、CI と release が進行する。
- **根本原因**: Inspector を独立パッケージへ切り出したコミット `d9089454` で、Inspector のテスト用 devDependency と HonoX の実行時依存が相互参照になった。ビルドグラフが devDependency を無条件に含む。
- **修正方針**: Inspector の `@riebeckite/honox` devDependency を削除するか、テスト専用の解決に置き換える。あるいはビルドグラフでは devDependency を辺として扱わず、公開順序だけを dependencies / peerDependencies から計算する。Inspector は公開パッケージ一覧に含める。
- **回帰テスト**: `computeBuildLayers` の単体テストに「devDependency 循環を許容する」「公開依存の循環は失敗する」を追加。`pnpm build:packages` を CI の必須 job にする。
- **完了条件**: `pnpm build:packages` が exit 0。`pnpm test:release` が全件成功。
- **依存関係**: RR-002、RR-008 の前提。

#### RR-002: 新規 HonoX が未公開の Inspector に依存し、外部インストールが 404 で失敗する

- **Severity**: P1
- **Confidence**: High（実行で再現 + registry 照会）
- **問題**: HEAD の `@riebeckite/honox` は `@riebeckite/honox-inspector` を runtime dependency に持つが、registry に Inspector が存在しない。外部 E2E の `npm install` が 404 で停止する。
- **影響範囲**: `pnpm test:e2e:external`、新規サイトの `npm install @riebeckite/honox`、`@riebeckite/cli` の依存解決。
- **発生条件**: HEAD の tarball をインストールするとき。公開済み `0.0.35` の HonoX は Inspector に依存していないため、HEAD をリリースした場合に発生する。
- **ファイルと箇所**:
  - `packages/integrations/honox/package.json`
  - `tests/external-site/fixture-spec.ts:3-14`（Inspector が PACKAGES にない）
  - `packages/integrations/honox-inspector/package.json`
- **再現手順**:
  1. `pnpm test:e2e:external`
  2. または `npm view @riebeckite/honox-inspector version`
- **観測結果**:
  ```
  npm error 404 Not Found - GET https://registry.npmjs.org/@riebeckite%2fhonox-inspector
  npm error The requested resource '@riebeckite/honox-inspector@0.0.35' could not be found
  ```
  `external-site` は 114 パッケージを pack したが Inspector を含めず、`npm install` で失敗した。
- **期待結果**: 外部サイトが tarball だけで依存を解決し、E2E が完走する。
- **根本原因**: 新規パッケージを `PACKAGES` / release の公開順序 / E2E の pack 対象へ追加していない。`@riebeckite/honox` の依存追加と配布リストの更新が同期していない。
- **修正方針**: Inspector を `tests/external-site/fixture-spec.ts` と release 対象に追加し、HonoX の依存として公開する。Inspector が開発専用なら HonoX の optional peer / dev 専用経路へ移す。
- **回帰テスト**: external-site E2E に「全 workspace 依存が tarball で解決できる」検証を追加。`npm view` ではなく、pack した tarball の依存閉包を検査する。
- **完了条件**: `pnpm test:e2e:external` が exit 0。`npm pack` した HonoX 単体の依存がすべて registry に存在する。
- **依存関係**: RR-001 の後に実施。

#### RR-003: `pnpm typecheck` が 3 件の型エラーで失敗する

- **Severity**: P1
- **Confidence**: High（実行で再現）
- **問題**: `frontmatter-transformer` のテストが CLI の引数・オプション型と `node:test` の戻り値型に適合していない。
- **影響範囲**: CI の typecheck job、`pnpm typecheck`、リリース前検証。
- **発生条件**: 常に。
- **ファイルと箇所**:
  - `packages/plugins/frontmatter-transformer/test/plugin.test.ts:79`
  - 同 `:80`
  - 同 `:179`
- **再現手順**: `pnpm typecheck`
- **観測結果**:
  ```
  Type 'Record<string, unknown>' is not assignable to type 'Readonly<Record<string, CliArgumentValue>>'
  Type 'Record<string, unknown>' is not assignable to type 'Readonly<Record<string, CliOptionValue>>'
  No overload matches this call ... 'CliCommandResult | Promise<CliCommandResult>' is not assignable to '() => Promise<unknown>'
  [typecheck] tests: 3 type error(s)
  [typecheck] 3 type error(s) in 3 projects
  ```
- **期待結果**: exit 0。
- **根本原因**: テスト内のオブジェクトが `unknown` のまま CLI 入力型へ渡され、`t.test` のコールバックが `void` を返していない。実装変更にテスト型が追随していない。
- **修正方針**: テストの入力を `CliArgumentValue` / `CliOptionValue` に型付けし、`t.test` コールバックは `await` して `void` を返す。実装の型を緩めない。
- **回帰テスト**: 型検査そのもの。CI の typecheck を必須化。
- **完了条件**: `pnpm typecheck` が exit 0。
- **依存関係**: なし。

#### RR-004: CLI の `doctor` スモークテストが失敗する（期待 2 / 実際 3）

- **Severity**: P1
- **Confidence**: High（実行で再現）
- **問題**: 空のプロジェクトで `doctor --json` の `summary.errors` が 3 になるが、テストは 2 を期待している。
- **影響範囲**: `pnpm --filter @riebeckite/cli test`、CI の test job。
- **発生条件**: content ディレクトリのないプロジェクトで `doctor` を実行したとき。
- **ファイルと箇所**:
  - `packages/cli/test/dist_smoke.test.ts:93`
  - 関連実装: `packages/cli/src/commands/doctor.ts`、`packages/diagnostics/src/collect.ts`
- **再現手順**:
  1. `packages/cli/test` 配下に一時プロジェクトを作り、最小の `riebeckite.config.ts` と `vite.config.ts` を置く。
  2. `node packages/cli/dist/cli.js doctor --json`
- **観測結果**:
  ```json
  {"summary":{"errors":3,"byCode":{
    "ASSET_INSPECTION_FAILED":1,
    "CONTENT_INSPECTION_FAILED":1,
    "OUTPUT_INSPECTION_FAILED":1
  }}}
  ```
  テストは 2 を期待して失敗する。
- **期待結果**: テストの期待値が実装の意図と一致する。content 不在時に asset / content / output の 3 エラーを出すのが正しいなら、テストを 3 に更新する。2 が正しいなら、asset inspection が content 不在を二重計上しないよう実装を直す。
- **根本原因**: テスト期待値が実装変更に追随していない、または asset inspection の失敗分類が content inspection と重複している。どちらが正しいかは仕様未確定。
- **修正方針**: まず「content 不在時に何件のエラーを出すか」を仕様化し、テストと実装を一致させる。単に期待値を 3 に変えるだけでなく、二重計上が意図か確認する。
- **回帰テスト**: content 不在、空 content、asset のみ、output のみの 4 ケース。
- **完了条件**: `pnpm --filter @riebeckite/cli test` が全件成功。
- **依存関係**: RR-007（設定読込が直らないとテスト自体が動かない）。

#### RR-005: Hover Preview が unlisted ページを公開 JSON に含める

- **Severity**: P1
- **Confidence**: High（コード + 単体テスト + 生成物で確認）
- **問題**: `hoverPreview` は `manifest.routableEntries`（public + unlisted）を `_riebeckite/hover-preview/index.json` にシリアライズする。この JSON は全ページから `data-index-src` で参照される公開ファイルである。
- **影響範囲**: `visibility: unlisted` のタイトル・slug・本文 HTML・抜粋が、検索エンジンや第三者が取得できる固定 URL に露出する。draft / scheduled は含まれない。
- **発生条件**: hover-preview プラグインを有効にし、unlisted ノートが存在するとき。
- **ファイルと箇所**:
  - `packages/plugins/hover-preview/index.ts:55-56`
  - `packages/plugins/hover-preview/src/runtime.ts:69-81`
  - `packages/plugins/hover-preview/src/render.ts:6`
  - `tests/final-foundations/integration.ts:419, 512`（unlisted を含むことを明示的に assert）
  - `packages/plugins/hover-preview/test/hover-preview.test.ts:128`
- **再現手順**:
  1. `visibility: unlisted` のノートを含むサイトをビルドする。
  2. `dist/_riebeckite/hover-preview/index.json` を開く。
- **観測結果**: 既存の `tests/final-foundations/.work/site/dist/_riebeckite/hover-preview/index.json` に `/n/unlisted` と `"Unlisted Post"` が含まれていた。
- **期待結果**: ドキュメント上、unlisted は「一覧・フィード・ナビゲーションなどの discovery surface に出さない」。`docs/docs/framework/derived-data.md` は「明示的な非公開境界がない限り unlisted をシリアライズしない」としている。公開 JSON は discovery surface であり、除外が必要。
- **根本原因**: hover preview のインデックス設計が `routableEntries` を選択し、unlisted のホバー表示を意図的に許可している。テストもその挙動を固定している。ドキュメントの publication boundary と設計判断が同期していない。
- **修正方針**: インデックスを `discoverableEntries` に限定する。unlisted のホバーが必要なら、非公開の境界（認証付きエンドポイント等）を明示し、公開 URL に置かない。少なくとも `draft` / `scheduled` と同様に `unlisted` を除外する。
- **回帰テスト**: ビルド後の `index.json` に unlisted の slug / title / 本文マーカーが含まれないこと。sitemap / search / feed と同時に検査する。
- **完了条件**: 公開生成物のどこにも unlisted の本文・タイトルが discovery 目的で現れない。ドキュメントとテストが一致する。
- **依存関係**: なし。

#### RR-006: セキュリティモデル文書が実装と正反対の説明をしている

- **Severity**: P1
- **Confidence**: High（コード + テストで確認）
- **問題**: `docs/docs/security.md` は「Markdown の raw HTML をサニタイズしない」「tags / attributes / URL schemes / inline event handlers / iframes / SVG / scripts を sanitize しない」と明記しているが、実装は `rehype-sanitize` でこれらを除去している。
- **影響範囲**: サイト所有者の脅威モデル、プラグイン作者の責務判断、セキュリティレビュー、脆弱性報告の前提。実装より危険側に読めるが、逆に「サニタイズされる」ことを前提にした機能設計（raw iframe 等）も誤る。
- **発生条件**: 常に。
- **ファイルと箇所**:
  - `docs/docs/security.md:19, 33, 44`
  - `docs/docs/security.ja.md` の対応箇所
  - `packages/core/src/pipeline.ts:410-415`
  - `packages/core/src/markdown_sanitize_schema.ts`
- **再現手順**:
  1. `pnpm --filter @riebeckite/plugin-obsidian-markdown test` を実行し、「keeps sanitization for dangerous HTML and URLs」が成功することを確認する。
  2. `Pipeline` に `<script>` / `onerror` / `iframe` を含む Markdown を渡す。
- **観測結果**: テストは危険な HTML と URL が除去されることを保証している。`pipeline.ts` は `rehypeRaw` の直後に `rehypeSanitize(markdownSanitizeSchema)` を実行する。`docs/security.md` の記述はこれと矛盾する。
- **期待結果**: 文書が実装のサニタイズ範囲（許可タグ、許可属性、許可 URL、style 制限）を正確に説明する。プラグインが sanitize 後に raw HTML を追加できることも明記する。
- **根本原因**: セキュリティ強化コミット（`236a9c3b` ほか）で sanitizer を導入したが、security.md の「not a sanitizer」記述を更新していない。
- **修正方針**: security.md / ja を実装に合わせて書き直す。少なくとも「Markdown の raw HTML は許可リスト方式でサニタイズされる」「プラグインの rehype 以降の HTML は信頼されたコードとして扱う」を分離して説明する。`escapeHtml` の説明も維持する。
- **回帰テスト**: ドキュメントのコード例と `markdownSanitizeSchema` の許可タグを照合する docs test。危険な HTML の sanitizer テストを公開テストとして維持する。
- **完了条件**: security.md / ja の記述が実際の sanitizer と一致し、raw iframe が使えないこと、plugin HTML は別境界であることが読み取れる。
- **依存関係**: なし。

#### RR-007: CLI の設定読込が `lz-string` 解決で失敗する

- **Severity**: P1
- **Confidence**: High（このリポジトリで再現）。外部 pnpm サイトへの影響は Medium。
- **問題**: `excalidraw` プラグインがモジュール先頭で `createRequire(import.meta.url)` を実行し、`lz-string` を同期的に require する。CLI は設定を `.riebeckite-config-*/config.mjs` に esbuild でバンドルするため、`import.meta.url` が一時ディレクトリを指し、pnpm の strict node_modules では `lz-string` が見つからない。
- **影響範囲**: このリポジトリの `doctor`、`inspect`、`content`、`migrate`、`publish` など、設定を読み込む CLI コマンド。`excalidraw` を使う pnpm サイトでも発生しうる。
- **発生条件**: `excalidraw()` を含む設定で、CLI が設定をロードするとき。
- **ファイルと箇所**:
  - `packages/plugins/excalidraw/src/parse.ts:1-9`
  - `packages/integrations/honox/src/config_loader.ts:24-49`
  - `packages/integrations/honox/src/workspace_packages.ts`
- **再現手順**:
  1. `node packages/cli/dist/cli.js inspect config`（リポジトリルート）
  2. または `node packages/cli/dist/cli.js doctor --json`
- **観測結果**:
  ```
  Cannot find module 'lz-string'
  Require stack:
  - C:\...\.riebeckite-config-XXXX\config.mjs
  ```
  `doctor` は `{"ok":false,"error":{"code":"MODULE_NOT_FOUND",...}}` を返す。
- **期待結果**: 設定のロードが成功し、`doctor` / `inspect` が動作する。
- **根本原因**: 設定ローダーが workspace パッケージのソースを esbuild でインライン化する一方、プラグイン内の `createRequire` はバンドル後の一時ファイル基準で解決される。pnpm は推移依存をルート `node_modules` に hoist しないため解決に失敗する。
- **修正方針**: `lz-string` を静的 import に変更するか、プラグイン自身の `import.meta.url` を保持する形で遅延ロードする。設定ローダーは workspace パッケージの `createRequire` を保持できるよう `external` 化する、あるいはプラグインの依存解決をプラグインの実パス基準にする。`content --help` が設定を読まないようにする修正（RR-013）も併用する。
- **回帰テスト**: `excalidraw` を含む設定で `doctor` / `inspect config` を実行する E2E。pnpm workspace と npm hoist の両方で検証する。
- **完了条件**: `node packages/cli/dist/cli.js doctor --json` が設定エラー以外で落ちない。外部 pnpm サイトの E2E が通る。
- **依存関係**: RR-004、RR-013。

#### RR-008: 公開済み npm 0.0.35 と公開ドキュメントの機能が一致しない

- **Severity**: P1
- **Confidence**: High（tarball と registry で確認）
- **問題**: 公開サイトは Content Mutation、Content Migration、Publication Workflow、Interactive Runtime を現行機能として説明しているが、npm の最新版 `0.0.35` の CLI には `content` / `migrate` / `publish plan` が存在しない。HEAD は v0.0.35 から 275 コミット進んでいる。
- **影響範囲**: 第三者が `npm install` して docs の手順を実行した場合、コマンドが見つからない。`npx create-riebeckite` で生成したサイトも新機能を含まない。
- **発生条件**: npm registry から `0.0.35` をインストールしたとき。
- **ファイルと箇所**:
  - `packages/cli/package.json` の `version: 0.0.35`
  - `docs/docs/framework/content-mutation.md`
  - `docs/docs/framework/content-migration.md`
  - `docs/docs/framework/interactive-runtime.md`
  - `docs/docs/guides/deployment/publication-workflow.md`
- **再現手順**:
  1. `npm pack @riebeckite/cli@0.0.35`
  2. tarball の `dist/cli.js` を検索する。
- **観測結果**: `migrate list` 0 件、`content create` 0 件、`content plan` 0 件、`publish plan` 0 件、`theme preview` 8 件、`plugin verify` 1 件。`npm view @riebeckite/honox@0.0.35 dependencies` にも Inspector はない。
- **期待結果**: 公開 docs と npm の最新版が同じ機能を示す。未リリース機能は「Next」と明示するか、バージョンを公開する。
- **根本原因**: v0.0.35 以降の機能をリリースせず、サイトだけ HEAD からデプロイしている。リリースゲートが赤いため、バージョンを上げられない状態が続いている。
- **修正方針**: RR-001〜RR-007 を解消して次バージョンを公開する。公開までは docs に「unreleased / next」バッジを付け、`npm install` のバージョンと一致させる。
- **回帰テスト**: docs の CLI コマンド一覧を、公開済み CLI の `--help` 出力と比較する release test。`npm view` の最新版と docs のバージョンを照合する。
- **完了条件**: 公開サイトの Getting Started と CLI Reference のコマンドが、npm 最新版で実行できる。
- **依存関係**: RR-001、RR-002、RR-003、RR-004、RR-007。

#### RR-009: no-change 増分ビルドと clean ビルドの `search-data.json` が一致しない履歴がある

- **Severity**: P1
- **Confidence**: Medium（既存ベンチマーク成果物で確認。HEAD では未再現）
- **問題**: 公式 showcase プリセット 1,000 ノートの no-change シナリオで、増分出力と clean 出力の `search-data.json` の SHA-256 が異なった。他の add / delete シナリオは一致している。
- **影響範囲**: 「Clean Build と Incremental Build がバイト単位で一致する」というリリース条件。検索インデックスのみの差分だが、キャッシュ再利用の正しさに関わる。
- **発生条件**: showcase プリセット、1,000 ノート、no-change、出力キャッシュあり。
- **ファイルと箇所**:
  - `benchmarks/results/2026-10-19T01-27-48-255Z-preset-ssg.md`（showcase 1000 no-change、Equivalent false）
  - 同 JSON の `equivalence.differences[0].file = "search-data.json"`
  - `packages/plugins/search/src/search-index.server.ts:18-36`
  - `packages/integrations/honox/src/ssg*` の no-change fast path
- **再現手順**:
  1. `pnpm build:packages`（現状は RR-001 で不可）
  2. `pnpm benchmark:presets -- --presets showcase --sizes 1000 --scenarios no-change`
  3. `equivalence.differences` を確認する。
- **観測結果**: 履歴値では `incremental: 209fa0d9...`、`clean: 428fdbc6...`。clean ビルドは別プロセスで、no-change はキャッシュから `search-data.json` をコピーしている。
- **期待結果**: 同一入力・設定・ビルド時刻でバイト一致。
- **根本原因**: 未確定。候補は (a) `buildSearchItems` の `localeCompare(..., "ja")` が同値タイトルで安定順序を持たない、(b) endpoint の再レンダーとキャッシュコピーで manifest の entry 順が異なる、(c) no-change 時に endpoint 出力を再検証していない、のいずれか。現時点で断定しない。
- **修正方針**: まず再現ハーネスを CI で固定し、差分 JSON を保存する。`buildSearchItems` に permalink の tie-break を追加し、endpoint 出力を常に manifest から決定的に生成する。no-change fast path でも endpoint 出力のハッシュを検証する。
- **回帰テスト**: 1,000 ノート showcase の no-change / single-edit / add / delete で全出力ツリーを比較。`search-data.json` を含める。
- **完了条件**: すべてのシナリオで `equivalent: true`。
- **依存関係**: RR-001（ベンチマーク実行の前提）。

### P2

#### RR-010: `create-riebeckite` の配布テストが `{{schedule}}` 未置換で失敗する

- **Severity**: P2
- **Confidence**: High（実行で再現）
- **問題**: テストがインストール済みテンプレートを読み、`{{contentCheckout}}` と secrets は置換するが `{{schedule}}` を置換しない。生成物には schedule が展開済みのため、文字列比較が失敗する。
- **影響範囲**: `pnpm --filter create-riebeckite test`、CI の scaffold job。
- **発生条件**: 常に。
- **ファイルと箇所**: `packages/create-riebeckite/test/scaffold_distribution.test.ts:260-281`、`packages/create-riebeckite/src/scaffold/deployment.ts:106-111`
- **再現手順**: `pnpm --filter create-riebeckite test`
- **観測結果**: `actual` は `workflow_dispatch:`、`expected` は `{{schedule}}  workflow_dispatch:`。
- **期待結果**: テストが `renderSchedule` と同じ置換を行う。
- **根本原因**: スケジュール機能の追加時に配布テストのテンプレート再現処理を更新していない。
- **修正方針**: テスト側で `{{schedule}}` を空文字または期待する cron に置換する。schedule 有効 / 無効の 2 ケースを追加する。
- **回帰テスト**: 上記 2 ケース。
- **完了条件**: `create-riebeckite` テスト全件成功。
- **依存関係**: なし。

#### RR-011: `@riebeckite/node` の並行 Mutation テストが flaky

- **Severity**: P2
- **Confidence**: Medium（1 回失敗、単体 8 回再実行では成功）
- **問題**: 3 プロセス同時 apply の stale lock 回復テストで、`applied.length` が 0 になり得る。
- **影響範囲**: Content Mutation の同時実行信頼性、CI の安定性。
- **発生条件**: 高負荷時、3 つの `apply` が同時に stale lock を奪おうとしたとき。
- **ファイルと箇所**: `packages/node/test/content_mutation_processes.test.ts:173-202`
- **再現手順**: `pnpm --filter @riebeckite/node test` を全体実行。単体では 8 回成功。
- **観測結果**: 初回全体実行で `actual 0 !== expected 1`。再実行では 72/72 成功。
- **期待結果**: 3 プロセスのうち 1 つだけが適用し、他は安全に失敗する。
- **根本原因**: 未確定。ロック回復の競合で全プロセスが「別プロセスが所有」と判断する可能性、またはテストの待機不足。
- **修正方針**: ロック取得の CAS / 所有権更新を再確認し、失敗時に適用されないことを明示する。テストは競合を決定的に注入する。
- **回帰テスト**: 同じテストを 20 回連続実行する stress test。
- **完了条件**: 20 回連続で成功。
- **依存関係**: なし。

#### RR-012: `pnpm test:registry` が Windows で必ず失敗する

- **Severity**: P2
- **Confidence**: High（実行で再現）
- **問題**: `spawnSync("pnpm.cmd", ...)` を `shell: true` なしで呼ぶため、Windows では `EINVAL` になる。
- **影響範囲**: Windows での `pnpm test:registry`、CI の registry E2E。
- **発生条件**: Windows。
- **ファイルと箇所**: `scripts/run_registry_e2e.mjs:3-9`
- **再現手順**: `pnpm test:registry`
- **観測結果**: 出力なしで exit 1。`node -e` で同じ呼び出しを行うと `{status:null,error:'EINVAL'}`。
- **期待結果**: Windows でも honox の registry E2E が起動する。
- **根本原因**: `.cmd` は `shell: true` または `process.env.ComSpec` 経由でないと直接実行できない。
- **修正方針**: `spawnSync(pnpm, args, { shell: true, stdio: "inherit" })` にするか、`process.platform === "win32"` で `cmd.exe /c pnpm ...` を使う。
- **回帰テスト**: Windows CI で `pnpm test:registry` を実行。
- **完了条件**: Windows で exit 0。
- **依存関係**: なし。

#### RR-013: `content --help` が usage error になる

- **Severity**: P2
- **Confidence**: High（実行で再現）
- **問題**: `riebeckite content --help` がサブコマンド一覧を表示せず、`CliUsageError` で exit 1 になる。`migrate --help` は正常。
- **影響範囲**: CLI の学習性、初心者の最初の操作。
- **発生条件**: 任意のプロジェクトで `content --help`。
- **ファイルと箇所**: `packages/cli/src/command/builtins.ts:1030` 付近の `content` グループ定義、`packages/cli/src/commands/content.ts`
- **再現手順**: 最小プロジェクトで `node packages/cli/dist/cli.js content --help`
- **観測結果**: `CliUsageError: Usage: riebeckite content <create|edit|delete|move> ...` が stderr に出て exit 1。
- **期待結果**: `content` のサブコマンドと例を表示して exit 0。
- **根本原因**: `content` グループに `migrate` のような help 定義がない。グループコマンドの `--help` が handler の usage 検査に落ちる。
- **修正方針**: `content` グループに summary / description / examples / subcommands を定義し、`--help` を handler 前に処理する。`docs/agents/build-and-cli.md` の「help はプロジェクトを初期化しない」も守る。
- **回帰テスト**: `content --help`、`content create --help`、`migrate --help` の exit 0 と出力。
- **完了条件**: すべてのグループで `--help` が exit 0。
- **依存関係**: RR-007。

#### RR-014: 1,000 ノートのフル SSG が 66.8 秒 / RSS 1.5GB（履歴値）

- **Severity**: P2
- **Confidence**: Medium（既存成果物。HEAD 未再計測）
- **問題**: showcase プリセット 1,000 ノートの no-change が 66.8s、add/delete が 112〜119s、peak RSS 1.5〜1.9GB。Core パイプラインは 5,000 ノート warm 5.3s / 912MB なので、ボトルネックは Vite/SSR/SSG 側。
- **影響範囲**: 大規模 Vault の開発・CI 時間、GitHub Actions のメモリ。
- **発生条件**: showcase 相当の 1,000 ノート、Windows、Node 24.11.1、i7-14700KF。
- **ファイルと箇所**: `benchmarks/results/2026-10-19T01-27-48-255Z-preset-ssg.md`、`benchmarks/results/2026-10-19T01-27-48-255Z-preset-ssg.json` の `spansMs`（`ssrModuleLoad` 13.4s、`toSSG` 23.5s、cache validation 8.3s など）
- **再現手順**: RR-001 解消後 `pnpm benchmark:presets -- --sizes 1000`。
- **観測結果**: 履歴値。no-change でも `fastPathApplied: true` なのに 66.8s。
- **期待結果**: 1,000 ノートの no-change が数秒台、RSS が 1GB 未満。
- **根本原因**: 未確定。SSR モジュールロード、output cache の全エントリ検証、manifest hook の再実行が候補。Core の処理そのものではない。
- **修正方針**: `ssrModuleLoad` と `outputCacheEntryChecksum` / `EntriesValidate` をプロファイルし、no-change 時に Vite のフルビルドを避けられないか確認する。推測で最適化せず、まず span を分離する。
- **回帰テスト**: 100 / 1,000 / 5,000 の no-change と single-edit を CI の benchmark job（非ブロッキング）で記録。
- **完了条件**: 1,000 ノート no-change の目標値を決め、達成を継続監視する。
- **依存関係**: RR-001、RR-009。

#### RR-015: `visibility` ドキュメントが存在しない `published` フィールドを説明している

- **Severity**: P2
- **Confidence**: High（コードと docs の照合）
- **問題**: `docs/docs/glossary/visibility.md` は `published: true/false` と `visibility: "listed"` を説明しているが、実装のフィールドは `publish`（boolean）で、`"listed"` は `PublishingVisibility` に存在しない。`published` は日付として扱われる。
- **影響範囲**: 利用者が `published: false` を設定しても下書きにならず、意図せず公開される可能性がある。
- **発生条件**: docs のとおりに frontmatter を書いたとき。
- **ファイルと箇所**:
  - `docs/docs/glossary/visibility.md:25-31`
  - `docs/docs/glossary/visibility.ja.md`
  - `packages/core/src/content/publishing.ts:29-45`
  - `packages/core/src/types/post_content.ts:16`
- **再現手順**: `published: false` だけを書いたノートを explicit strategy でビルドする。
- **観測結果**: `published` は boolean の公開判定に使われず、`publish` も `visibility` もなければ draft のまま。`visibility: public` は `publish: true` なしでも public になる。
- **期待結果**: docs が `publish: true` / `visibility` / `publishAt` の実際の優先順位を説明する。
- **根本原因**: 過去の `published` boolean 仕様からの移行漏れ。docs と実装の用語が混在している。
- **修正方針**: docs を `publish` に統一し、`visibility: public` が explicit opt-in を上書きする事実を明記する。`published` は日付フィールドであることを明記する。
- **回帰テスト**: docs の frontmatter 例を実際に `resolvePublishingState` へ通す docs test。
- **完了条件**: docs の例がすべて実装どおりの状態になる。
- **依存関係**: なし。

#### RR-016: `pnpm audit --prod` に moderate 2 件

- **Severity**: P2
- **Confidence**: High（実行結果）
- **問題**: `@hono/node-server` の `serveStatic` パス二重デコード（GHSA-rmxm-3fg6-px4f、patched >=2.1.3）と `minimatch` の ReDoS（GHSA-g3hv-75wg-m249、patched >=11.0.1）。
- **影響範囲**: 開発サーバー / Node アダプタの静的配信、ビルド時の glob。Cloudflare 本番のリクエスト経路とは限らない。
- **発生条件**: 該当依存を使う開発・ビルド時。
- **ファイルと箇所**: `pnpm-lock.yaml`（honox → @hono/vite-dev-server → @hono/node-server、honox → precinct → minimatch）
- **再現手順**: `pnpm audit --prod`
- **観測結果**: `2 vulnerabilities found / Severity: 2 moderate`。
- **期待結果**: high/critical なし、moderate も解消または許容理由を記録。
- **根本原因**: HonoX 0.1.56 の推移依存が古い。overrides で未解消。
- **修正方針**: `pnpm.overrides` で patched 版へ上げるか、HonoX 側の更新を待つ。dev 専用なら SECURITY.md に許容理由を書く。
- **回帰テスト**: CI で `pnpm audit --prod --audit-level high` を実行し、moderate はレポートのみ。
- **完了条件**: high/critical 0、moderate の扱いが文書化されている。
- **依存関係**: なし。

#### RR-017: GitHub Actions がタグ固定で、SHA 固定ではない

- **Severity**: P2
- **Confidence**: High（workflow 読解）
- **問題**: `actions/checkout@v4`、`pnpm/action-setup@v4`、`actions/setup-node@v4`、`actions/cache@v4`、`cloudflare/wrangler-action@v3` がタグ固定。タグの付け替えによる supply-chain リスクがある。
- **影響範囲**: CI / 本番デプロイのサプライチェーン。
- **発生条件**: 上流アクションのタグが侵害・付け替えされたとき。
- **ファイルと箇所**: `.github/workflows/ci.yml`、`.github/workflows/publish.yml`、`.github/actions/setup/action.yml`
- **再現手順**: workflow を読む。
- **観測結果**: すべて `@vN`。
- **期待結果**: 主要アクションは commit SHA 固定 + コメントでバージョン表示。
- **根本原因**: 一般的なタグ固定の慣習。
- **修正方針**: Dependabot / Renovate で SHA を更新する運用にする。
- **回帰テスト**: CI の workflow lint（`actionlint` 等）で SHA 固定を検査。
- **完了条件**: すべての third-party action が SHA 固定。
- **依存関係**: なし。

#### RR-018: テスト・検証のカバレッジが「全公式プラグイン・テーマ」に届いていない

- **Severity**: P2
- **Confidence**: High（inventory と実行範囲の照合）
- **問題**: 83 プラグインのうち、今回実行できたのは obsidian-markdown / dataview / bases の 3 つ。15 テーマには単体テストがなく、視覚回帰は `tests/visual` の手動実行で、CI に入っていない。ブラウザテストは Chrome 不在で未実行。
- **影響範囲**: プラグイン間の相互作用、テーマの light/dark、モバイル、アクセシビリティ。
- **発生条件**: リリース後の組み合わせ利用。
- **ファイルと箇所**: `packages/themes/*/test` なし、`tests/visual/README.md`、`.github/workflows/ci.yml`（visual/browser が必須でない）
- **再現手順**: `Get-ChildItem packages/themes -Directory` と CI を照合。
- **観測結果**: テーマ 15 個に test ディレクトリなし。`test:visual` は package.json にあるが CI にない。
- **期待結果**: 主要テーマの light/dark/mobile と主要プラグインの組み合わせが CI で検証される。
- **根本原因**: テストがパッケージ単位で閉じており、横断マトリクスがない。
- **修正方針**: 代表テーマ + 代表プラグインの組み合わせを final-foundations に追加。視覚回帰は Chrome 固定環境の dedicated job にする。
- **回帰テスト**: 追加したマトリクス。
- **完了条件**: 主要 6 テーマ × light/dark × desktop/mobile、主要 20 プラグインの組み合わせが CI で実行される。
- **依存関係**: RR-014（実行時間）。

#### RR-019: アクセシビリティ「監査済み」の範囲が検証と結びついていない

- **Severity**: P2
- **Confidence**: Medium（文書と CI の照合）
- **問題**: `docs/docs/accessibility.md` は「official audit covers ... official Themes ... official UI-generating Plugins」と広い監査範囲を主張するが、axe / Lighthouse / 手動チェックの成果物や CI ジョブが見当たらない。
- **影響範囲**: 利用者がアクセシビリティ品質を過信する。
- **発生条件**: docs を読んだとき。
- **ファイルと箇所**: `docs/docs/accessibility.md` の「Audited surface」、`.github/workflows/ci.yml`
- **再現手順**: docs と CI を照合。
- **観測結果**: 自動 a11y テストなし。`tests/visual` はコントラスト検査の言及はあるが、visual baseline のみ。
- **期待結果**: 「確認した範囲」と「未確認」を分け、監査日・方法・対象を書く。
- **根本原因**: 監査記録が docs に固定されておらず、CI と連動していない。
- **修正方針**: 文言を「設計方針」と「確認済み範囲」に分ける。axe を主要ページに追加する。
- **回帰テスト**: axe の重大違反 0 を CI で検査。
- **完了条件**: 主張と検証が一致する。
- **依存関係**: RR-018。

### P3

#### RR-020: `FileSystemContentSource` の「content directory が見つからない」ヒントが相対パスで出ない

- **Severity**: P3
- **Confidence**: High（Windows で再現）
- **問題**: `isMissingDirectoryError` が `error.path === directory` の厳密比較を行うため、`new FileSystemContentSource("content")` のように相対パスを渡すと、`error.path` は絶対パスになり一致せず、親切なエラーにならない。
- **影響範囲**: カスタム `ContentSource` / 直接 API 利用時のエラーメッセージ。
- **発生条件**: 相対ディレクトリで content が見つからないとき。
- **ファイルと箇所**: `packages/node/src/file_system_content_source.ts:250-260`
- **再現手順**: `new FileSystemContentSource("missing", []).scan()`
- **観測結果**: 素の ENOENT。`path.resolve` した絶対パスでは親切なエラー。
- **期待結果**: 常に `missingContentDirectoryError`。
- **根本原因**: パス比較が正規化されていない。
- **修正方針**: `path.resolve(directory)` と `path.resolve(error.path)` を比較する。Windows の case / separator も `path.normalize` で揃える。
- **回帰テスト**: 相対・絶対・末尾スラッシュ・Windows 区切り。
- **完了条件**: すべてで同じヒント。
- **依存関係**: なし。

#### RR-021: `doctor --fix` が実質 no-op

- **Severity**: P3
- **Confidence**: High（コード読解）
- **問題**: `--fix` / `--dry-run` は renderer に渡るが、「No safe automatic fixes are available.」と表示するだけ。
- **影響範囲**: CLI の期待値。
- **発生条件**: `doctor --fix`。
- **ファイルと箇所**: `packages/cli/src/commands/doctor_renderer.ts:80-91`
- **再現手順**: `doctor --fix`
- **観測結果**: 修正は行われない。
- **期待結果**: オプションを削除するか、実際に安全な修正を実装する。
- **根本原因**: UI だけ先行している。
- **修正方針**: 現時点では help から `--fix` を外し、「自動修正はない」と明記する。
- **回帰テスト**: なし。
- **完了条件**: オプションの説明と挙動が一致。
- **依存関係**: なし。

#### RR-022: 内部設計ドキュメントの CLI 一覧が古い

- **Severity**: P3
- **Confidence**: High
- **問題**: `docs/agents/build-and-cli.md` のコマンド一覧に `content`、`migrate`、`theme preview`、`plugin dev`、`plugin verify`、`publish`、`inspect assets/provenance` がない。
- **影響範囲**: 内部開発者のオンボーディング。
- **ファイル**: `docs/agents/build-and-cli.md`
- **修正方針**: 公開 CLI Reference と同じ一覧に更新する。
- **完了条件**: 内部 docs と CLI help が一致。
- **依存関係**: RR-013。

#### RR-023: Biome の警告 13 件 / info 3 件

- **Severity**: P3
- **Confidence**: High（実行）
- **問題**: `pnpm check` は exit 0 だが、未使用変数（`packages/core/src/cli/parse.ts:96`）、`void` union（`packages/core/src/cli/types.ts:96`）、`{}` デフォルト型などが残る。
- **影響範囲**: コード衛生。
- **修正方針**: 個別に修正。`{}` は `Record<string, never>` 等へ。
- **完了条件**: 警告 0。
- **依存関係**: なし。

#### RR-024: 生成 CSS の `@theme` が lightningcss で unknown at-rule になる

- **Severity**: P3
- **Confidence**: Medium（統合ビルドのログで確認）
- **問題**: `tests/content-mutation` のビルドで `[lightningcss minify] Unknown at rule: @theme` が出る。Tailwind の `@theme` を前提とした CSS が、Tailwind 以外の経路で処理されている可能性がある。
- **影響範囲**: テーマのフォントトークンが本番 CSS から落ちる可能性。
- **発生条件**: 統合テストのサイトビルド。
- **ファイルと箇所**: 生成される `app/.riebeckite/theme-styles.css`、`packages/integrations/honox` の CSS 生成
- **再現手順**: `tests/content-mutation` の integration を実行。
- **観測結果**: unknown at-rule 警告。ビルドは成功。
- **期待結果**: 警告なし、または `@theme` を Tailwind に渡す。
- **根本原因**: 未確定。
- **修正方針**: 生成 CSS の `@theme` が Tailwind の処理対象に入るか確認する。入らないなら `:root` の CSS 変数へ変換する。
- **回帰テスト**: 生成 CSS に `--rb-font-body` が残ることを確認。
- **完了条件**: 警告が消え、トークンが出力される。
- **依存関係**: なし。

#### RR-025: 大規模ファイル・wildcard export の advisory 警告

- **Severity**: P3
- **Confidence**: High（`check:source-health`）
- **問題**: 66 ファイルが 400 行以上、14 ファイルが 800 行以上。`core/index.ts`、`core/src/cli/index.ts`、`runtime/client.ts`、`runtime/index.ts` に wildcard export がある。行数だけでは問題としないが、公開 API の境界が広い。
- **影響範囲**: 変更影響範囲、API 契約の安定性。
- **ファイル**: `packages/core/src/content/content_manager.ts`（1,100 行）、`plugin_runtime.ts`（1,055 行）、`packages/node/src/file_system_content_migration.ts`（1,588 行）、`builder.ts` ほか
- **修正方針**: wildcard export を明示 export に変え、公開 API を固定する。巨大ファイルは変更理由ごとに分割する（行数だけを理由にしない）。
- **完了条件**: 公開 export が明示的で、source-health の strong warning が減る。
- **依存関係**: なし。

---

## D. Architecture Findings

### D.1 良い点

- `docs/agents/architecture.md` の依存方向（App → Integration → Core、Plugin → Core、Theme → Core）と実際の package.json 依存に、今回の走査では違反は見つからなかった。
- `check:source-health` は実行時 import cycle と Core/Plugin/Integration の越境を検出し、exit 0。実際に循環しているのは **ビルド順序の devDependency** であり、実行時 import ではない。
- ContentSource（scan/read）と ContentManager（解釈・pipeline・manifest・graph）の責務分離は維持されている。
- Build-time の `.riebeckite` と Worker runtime は分離されている。`apps/web/dist/worker.js` に `node:fs` は含まれていない。
- Mutation が書き込みを所有し、Migration が「何を変えるか」を持つ分担は、final-foundations の統合テストで機能している。
- Theme は presentation-only の契約を守り、テーマパッケージに ContentManager への依存はない。

### D.2 構造上の問題

1. **CLI → HonoX → Inspector → HonoX** のパッケージ循環（RR-001）。HonoX が開発用 Inspector を runtime dependency に持つのが原因。Inspector は HonoX の内部実装ではなく、Vite plugin の消費者として分離すべき。
2. **Core の main entry が Node built-ins に依存**している（`node:fs`、`node:path`、`node:os`、`node:crypto`）。`./client` は分離されているが、`@riebeckite/core` の main を browser/Worker で import すると壊れる。ドキュメント上は「framework-independent」なので、`./node` サブパスへ分離するか、Worker 用の明示 export を設けるべき。
3. **CLI の依存が重い**。`@riebeckite/cli` は core / node / honox / ui / theme-default / 4 plugins / create-riebeckite / test を runtime dependency に持つ。scaffold と plugin preview に必要とはいえ、展開後 約6MB（tarball 1.65MB）は「CLI だけ入れたい」利用者には過大。optional peer / dynamic import を検討する価値がある。
4. **公開 API の wildcard export**。`export *` は内部型の漏出と semver 負担を生む。公開パッケージの API Reference と実 export を突き合わせるテストが必要。

### D.3 変更理由ごとの分割

`content_manager.ts`、`plugin_runtime.ts`、`file_system_content_mutation.ts`、`file_system_content_migration.ts` は大きいが、いずれも単一の変更理由（content orchestration、plugin orchestration、mutation journal、migration planning）に集中している。行数だけを理由に分割しない判断は妥当。ただし `content_manager.ts` は manifest assembly / graph / publishing の境界が再び混ざり始めているので、次に触るときは `manifest_assembler.ts` / `content_output_resolver.ts` との責務を確認する。

---

## E. Missing Tests

現状のテストで保証できない振る舞い:

1. **全プラグインの clean vs incremental 等価性**。final-foundations は 8 ページの限定 fixture で、search / hover-preview / taxonomy / feed の全出力を比較していない。RR-009 の search-data 不一致を検出できない。
2. **Hover Preview の公開境界**。テストは unlisted を含むことを assert しており、docs の boundary と逆。除外の回帰テストがない（RR-005）。
3. **設定ローダーのプラグイン依存解決**。excalidraw + pnpm workspace / npm hoist の両方で `doctor` を実行するテストがない（RR-007）。
4. **CLI グループの `--help`**。`content --help`、`content create --help` の exit code と出力（RR-013）。
5. **`FileSystemContentSource` の相対パス / Windows パス**（RR-020）。
6. **`doctor` の content 不在時のエラー件数**。3 件が正しいのか 2 件が正しいのか仕様化されていない（RR-004）。
7. **`create-riebeckite` の schedule 有効 / 無効**（RR-010）。
8. **Mutation の同時実行 stress**。stale lock の 3 プロセス競合を 20 回繰り返すテストがない（RR-011）。
9. **`test:registry` の Windows 実行**（RR-012）。
10. **テーマの light/dark/mobile 視覚回帰を CI で実行**するジョブがない（RR-018）。
11. **アクセシビリティ（axe / Lighthouse）**。docs の「audited surface」を裏付ける自動テストがない（RR-019）。
12. **Cloudflare Workers / GitHub Pages の実デプロイ**。ビルド成果物の検証はあるが、実環境のルーティング・404・リダイレクト・CSP は未検証。
13. **Linux 実機**。CI の cross-platform は core と honox の Windows のみで、CLI / mutation / path の Linux 検証がない。
14. **Obsidian の CALENDAR、PDF ページ、音声再生、Excalidraw の実ブラウザ**。単体の構文テストはあるが、ブラウザ動作は未検証。
15. **公開済み npm バージョンと docs の同期**。release test がない（RR-008）。

---

## F. Release Gate

### MUST FIX（これなしに正式リリースしない）

- RR-001 ビルド循環
- RR-002 Inspector の公開 / external E2E
- RR-003 typecheck
- RR-004 CLI doctor テスト
- RR-005 unlisted の公開 JSON 混入
- RR-006 セキュリティ文書の誤記
- RR-007 CLI 設定読込の lz-string
- RR-008 公開 npm と docs の不一致（次バージョン公開または docs の明示）
- RR-009 clean / incremental の search-data 一致（再現・修正・証明）

### SHOULD FIX

- RR-010 create-riebeckite テスト
- RR-011 Mutation flake
- RR-012 Windows registry test
- RR-013 `content --help`
- RR-014 フル SSG 性能
- RR-015 visibility docs
- RR-016 moderate 依存
- RR-017 Actions SHA 固定
- RR-018 テストマトリクス
- RR-019 a11y の主張と検証

### CAN DEFER

- RR-020 相対パスのヒント
- RR-021 `doctor --fix`
- RR-022 内部 docs の更新
- RR-023 Biome 警告
- RR-024 `@theme` 警告
- RR-025 大規模ファイル / wildcard export

### INTENTIONALLY ACCEPTED（現時点で許容する判断）

- Markdown の raw HTML を許可リスト方式でサニタイズすること（Obsidian 互換の一部を犠牲にするが、セキュリティ上妥当）。ただし docs を直すこと。
- `@riebeckite/core` の main entry が Node 前提であること（`./client` を browser 用に使う設計）。ただし docs と export 条件を明確にする。
- `@riebeckite/cli` が scaffold 用に複数プラグインへ依存すること（配布サイズは許容範囲）。ただし展開後 約6MB は監視する。

### UNVERIFIED（PASS にしない）

- ブラウザ実挙動（Chrome 起動不可）
- Linux 実機
- Cloudflare Workers / GitHub Pages への実デプロイ
- 5,000 ノートのフル SSG
- 83 プラグインの全組み合わせ
- テーマの視覚回帰（CI 外）
- アクセシビリティ監査
- npm publish 後の registry 伝播

---

## G. Remediation Roadmap

### Step 1: ビルドと配布の復旧（最優先）

1. RR-001: Inspector の devDependency を外すか、ビルドグラフから devDependency を除外する。`pnpm build:packages` を通す。
2. RR-002: Inspector を external E2E の pack 対象と release 対象に追加する。`pnpm test:e2e:external` を通す。
3. RR-008: 次バージョンを決定し、`scripts/release.mjs` で公開する。公開までは docs に「unreleased」を明示する。

### Step 2: 型・テスト・CLI の復旧

4. RR-003: `frontmatter-transformer` テストの型を修正。
5. RR-004: doctor の 3 件が正しいか仕様化し、テストを合わせる。
6. RR-007: excalidraw の `createRequire` を静的 import / プラグイン基準解決へ変更。`doctor` / `inspect` を通す。
7. RR-013: `content` グループの help を実装。
8. RR-010 / RR-012: create / registry テストを修正。

### Step 3: 公開境界とセキュリティ文書

9. RR-005: hover-preview を `discoverableEntries` に限定するか、unlisted を含める明確な非公開境界を設計する。デフォルトは除外。
10. RR-006: security.md / ja を sanitizer の実装に合わせて書き直す。
11. RR-015: visibility docs を `publish` / `visibility` / `publishAt` に統一。
12. RR-016 / RR-017: 依存更新と Actions SHA 固定。

### Step 4: 決定性と性能

13. RR-009: showcase 1,000 の no-change を再現し、search-data の差分を修正。全出力の clean/incremental 等価性を CI に入れる。
14. RR-014: SSG の span を分離し、no-change の Vite/SSR コストを削減する。目標値を決めて benchmark を継続記録する。

### Step 5: 品質の底上げ

15. RR-018: テーマ視覚回帰を CI の dedicated job に。代表プラグインの組み合わせを final-foundations に追加。
16. RR-019: axe を主要ページに追加し、docs の「audited surface」を検証と一致させる。
17. RR-020〜RR-025: 余裕のあるタイミングで解消。

### 根本原因ごとのまとめ

- **配布グラフの不整合**: RR-001、RR-002、RR-008。release 対象・依存・E2E の三つを同期させる仕組みが必要。
- **設定ローダーとプラグイン依存**: RR-007、RR-013。workspace / npm / pnpm の解決差を吸収するテストが必要。
- **公開境界の設計と文書**: RR-005、RR-006、RR-015。`discoverable` / `routable` / 生成物の境界を一つの表で管理する。
- **テストの赤化と flake**: RR-003、RR-004、RR-010、RR-011、RR-012。CI を緑に戻すだけでなく、テストの前提を実装と同期させる。
- **性能**: RR-009、RR-014。Core ではなく SSG / Vite 側の計測を増やす。

---

## 補足: 実行ログ（抜粋）

```
$ pnpm build:packages
build:packages failed: Circular dependency among public packages; build order is undefined.

$ pnpm typecheck
packages/plugins/frontmatter-transformer/test/plugin.test.ts(79,5): error TS2322
packages/plugins/frontmatter-transformer/test/plugin.test.ts(80,5): error TS2322
packages/plugins/frontmatter-transformer/test/plugin.test.ts(179,7): error TS2769
[typecheck] 3 type error(s) in 3 projects

$ pnpm --filter @riebeckite/cli test
ℹ tests 212
ℹ pass 210
ℹ fail 1
✖ doctor JSON output is machine-readable ... 3 !== 2

$ pnpm --filter create-riebeckite test
✖ scaffold ... {{schedule}} ... actual vs expected

$ pnpm test:release
ℹ tests 28
ℹ pass 8
ℹ fail 20
（すべて循環依存が原因）

$ pnpm test:e2e:external
npm error 404 Not Found - GET https://registry.npmjs.org/@riebeckite%2fhonox-inspector
[external-site] FAIL: npm install

$ pnpm audit --prod
2 vulnerabilities found
Severity: 2 moderate
```

```
Core benchmark (Windows, Node 24.22.1, i7-14700KF):
baseline 1000: cold 3541ms / warm 847ms / single-edit 681ms / RSS 439MB
realistic 1000: cold 4777ms / warm 819ms / single-edit 892ms / RSS 483MB
baseline 5000: cold 21011ms / warm 4830ms / single-edit 4755ms / RSS 680MB
realistic 5000: cold 30568ms / warm 5260ms / single-edit 3922ms / RSS 912MB
```

```
final-foundations integration:
baseline     c75f3c38...
incremental  3e7ff250...
no-change    3e7ff250...
clean        3e7ff250...
rollback     c75f3c38...
（8 ページの fixture では一致）
```

```
Hover Preview (final-foundations .work):
/n/calculator | Calculator
/ja/n/legacy | レガシーノート
/guides/legacy | Legacy Note
/notes/other | Other Note
/n/home | Home
/n/unlisted | Unlisted Post   ← unlisted が公開 JSON に含まれる
```

---

## 監査の限界

この監査は「コードと実行結果の照合」であり、セキュリティの専門的なペネトレーションテストではありません。XSS / SSRF / 認可の網羅的な攻撃検証、Cloudflare 本番環境の実挙動、全プラグインの組み合わせ、Linux 実機、ブラウザ実挙動は未検証です。したがって、本レポートで「問題なし」としていない領域は PASS ではなく **UNVERIFIED** と読んでください。

---

## H. 修正後の再監査（2026-11-02）

### H.1 最終判定

**CONDITIONAL**。

- P0: 0 件。
- P1: 9 件。うち 8 件はコード修正と実行検証で解消。RR-008（npm 0.0.35 と HEAD の差）は、本作業で禁止されている次バージョン公開が完了するまで解消しない。
- 追加で発見した P1 相当 2 件（RR-026 HonoX 0.1.56 の依存走査による registry テスト crash、RR-028 HonoX バージョン分裂による外部サイトの `No context found`）は、HonoX 0.1.62 への統一で解消。
- P2: 10 件。4 件を修正、6 件は未修正または未検証。
- P3: 6 件。主に保守性・警告・内部文書。
- コード品質ゲート（build / typecheck / lint / docs / cycles / 主要テスト / registry / 外部 tarball インストール / アプリ本番ビルド）は通過。
- 視覚回帰、5,000 ノート SSG、Linux 実機、公開 npm からの新規導入は未検証または失敗のまま。

したがって「第三者が npm から入れて docs どおり動かせる」ことの証明はまだ完了していません。READY にはしません。

### H.2 P1 の修正と検証

#### RR-001: パッケージ循環依存

- **根本原因**: `@riebeckite/honox` が `@riebeckite/honox-inspector` を runtime dependency に持ち、Inspector が `@riebeckite/honox` を devDependency に持っていた。`scripts/build_packages.mjs` は dependencies + devDependencies + peerDependencies をトポロジカルソートするため、`cli → honox → honox-inspector → honox` が循環になった。
- **修正内容**:
  - `packages/core/src/development_trace.ts` を新設し、`createDevelopmentTrace` の実装を Core へ移動。`packages/core/index.ts` から公開。
  - `packages/integrations/honox/src/development_trace.ts` は Core からの re-export に変更。
  - `packages/integrations/honox-inspector/package.json` から `@riebeckite/honox` devDependency を削除。Inspector のテストは Core の `createDevelopmentTrace` を使用。
  - `scripts/check_package_cycles.mjs` を新設。依存グラフと実行時依存グラフの両方を検査し、循環パスを表示する。
  - `package.json` に `check:cycles`、`.github/workflows/ci.yml` の check ジョブに `pnpm check:cycles` を追加。
- **変更ファイル**: `packages/core/src/development_trace.ts`、`packages/core/index.ts`、`packages/integrations/honox/src/development_trace.ts`、`packages/integrations/honox-inspector/package.json`、`packages/integrations/honox-inspector/test/development_inspector.test.ts`、`scripts/check_package_cycles.mjs`、`package.json`、`.github/workflows/ci.yml`
- **回帰テスト**: `pnpm check:cycles`。依存グラフと runtime グラフの両方で循環 0 を強制する。CI でも実行。
- **検証結果**: `package dependency graph is acyclic (114 packages). runtime dependency graph is acyclic (114 packages).` / `pnpm build:packages` 114/114 成功（exit 0）。
- **コミット**: なし（作業ツリー）。
- **残留リスク**: Windows で並列ビルド時に V8 access violation（`0xC0000005`）が断続的に発生したため、`scripts/build_packages.mjs` の既定並列度を 6 から 2 に下げた。ビルド時間は増える。根本原因は V8 / 環境側の可能性が高く、完全には特定していない。
- **未検証**: GitHub Actions の runner での並列ビルド再現性。

#### RR-002: 未公開 Inspector による外部インストール失敗

- **根本原因**: `tests/external-site/fixture-spec.ts` の `PACKAGES` が `@riebeckite/honox-inspector` と `@riebeckite/diagnostics` を含んでおらず、HEAD の HonoX が要求する依存が tarball セットに存在しなかった。 `scripts/package_metadata.mjs` 側には両パッケージが登録済みだったが、E2E の pack 対象と同期していなかった。
- **修正内容**: `fixture-spec.ts` に `packages/diagnostics` と `packages/integrations/honox-inspector` を追加。
- **変更ファイル**: `tests/external-site/fixture-spec.ts`
- **回帰テスト**: `pnpm test:e2e:external`。workspace のソースではなく、`npm pack` した tarball を一時ディレクトリへ install し、starter を build する。
- **検証結果**: `[external-site] PASS: external site built from published artifacts`。
- **コミット**: なし。
- **残留リスク**: npm レジストリ上には `@riebeckite/honox-inspector@0.0.35` が存在しないまま。次バージョンの公開順序（Inspector を HonoX より先に公開）を release スクリプトで保証する必要がある。
- **未検証**: 実 npm registry からの新規 install。E2E はローカル tarball のみ。

#### RR-003: `frontmatter-transformer` の型エラー

- **根本原因**: テストヘルパーの options / args が `Record<string, unknown>` で、CLI の `Readonly<Record<string, CliOptionValue>>` / `CliArgumentValue` と不一致。さらに `node:test` の `t.test` コールバックが `CliCommandResult` を返しており、`Promise<void>` と矛盾していた。
- **修正内容**: ヘルパーの型を CLI の値型へ変更し、`assert.rejects` のコールバックを `async` にして戻り値を `void` にした。実装側の型を緩めていない。
- **変更ファイル**: `packages/plugins/frontmatter-transformer/test/plugin.test.ts`
- **回帰テスト**: `pnpm typecheck`
- **検証結果**: `[typecheck] 3 projects OK (no type errors)`。
- **コミット**: なし。
- **残留リスク**: なし。
- **未検証**: なし。

#### RR-004: CLI `doctor` テストの 3 対 2

- **根本原因**: `collectDoctorReport` が `content.getManifest()` を asset inspection の try 内で呼んでいた。content directory 不在で manifest 取得が失敗すると、本来の `CONTENT_INSPECTION_FAILED` に加えて `ASSET_INSPECTION_FAILED` が発生し、同じ原因を二重計上していた。
- **修正内容**: manifest 取得を独立した try に分離。取得失敗時は content / output の診断だけを返し、asset inspection を実行しない。期待値を 3 に変えるのではなく、診断の重複を実装側で解消した。
- **変更ファイル**: `packages/cli/src/commands/doctor.ts`
- **回帰テスト**: `packages/cli/test/dist_smoke.test.ts` の doctor JSON テスト。
- **検証結果**: `pnpm --filter @riebeckite/cli test` = 212 tests、211 pass、1 skipped、0 fail（38s）。doctor は `summary.errors === 2`。
- **コミット**: なし。
- **残留リスク**: content 不在時の診断コードの仕様がテスト以外に明文化されていない。
- **未検証**: 実プロジェクトの多様な破損状態。

#### RR-005: Hover Preview の unlisted 露出

- **根本原因**: `packages/plugins/hover-preview/index.ts` が `manifest.routableEntries` を index の入力にしていた。`routableEntries` は public + unlisted を含むため、unlisted のタイトル・slug・本文 HTML が公開 JSON `/_riebeckite/hover-preview/index.json` に出力されていた。
- **修正内容**: `manifest.discoverableEntries` に変更。unlisted は直接 URL では引き続き閲覧できるが、hover index には含めない。プラグインのテストと final-foundations の assert を「unlisted は index に無い / 直接ページは存在する」に更新。EN/JA の hover-preview ドキュメントも明記。
- **変更ファイル**: `packages/plugins/hover-preview/index.ts`、`packages/plugins/hover-preview/test/hover-preview.test.ts`、`tests/final-foundations/integration.ts`、`docs/docs/plugins/hover-preview.md`、`docs/docs/plugins/hover-preview.ja.md`
- **回帰テスト**: hover-preview 4/4、final-foundations の baseline / incremental 両方で `unlisted === false` かつ `dist/n/unlisted.html` が存在することを確認。
- **検証結果**: `pnpm --filter @riebeckite/plugin-hover-preview test` 4/4。final-foundations 成功。
- **コミット**: なし。
- **残留リスク**: 他の将来プラグインが `routableEntries` を discovery surface に使う誤用を防ぐ型レベルの仕組みはない。`discoverableEntries` を使う規約とレビューに依存する。
- **未検証**: 全生成物のバイト単位の secret 検査（自動マーカー検査は一部）。

#### RR-006: セキュリティ文書の raw HTML 記述

- **根本原因**: `docs/docs/security.md` と `.ja.md` が「raw HTML はサニタイズされない」と説明していたが、実装は `remark-rehype` → `rehype-raw` → `rehype-sanitize(markdownSanitizeSchema)` を通す。文書が実装より古かった。
- **修正内容**: EN/JA を実装に合わせて書き直した。Markdown 由来の HTML は allowlist でサニタイズされ、script / event handler / 危険な URL は除去されること、プラグインがパイプライン後に生成する HTML は信頼済みコードとして扱われサニタイズ対象外であることを明記。`writing-a-plugin` の該当箇所も同期。
- **変更ファイル**: `docs/docs/security.md`、`docs/docs/security.ja.md`、`docs/docs/plugins/writing-a-plugin.md`、`docs/docs/plugins/writing-a-plugin.ja.md`
- **回帰テスト**: obsidian-markdown の sanitization テスト（既存）と、ドキュメントの英日 parity（`pnpm check:docs`）。
- **検証結果**: `pnpm check:docs` = 1,204 markdown、83 plugin docs、28 theme READMEs が整合。
- **コミット**: なし。
- **残留リスク**: 文書と実装の乖離を自動検出するテストはない。
- **未検証**: 外部セキュリティレビュー。

#### RR-007: `lz-string` の設定読込失敗

- **根本原因**: `packages/plugins/excalidraw/src/parse.ts` が `createRequire(import.meta.url)` だけで `lz-string` を解決していた。CLI の設定ローダーがプラグインを esbuild で一時 `.riebeckite-config-*/config.mjs` に inline すると `import.meta.url` が一時ディレクトリを指し、pnpm の hoist されていない `lz-string` を解決できなかった。
- **修正内容**: 解決基準を `import.meta.url`、プロジェクト cwd、`@riebeckite/plugin-excalidraw` の実エントリの順にフォールバックするローダーへ変更。`createRequire` は維持し、Vite SSR が CJS の `module.exports` を正しく返す経路を壊さない。`apps/web` には source 条件ビルド用に `lz-string` を明示依存として追加。dist ではプラグイン自身の依存として解決する。
- **変更ファイル**: `packages/plugins/excalidraw/src/parse.ts`、`apps/web/package.json`、`pnpm-lock.yaml`
- **回帰テスト**: CLI の `inspect config` / `doctor` 実行、`packages/plugins/excalidraw/test/*.test.ts`、`pnpm --filter @riebeckite/web build`。
- **検証結果**: `node packages/cli/dist/cli.js inspect config` が lz-string エラーなしで成功（exit 0）。Excalidraw テスト 5/5。`pnpm --filter @riebeckite/web build` が client / SSR とも成功（SSR 25.9s）。
- **コミット**: なし。
- **残留リスク**: 設定ローダーがプラグインを inline する設計自体は残る。`createRequire` の解決基準を追加したが、極端に隔離された node_modules 構成では未検証。
- **未検証**: npm install 後の hoist されない環境での全プラグイン設定読込。

#### RR-008: npm 0.0.35 と HEAD の不一致

- **根本原因**: `v0.0.35` タグ以降に 275 コミットあり、Content Mutation / Migration / Publication Workflow / Inspector が未公開。公開サイトは HEAD の機能を説明している。
- **修正内容**: コード修正ではなく、`docs/docs/getting-started/installation.md` / `.ja.md` に「公開 npm バージョンは HEAD より古い場合がある」旨を追加し、`docs/docs/framework/release.md` / `.ja.md` に「Documentation and npm versions」節を追加。次回リリースで docs と npm を同期する運用を明記。
- **変更ファイル**: 上記 4 ファイル、`docs/docs/releases.md` / `.ja.md`（並行作業）、`CHANGELOG.md`、`changes/`
- **回帰テスト**: なし（公開後に `npm view` と docs の機能一覧を照合する自動テストが必要）。
- **検証結果**: 文書の注意書きのみ。npm registry は依然 `0.0.35`、`@riebeckite/honox-inspector` は 404。
- **コミット**: なし。
- **残留リスク**: **これが最大の未解決 P1**。次バージョンを公開するまで、第三者は docs の高度な機能を npm から利用できない。
- **未検証**: 次バージョンの release / publish 手順全体。

#### RR-009: 1,000 ノートの clean / incremental 不一致

- **根本原因**: `packages/plugins/search/src/search-index.server.ts` がタイトルのみでソートし、同一タイトルのエントリで manifest 順に依存していた。manifest の順序が clean と incremental で異なると `search-data.json` のバイト列が変わった。過去の 1,000 ノート差分には、サーバー再起動に起因すると思われる HTML の 1 文字破損も混在していた。
- **修正内容**: 検索索引のソートに `permalink` のタイブレーカーを追加（`localeCompare(..., "en")`）。同一タイトルの逆順入力でも安定する回帰テストを追加。
- **変更ファイル**: `packages/plugins/search/src/search-index.server.ts`、`packages/plugins/search/test/search-index.test.ts`
- **回帰テスト**: `buildSearchItems is deterministic for duplicate titles`（逆順入力で `/a/page`, `/z/page`）。
- **検証結果**: `pnpm --filter @riebeckite/plugin-search test` 27/27。1,000 ノートのフル SSG を再実行し、cold / no-change の双方で `equivalence.equivalent === true`、`differences: []`。cold 102.3s / RSS 2,680MB、no-change 31.1s / RSS 1,506MB。結果は `%TEMP%\riebeckite-ssg-final\2026-11-01T23-37-25-915Z-preset-ssg.{json,md}`。
- **コミット**: なし。
- **残留リスク**: 5,000 ノートは未実行。SSG のフルビルドは依然として高メモリ（1,000 ノートで 2.7GB）。
- **未検証**: 5,000 ノート、Linux、Cloudflare 本番。

### H.3 P2 / P3 の状態

| ID | 重要度 | 状態 | 内容 |
|---|---|---|---|
| RR-010 | P2 | 修正済み | `create-riebeckite` の `{{schedule}}` テストを現行テンプレートに合わせ、`scaffold_catalog` の列挙から `node_modules` / dot dir を除外。80/80 pass |
| RR-011 | P2 | 未修正 | Node の stale lock 競合テストが負荷時に flaky。単独 8/8、全体 rerun 72/72。修正は競合そのものの仕様化が必要 |
| RR-012 | P2 | 修正済み | `scripts/run_registry_e2e.mjs` に Windows の `shell: true` を追加 |
| RR-013 | P2 | 未修正 | `riebeckite content --help` が usage error。グループ help の実装が必要 |
| RR-014 | P2 | 未修正（計測更新） | 1,000 ノート full SSG は cold 102s / no-change 31s。履歴の 66.8s no-change より改善したが、依然重い |
| RR-015 | P2 | 修正済み | `visibility` / `publish` / `publishAt` / `published` の glossary を実装に合わせて EN/JA 修正 |
| RR-016 | P2 | 未修正 | `pnpm audit --prod` の moderate 2 件（`@hono/node-server`、`minimatch`） |
| RR-017 | P2 | 未修正 | GitHub Actions はタグ固定のまま。SHA 固定ではない |
| RR-018 | P2 | 未修正 / 失敗 | 15 テーマにテストディレクトリなし。`test:visual` は 36 画像差分で失敗（ベースライン未更新）。CI にも未組み込み |
| RR-019 | P2 | 未修正 | アクセシビリティ「audited」の主張に対する axe / Lighthouse 証拠なし |
| RR-020 | P3 | 未修正 | 相対 content directory で missing-directory ヒントが出ない |
| RR-021 | P3 | 未修正 | `doctor --fix` は「No safe automatic fixes」のみ |
| RR-022 | P3 | 未修正 | `docs/agents/build-and-cli.md` のコマンド一覧が古い |
| RR-023 | P3 | 未修正 | `pnpm check` は exit 0 だが 13 warnings / 3 infos |
| RR-024 | P3 | 未修正 | lightningcss の `@theme` unknown at-rule 警告 |
| RR-025 | P3 | 未修正 | 大型ファイル / wildcard export の advisory 警告（119 件） |

### H.4 実行した最終ゲート

| ゲート | 結果 |
|---|---|
| `pnpm build:packages` | PASS（114/114、既定並列度 2） |
| `pnpm typecheck` | PASS（3 projects OK） |
| `pnpm check` | PASS（exit 0、13 warnings / 3 infos） |
| `pnpm check:cycles` | PASS（依存 / runtime とも 114 パッケージで循環 0） |
| `pnpm check:docs` | PASS（1,204 markdown、83 plugin docs、28 theme READMEs） |
| `node scripts/check_packages.mjs` | PASS（114 public packages） |
| `pnpm test:e2e:external` | PASS（tarball から新規 install / build） |
| CLI tests | PASS（211 pass / 1 skip / 0 fail） |
| core tests | PASS（474） |
| search plugin | PASS（27） |
| hover-preview | PASS（4） |
| inspector | PASS（12） |
| create-riebeckite 単独 | PASS（80） |
| final-foundations | PASS（Mutation → Migration → Manifest → Derived → SSG → Publication → Provenance） |
| 1,000 ノート clean / no-change | PASS（equivalence true、differences []） |
| `pnpm -r test` | FAIL（create-riebeckite の 2 契約が Windows `0xC0000005` で異常終了。単独では 80/80） |
| `pnpm test:registry` | PASS（HonoX 0.1.62 更新後、194 tests / 90.3s） |
| `pnpm test:visual` | FAIL（36 画像差分、ベースライン未更新） |
| `pnpm --filter @riebeckite/web build` | PASS（client / SSR、2026-11-02 再実行） |
| Excalidraw plugin tests | PASS（5/5） |
| ブラウザ suites | PASS（search 16、SPA 6、inspector 1、plugin-dev 3、runtime browser 8、runtime site 4。Chrome 起動可） |
| 5,000 ノート full SSG | 未実行 |
| Linux 実機 | 未実行 |
| npm publish / 実デプロイ | 未実行（禁止） |

### H.5 リリースゲート（最終）

**MUST FIX（リリース前に必須）**

1. RR-008: 次バージョンを公開し、`@riebeckite/honox-inspector` を HonoX より先に公開する。公開後に `npm view` と docs の機能一覧を照合する。
2. 視覚回帰の 36 差分を評価する。CSS の意図した変更ならベースラインを更新し、意図しないなら修正する。未評価のまま公開しない。
3. Linux 実機で build / test / external install を 1 回通す。公称プラットフォームの検証なしに Linux 対応を主張しない。

（RR-026 の HonoX registry crash は 0.1.62 への更新で解消済み。MUST から除外。）

**SHOULD FIX**

1. RR-013 `content --help`。
2. RR-016 moderate 2 件の依存更新。
3. RR-017 Actions の SHA 固定。
4. RR-011 stale lock flaky の仕様化。
5. RR-018 テーマ視覚回帰の CI 組み込み。
6. 5,000 ノート full SSG の計測。

**CAN DEFER**

- RR-020、RR-021、RR-022、RR-023、RR-024、RR-025。
- RR-014 の更なる性能改善（現状は機能する）。

**INTENTIONALLY ACCEPTED**

- unlisted を直接 URL で閲覧可能にする仕様（discoverable からは除外）。
- プラグイン生成 HTML をサニタイズ対象外とする信頼境界（プラグインは信頼済みコード）。
- `doctor --fix` が安全な自動修正を持たないこと（誤修復より安全）。

**UNVERIFIED**

- 実 npm registry からの新規 install（publish 禁止のため）。
- 5,000 ノート SSG。
- Linux 実機。
- 全 83 プラグインの組み合わせ。
- アクセシビリティ（axe / Lighthouse）。
- Cloudflare Workers / GitHub Pages への実デプロイ。

### H.6 修正による副作用の確認

- 公開境界: `discoverableEntries` への変更は Hover Preview のみ。Search / Sitemap / Feed / Graph / Backlinks / Taxonomy / Recent / Related は既に discoverable を使用しており、変更していない。final-foundations で unlisted の直接ページが残ることを確認。
- 依存方向: `createDevelopmentTrace` の Core 移動は Core 内で完結し、Core が HonoX / Inspector に依存しないことを `check:cycles` で確認。
- HonoX バージョン: `@riebeckite/honox`、CLI、web、外部 fixture、scaffold テンプレート / golden を 0.1.62 に統一。重複 `contextStorage` を解消し、external E2E で確認。
- 設定ローダー: `lz-string` は `createRequire` の解決基準を cwd / プラグイン実エントリへ拡張。`inspect config` と `apps/web` の本番ビルドで確認。Excalidraw の dist は依存を external のまま維持し、利用側の解決に委ねる。
- テストの弱体化: 期待値の変更は RR-004 の重複診断の解消と RR-010 のテンプレート変数置換のみ。skip の追加・テスト削除・型チェック緩和は行っていない。`pnpm check` の warnings は元から存在するもので、抑制していない。
- 未コミット: 本作業の変更はすべて作業ツリーにあり、commit / push / publish は行っていない。HEAD は並行作業により `bb126fa6` まで進んだ。

### H.7 監査の再現性に関する注意

- この環境ではサーバー再起動が複数回発生し、実行中のベンチマーク結果 JSON が NUL バイトで埋まる事象があった。1,000 ノートの最終結果は再起動後に完走した個別実行のみを採用している。
- Windows で `build:packages` と `pnpm -r test` が断続的に `0xC0000005` で落ちた。単独実行では成功するため、コードの assertion 失敗ではなく環境 / V8 の並列実行問題として記録する。既定並列度を 2 に下げたが、CI での再現性は未確認。
- `pnpm test:registry` は 1 回目に `incremental_ssg.test.ts` が 11.5s で失敗し、再実行で 194/194 pass した。registry 経路には負荷依存の flake が残る。
- したがって、本レポートの PASS は「この環境で、このコマンドを、この順序で実行した結果」であり、すべての環境での再現を保証しない。

### H.8 修正中に発見・解消した追加 Finding

#### RR-026: HonoX 0.1.56 の依存走査が registry テストで `Map maximum size exceeded` を起こす

- **重要度**: P1（リリースゲートを塞いでいた）
- **Confidence**: High（再現・修正版の差分・テストで確認）
- **根本原因**: `honox@0.1.56` の `dist/vite/inject-importing-islands.js` にある `walkDependencyTree` が import グラフを再帰走査する際に visited set を持たず、循環または共有依存で同じノードを繰り返し展開していた。V8 の AsyncHook が `Map` 上限に達し、テストプロセスが crash した。
- **修正内容**: `honox` を `0.1.62` に更新。0.1.62 では `visited` Set、`depTreeCache`、`node_modules` skip が入っていることを `npm pack` した実物で確認した。
- **変更ファイル**: `apps/web/package.json`、`packages/cli/package.json`、`packages/integrations/honox/package.json`、`pnpm-lock.yaml`
- **回帰テスト**: `pnpm --filter @riebeckite/honox test`、`pnpm test:registry`。
- **検証結果**: honox 194/194 pass（83.6s）。`pnpm test:registry` 194/194 pass（90.3s）。以前 crash した `incremental_ssg` / `output_collision` / `svg_optimizer` の 3 ファイルも 13/13 pass。
- **コミット**: なし。
- **残留リスク**: 上流 0.1.62 への依存。将来の HonoX 更新で同種の走査が再発しない保証はない。
- **未検証**: GitHub Actions の Linux / macOS runner での registry E2E。

#### RR-027: Excalidraw の `lz-string` 解決が Vite SSR と CLI 設定ローダーで異なる

- **重要度**: P2（修正中に発見。ビルドを塞いだが P1 の RR-007 と同一原因）
- **Confidence**: High（web build の失敗・成功とテストで確認）
- **根本原因**: Vite SSR は `lz-string` を external 化し、CJS の `module.exports` を ESM namespace へ変換する。動的 import の戻り値は空 namespace になり、静的 namespace import も同じ理由で関数を持たなかった。一方、CLI の設定バンドルは `import.meta.url` が一時ディレクトリを指す。
- **修正内容**: `createRequire` を維持し、`import.meta.url` → cwd → `@riebeckite/plugin-excalidraw` 実エントリの順で解決するフォールバックを実装。`apps/web` に source 条件用の明示依存を追加。dist は external 依存のまま。
- **変更ファイル**: `packages/plugins/excalidraw/src/parse.ts`、`apps/web/package.json`、`pnpm-lock.yaml`
- **回帰テスト**: `pnpm --filter @riebeckite/plugin-excalidraw test`、`pnpm --filter @riebeckite/web build`、`inspect config`。
- **検証結果**: Excalidraw 5/5、web build 成功、`inspect config` 成功。
- **コミット**: なし。
- **残留リスク**: プラグインが Node 専用の CJS 依存を runtime に持つ設計。ブラウザ client entry では使っていないが、SSR external の挙動はバンドラ更新で変わりうる。
- **未検証**: esbuild / Vite 以外のバンドラ、npm hoist なしの極端な構成。

#### RR-028: HonoX 0.1.62 更新後、外部サイトで `HasIslands` が `No context found` になる

- **重要度**: P1（外部 tarball ビルドを阻害。修正中に発見）
- **Confidence**: High（一時 workspace を保持して再現・生成物を確認）
- **根本原因**: `@riebeckite/honox` は `honox@0.1.62` に依存する一方、外部 fixture と starter テンプレートが `honox@0.1.56` を固定していた。npm は両バージョンを別ディレクトリに配置し、`hono/jsx-renderer` の `contextStorage` と `HasIslands` が参照する `contextStorage` が別インスタンスになった。SSG のレンダリングで Hono コンテキストが見つからず、コンテンツページが `Internal Server Error` になった。
- **修正内容**: `tests/external-site/fixture/site/package.json`、`packages/create-riebeckite/src/scaffold/templates.ts`、scaffold golden 10 ファイルの `honox` を `0.1.62` に統一。バージョンを分散させない。
- **変更ファイル**: `tests/external-site/fixture/site/package.json`、`packages/create-riebeckite/src/scaffold/templates.ts`、`packages/create-riebeckite/test/__golden__/scaffold/*/package.json`
- **回帰テスト**: `pnpm test:e2e:external`（tarball から install / build）、`pnpm --filter create-riebeckite test`（golden 80 件）。
- **検証結果**: external E2E PASS。`dist/index.html`、`notes/index.html` 等が生成され、ホームマーカーを確認。create-riebeckite 80/80 pass。
- **コミット**: なし。
- **残留リスク**: HonoX のメジャー更新時に、利用者サイトの固定バージョンと `@riebeckite/honox` の依存が再び分裂しうる。`peerDependencies` 化または起動時バージョン検査が望ましい。
- **未検証**: 利用者が古い HonoX を固定した場合の互換性。
