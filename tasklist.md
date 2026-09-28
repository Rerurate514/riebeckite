| 順番 | ID | 作業 | 状態 | 規模 | 理由 |
|---:|---|---|---|---|---|
| 1 | A1 | Package公開境界を作る | ✅ 完了 | Large | 外部Plugin/Theme ecosystemの前提 |
| 2 | A1.5 | npm配布形式を完成させる | ✅ 完了 | Medium–Large | ESM + `.d.ts` + NodeNext + LICENSE + `pnpm pack` + external consumer検証済み |
| 3 | A1.6 | External Site Build E2E | ✅ 完了 | Medium | tarballのみで`check/doctor/inspect/build`、Bundler/NodeNext typecheckを保証 |
| **4** | **R1** | **Graph layout重複解消** | ✅ 完了 | Medium | `local-graph` / `garden-explorer`の共通実装を抽出（Phase 1） |
| 5 | R5 | Backlink走査共通化 | ✅ 完了 | Small | Core ContentGraphへ寄せる（Phase 1） |
| 6 | C5 | 画像コピーの増分化でbuild高速化 | ✅ 完了 | Small | `build_images.ts`が参照画像約100MBを毎回無条件コピー。検証buildを高速化（Phase 1） |
| 7 | R6 | clientEntries/endpoints規約 | ✅ 完了 | Small | Core helperとドキュメントで外部Plugin author向けの正解パターンを固定（Phase 1） |
| 8 | R7 | 共通ユーティリティをCoreへ集約 | ✅ 完了 | Medium | `uniqueStrings`(7箇所)/`escapeHtml`・`escapeHtmlAttribute`(6箇所)/`normalizeTag`(2箇所)の重複を解消（Phase 1） |
| 9 | R12 | 読了時間をCoreユーティリティ化 | ✅ 完了 | Small | `calculateReadingTime`を`seo`からCoreへ移し、`apps/web`のSEOプラグイン依存を解消（Phase 1） |
| 10 | R8 | 空CSS削除とlint warning解消 | ✅ 完了 | Small | 0バイトCSSと`@import`削除、`code-enhance/style.css`のnoDescendingSpecificity解消（Phase 1） |
| 11 | R9 | Package metadata規約の機械検証 | ✅ 完了 | Medium | `check:packages`で29公開packageのメタデータを検証。重複依存はpnpm catalogへ集約（Phase 2） |
| **12** | **A3/A4** | **Root / Config resolutionを一本化** | ✅ 完了 | Medium–Large | `projectRoot/appRoot/configRoot/contentRoot`を明確化。`workspaceRoot`の通常consumer依存を除去しCLI/HonoXでresolverを共有 |
| **13** | **A4.5** | **External HonoX/SSG境界を安定化** | ✅ 完了 | Medium | `@hono/vite-ssg` patchがnpm consumerへ伝播しない問題、cwd依存を解消 |
| **14** | **A5** | **External Content Source / Vault対応を保証** | ✅ 完了 | Medium | Site外のObsidian Vaultを正式サポート。`contentRoot`がproject外でも成立させる |
| **15** | **A5.5** | **Pluginのfilesystem直接依存を除去** | ✅ 完了 | Medium–Large | attachment/excalidraw/diff等をContentSource/Asset境界へ移行 |
| 16 | R2 | ContentManager責務分割 | ✅ 完了 | Medium | build調整・public location解決・entry読込を抽出し公開APIは不変（Phase 3 / A5.5後） |
| 17 | R10 | seoプラグイン分割 | ✅ 完了 | Small–Medium | 454行の`plugins/seo/index.ts`を`src/`へ分割しre-export化。公開API維持（Phase 3） |
| 18 | R11 | diagnostics analyze分割 | ✅ 完了 | Small–Medium | `plugins/diagnostics/src/analyze.ts`を`checks/`へ分割。`analyzeContent`はオーケストレータ化（Phase 3） |
| **19** | **A2** | **Plugin間の直接依存を排除** | ✅ 完了 | Medium | `garden-explorer → plugin-search`を切りPlugin独立性を確保 |
| **20** | **A6** | **HonoX UI primitiveの境界固定** | ✅ 完了 | Small | IntegrationがComponent Framework化するのを防ぎ、Site側の拡張境界を固定 |
| **21** | **A7** | **Site Application拡張contract** | ✅ 完了 | Medium | 外部Siteの`routes/components/islands/style`の所有・override方法を正式化 |
| **22** | **A8** | **Local Plugin / Local Theme対応保証** | 未着手 | Medium | Site内extensionとnpm版を同一contractで扱えることをE2E保証 |
| 23 | C1/C2 | Content Query API | 未着手 | Medium | tag/folder/date/frontmatter等の共通問い合わせ基盤 |
| 24 | F1 | Taxonomy / Collection / Archive | 未着手 | Medium | Query APIを利用してtag/archive等を汎用化 |
| 25 | P1 | provides/requires規約整備 | 未着手 | Medium | capability systemを実Pluginで利用可能に |
| **26** | **S1** | **Publish Boundary / Leak Check** | 未着手 | Medium | Private Vaultから非公開note/attachmentが公開artifactへ漏れないことを保証 |
| 27 | C3 | Incremental build依存改善 | 未着手 | Medium | asset依存・build state APIを整理。外部Vault CIにも重要 |
| 28 | P2 | Plugin CSS contract | 未着手 | Medium | `rb-<plugin>-*`等のstable styling hookを定義 |
| 29 | R4 | `startBuild` lifecycle整理 | 未着手 | Small | 複数経路から呼ばれる問題を整理 |
| **30** | **C4** | **HonoX高レベルhelper** | 未着手 | Medium | Vite/HonoX/SSR externals等の内部知識をconsumerから隠す |
| **31** | **D1** | **`create-riebeckite` / `riebeckite init`** | 未着手 | Large | 完成したSite Application contractからstarterを生成 |
| **32** | **D1.5** | **Cloudflare deployment template** | 未着手 | Medium | GitHub Actions + Workers Static Assetsの標準構成 |
| 33 | D2 | CLI config/scan重複削減 | 未着手 | Medium | command間のconfig/source解決重複を整理 |
| 34 | D3 | `inspect build`強化 | 未着手 | Small | invalid reason等を表示 |
| 35 | D4 | `doctor` build-state検証強化 | 未着手 | Medium | fingerprint不一致等を検出 |
| 36 | D5 | `profile` diagnostics対応 | 未着手 | Small | profile観測範囲を拡張 |
| 37 | D6 | CLI error renderer強化 | 未着手 | Small | error code/file/hint等を表示 |
| **38** | **D7** | **Dependency hygiene E2E** | 未着手 | Small–Medium | `apps/web`等のundeclared/hoisted dependency依存を検出 |
| 39 | D8 | 公開パッケージのREADME整備 | 未着手 | Small | `core`/`cli`/`integrations/honox`に`README_en.md`/`README_ja.md`が無い（他25パッケージは保有） |
| 40 | F2 | Pagination | 未着手 | Small | Query APIへoffset/limit等を追加 |
| 41 | — | Related Posts Plugin | 未着手 | Small–Medium | ContentGraphを利用 |
| 42 | — | OG Image Plugin | 未着手 | Medium | build時OG image生成 |
| 43 | — | Citation Plugin | 未着手 | Medium | 引用・参考文献管理 |
| 44 | — | Scheduled Publish表示Plugin | 未着手 | Small | PublishStrategyをUI/diagnosticsへ表示 |

## 優先度の考え方

1. **完了済み（#1–#3）**: 外部 ecosystem の基盤。変更時は再検証。
2. **リファクタリング Phase 1–2（#4–#11）を最優先**: 挙動を変えない低リスク整理と、検証buildの高速化。後続の A 系・Phase 3 の土台になり、作業コストあたりの効果が高い。`C5`（画像コピー増分化）を先頭付近に置き、以降の全 `pnpm build` 検証を軽くする。`R12`（読了時間の Core 化）は `R7`（Core ユーティリティ集約）と同じ性質のため Phase 1 に統合。
3. **A 系インフラ（#12–#15）**: 外部 consumer 成立の要（root 解決・SSG 境界・外部 Vault・filesystem 境界）。
4. **Phase 3（#16–#18）**: `R2` は A5.5 の境界確定後。`R10`/`R11` は独立した大型分割。
5. **A 系 contract（#19–#22）**: Plugin 独立性・UI/Site 拡張 contract。
6. **以降（#23–#44）**: Query/Taxonomy/Publish 保証 → CLI/開発体験 → 追加 Plugin。

## リファクタリング一掃の実施順（2026-09-28 計画）

- **Phase 1（低リスク重複解消・分離・検証高速化 / 最優先 #4–#10）**: R1 → R5 → `C5` → R6 → R7 → R12 → R8
- **Phase 2（パッケージ規約 / #11）**: R9
- **Phase 3（大型モジュール分割 / A5.5 の後 #16–#18）**: R2 → R10 → R11

横断方針:

- 共通ユーティリティは `@riebeckite/core` の index から公開（subpath追加なし。`core/package.json` の exports は `"."` のみ、`tsconfig` paths も `@riebeckite/core → packages/core/index.ts` で解決済み）。
- 各フェーズ後に `pnpm -r --filter "./packages/**" run build` → `pnpm build` → `pnpm exec biome lint .` → `pnpm test:e2e:external` で検証。`C5` 完了後は `pnpm build` の画像コピーがほぼゼロになる。
- パッケージ単位の変更は `pnpm run build:packages` + `pnpm test:e2e:external`（fixture vault は極小）で足りる。apps/web の画面確認が要る時のみ full `pnpm build`。
- 依存方向は `Application → Integration → Core`、`Plugin/Theme → Core` を厳守（Core に HonoX/Vite/plugin/app の逆依存を入れない）。
- 公開 URL は ContentManager の解決済み location/permalink からのみ導出する。
- `constants/paths.ts` / `client.ts`（apps/web ↔ tests/external-site fixture）の重複は意図的なため対象外。

## 実装詳細（Agent向け）

各項目は「概要 / 対象 / 実装方針 / 完了条件 / 検証 / 依存」で記述する。行番号は 2026-09-28 時点。編集前に必ず現物を再確認すること。

---

### #1 A1: Package公開境界を作る（✅ 完了）
- **概要**: 外部 Plugin/Theme ecosystem の前提として、各 package の公開エントリ（`exports`）と公開型を確定。
- **成果**: 各 package の `exports`（`"."`, `"./client"`/`"./components"`, `"./style.css"`）と `tsconfig` paths の対応。
- **備考**: 変更時は `scripts/build_package.mjs` が `exports` の `source` 条件からビルド対象を導出するため、`exports` 形の変更はビルド検証必須。

### #2 A1.5: npm配布形式を完成させる（✅ 完了）
- **概要**: ESM 出力＋`.d.ts`＋NodeNext 解決＋LICENSE 同梱＋`pnpm pack` を成立。
- **成果**: `scripts/build_package.mjs`（esbuild ESM + tsc emitDeclarationOnly）と `copy_license.mjs`、各 package の `files`/`prepack`/`publishConfig`。

### #3 A1.6: External Site Build E2E（✅ 完了）
- **概要**: tarball のみを standalone npm プロジェクトへ入れて `check/doctor/inspect/build` と Bundler/NodeNext typecheck を保証。
- **成果**: `tests/external-site/runner.mjs`、fixture `tests/external-site/fixture/site`（独自 `riebeckite.config.ts` と `typecheck/nodenext.ts`）。`pnpm test:e2e:external` で実行。

---

### #4 R1: Graph layout重複解消（✅ 完了 / Phase 1 / Medium / 依存なし）
- **概要**: `local-graph` と `garden-explorer` の `src/graph.ts` が byte 一致（各78行）で二重管理。共通実装を Core へ移設した。
- **成果**: `packages/core/src/content/graph_layout.ts` に統合。`@riebeckite/core` から `buildGraphEdges`/`layoutRadialGraph` を re-export。旧 `graph.ts` は削除。`local-graph/index.ts` は互換 re-export。

### #5 R5: Backlink走査共通化（✅ 完了 / Phase 1 / Small / 依存: R7 と同時可）
- **概要**: `published` フィルタ＋重複排除がプラグイン側に散在していたのを Core ContentGraph に寄せた。
- **成果**: `ContentGraph.filterNeighbors(slug, include)` を追加（`packages/core/src/content/content_graph.ts`）。`local-graph.server.ts`（上限 `MAX_NEIGHBORS_PER_DIRECTION=10` 維持）と `garden-explorer.server.ts` のフィルタ/dedupe を置換。
- **備考**: 内部 `uniqueStrings` は `#8 R7` で Core ユーティリティへ集約予定。

### #6 C5: 画像コピーの増分化でbuildを高速化（✅ 完了 / Phase 1 / Small / 依存なし）
- **概要**: `apps/web` の `prebuild`（`apps/web/scripts/build_images.ts`）が、参照画像を**毎回無条件で `content/` → `public/` へ `fs.copyFile`** している（`build_images.ts:39-69`）。ルート `content/` は 465MB（PNG 427MB / 1193枚、md 578件）で、参照画像だけで約100MB / 498ファイルを毎 build コピーするため、`pnpm build` の検証コストが大きい。
- **対象**:
  - `apps/web/scripts/build_images.ts`（コピー判定・orphan削除）
  - 任意で `apps/web/package.json`（フラグ追加時）
  - 参考: `apps/web/app/constants/paths.ts`（`CONTENT_DIR` / `ASSETS_ROOT`）
- **実装方針**:
  1. `copyFile` 前に宛先の存在・サイズ・mtime（可能ならソースのハッシュ）を比較し、一致すればコピーをスキップする `copyIfChanged(src, dest)` を導入。
  2. orphan 削除（参照集合に無いものを `public/` から削除）は現状維持。
  3. `copied N, skipped M, removed K, failed F` をログに出す。
  4. 任意: `--force`（全再コピー）/ `--skip-images`（画像処理を丸ごと省略）フラグを追加し、開発・検証で使い分け可能に。
- **完了条件**: 内容が変わっていない画像は再コピーされない。画像を更新・削除した場合は `public/` に正しく反映される（増分結果 = 全再コピー結果）。
- **検証**: `pnpm --filter @riebeckite/web run prebuild` を2回実行し、2回目がほぼ即時（skipped が全件）になること。`pnpm --filter @riebeckite/web run build` が通ること。画像を1枚更新して再実行し `public/` に反映されること。
- **関連**: `#27 C3`（Incremental build依存改善）と同系統だが、本項は apps/web のアセットコピーに限定した先行改善。
- **成果**: `copyIfChanged` が source/target のサイズとmtimeを比較し、一致時のコピーを省略する。コピー後はsourceのmtimeをtargetへ反映し、次回比較を安定化。ログは `copied/skipped/removed/failed` を出力する。

### #7 R6: clientEntries/endpoints規約（✅ 完了 / Phase 1 / Small）
- **成果**: Core に `assets`/`clientEntries`/`endpoints` の定型 helper を追加し、各プラグイン `index.ts` をヘルパー経由へ置換。`docs/en/plugin-system.md`（および ja）に canonical pattern を追記。
- **備考**: 生成される `plugin-styles.css` / client entry の形は不変。

### #8 R7: 共通ユーティリティをCoreへ集約（Phase 1 / Medium / 依存: R1 と関連）
- **概要**: 汎用関数の重複定義を Core に一本化する。
- **対象と現状**:
  - `uniqueStrings`（実質 `Array.from(new Set(v))`）: `core/src/content/manifest_builder.ts:108`, `content_metadata.ts:80`, `content_graph.ts:82`, `integrations/honox/src/asset_entries.ts:49`, `plugins/local-graph/src/local-graph.server.ts:98`, `plugins/garden-explorer/src/garden-explorer.server.ts:150`, `apps/web/app/lib/theme.ts:58`
  - `escapeHtml` / `escapeHtmlAttribute`: `plugins/attachment/index.ts:93,102`, `autocardlink/src/remark.ts:102`, `excalidraw/src/render.ts:52,61`, `media/index.ts:196,205`, `apps/web/app/lib/tags.ts:69`, `obsidian-markdown/src/remark_obsidian_wikilink.ts:289`
  - `normalizeTag`: `core/src/content/content_metadata.ts:55` と `plugins/obsidian-markdown/src/remark_obsidian_tag.ts:78`（完全一致）
- **実装方針**:
  1. `packages/core/src/utils/collections.ts` に `uniqueStrings` を新設し、上記 import を置換。
  2. `packages/core/src/utils/html.ts` に `escapeHtml` と `escapeHtmlAttribute` を新設。**置換前に各実装の差分を必ず diff 確認**し、テキスト用/属性用を明確に分離して統合（特に obsidian-markdown は属性用のみ）。全 6 箇所を置換。
  3. `normalizeTag` を Core に集約し 2 箇所を統合（末尾 `/-` 除去、純数値 `[\p{N}/\-_]+` の除外仕様を保持）。
  4. `packages/core/index.ts` から re-export。
- **完了条件**: 各関数の定義が 1 つ。タグ正規化・エスケープ結果の出力 HTML が不変。
- **検証**: `test:e2e:external`、該当プラグインの HTML 出力 diff（attachment/media/excalidraw/autocardlink/obsidian-markdown）。

### #9 R12: 読了時間をCoreユーティリティ化（✅ 完了 / Phase 1 / Small / 依存なし）
- **概要**: 読了時間の算出は**すでに実装済み**。ただし `packages/plugins/seo/index.ts:377` の `calculateReadingTime` は SEO の `PluginSeoExtension` 経由でしか使えず、`apps/web` は `lib/seo.ts:68-77` の `findSeoProvider()` を経由するため **SEO プラグイン未設定だと例外**になる。純粋関数を Core へ移して結合を解消する（新規プラグインは作らない）。
- **対象**:
  - `packages/plugins/seo/index.ts:377`（`calculateReadingTime`、および依存する private `stripHtml:477`）
  - `packages/core`（新規ユーティリティ、例: `src/utils/text.ts`）
  - `packages/core/src/types/plugin_seo.ts`（extension の `calculateReadingTime` を削除/非推奨化するか判断）
  - `apps/web/app/lib/seo.ts:12`（re-export を削除）、`apps/web/app/components/article.tsx:8,21`（import 先を Core に変更）
- **実装方針**:
  1. `calculateReadingTime` と必要な `stripHtml` を Core の新規ユーティリティへ移動（**仕様保持**: CJK 500字/分 + ラテン語 220語/分、最小1分）。
  2. `packages/core/index.ts` から `calculateReadingTime` を公開。
  3. `seo` は Core から import して構造化データ（`timeRequired` `PTxM`、`seo/index.ts:147,163,179-180`）の内部利用を維持。
  4. `apps/web` は `@riebeckite/core` から直接 import し、`lib/seo.ts` の re-export を削除。
- **完了条件**: SEO プラグイン未設定でも読了時間が算出・表示できる。既存表示（「X min」）と SEO 構造化データが不変。
- **検証**: `pnpm build` → apps/web の記事表示 → `test:e2e:external`。
- **成果**: `calculateReadingTime` と `stripHtml` を Core の text utility に集約し、Core から公開。SEO plugin は Core 実装を使用し、`PluginSeoExtension` と apps/web の SEO re-export から読了時間を削除。記事コンポーネントは Core を直接参照する。

### #10 R8: 空CSS削除とlint warning解消（✅ 完了 / Phase 1 / Small / 依存なし）
- **概要**: 死にファイルと唯一の lint warning を解消。
- **対象**: `apps/web/app/styles/tag.css`（0バイト）, `apps/web/app/styles/tasklist.css`（0バイト）, `apps/web/app/style.css:5-6`（`@import`）, `packages/plugins/code-enhance/style.css:108`（`noDescendingSpecificity`）
- **実装方針**:
  1. 0 バイト CSS 2 件を削除し、`style.css` の該当 `@import` 2 行を削除（クラス使用なしを再確認）。
  2. `code-enhance/style.css:108` の `.rr-code .rr-code__line` と `.rr-code__line` の詳細度逆転を解消（セレクタ統合または順序整理）。
- **完了条件**: 0 バイト CSS が消え、`biome lint .` が warning 0。
- **検証**: `pnpm exec biome lint .`、`pnpm build`（apps/web）。
- **成果**: 未参照の空CSS 2件と対応する`@import`を削除。現行のBiome設定では`code-enhance/style.css`の`noDescendingSpecificity`警告は再現せず、lint warning 0を確認。

### #11 R9: Package metadata規約の機械検証（✅ 完了 / Phase 2 / Medium / 依存: Phase 1）
- **概要**: ~30 パッケージの `package.json` 定型（`exports`/`files`/`scripts.build`/`prepack`/`publishConfig`/`repository`/`homepage`/`bugs`/`license`）の重複を、生成ではなく**検証**で統制。
- **対象**: `scripts/build_package.mjs`、各 `packages/**/package.json`、`pnpm-workspace.yaml`、ルート `package.json`
- **実装方針**:
  1. `scripts/package_metadata.mjs` に canonical 値（license/repository/homepage/bugs/publishConfig/files/scripts.build・prepack）を定義。
  2. `scripts/check_packages.mjs` を追加し、各 package.json が canonical 形状に一致するか検証して差異を出力。
  3. ルート `package.json` に `check:packages` を追加。
  4. 重複する依存バージョンは可能な範囲で `pnpm-workspace.yaml` の catalog へ集約し `catalog:` 参照へ。
- **完了条件**: `pnpm run check:packages` が全パッケージ緑。`build:packages` の出力が不変。
- **検証**: `pnpm run check:packages` → `pnpm run build:packages` → `pnpm test:e2e:external`。
- **成果**: `scripts/package_metadata.mjs`に29公開packageの共通メタデータ・package種別ごとの`files`/build script規約・catalog対象依存を集約。`scripts/check_packages.mjs`がrepository/license/publishConfig/homepage/bugs、`files`、build/prepack、exports entryの出力規約、catalog参照を検証する。`pnpm run check:packages`で実行できる。

### #12 A3/A4: Root / Config resolutionを一本化（✅ 完了 / A系 / Medium–Large / 依存なし）
- **概要**: `projectRoot/appRoot/configRoot/contentRoot` の意味を確定し、CLI と HonoX で同一 resolver を共有。通常 consumer から `workspaceRoot` 前提を除去。
- **現状**:
  - `packages/cli/src/application_root.ts`: `RiebeckiteProject = {invocationCwd, projectRoot, configRoot, configPath}`（`projectRoot === configRoot`）。`resolveRiebeckiteProject` が親ディレクトリ探索で config を発見。
  - `packages/cli/src/load_config.ts:10-17`: `workspaceRoot: project.configRoot` を渡し `resolveHonoxApplicationRoot(project.configRoot)` で appRoot を推定。
  - `packages/integrations/honox/src/config_loader.ts:9,26,30,37`: `workspaceRoot` 前提で config import / `resolveDir` / `workspacePackageResolver`。
  - `packages/integrations/honox/src/vite_plugin.ts:10-52`: `options.workspaceRoot ?? path.resolve(root, "../..")`, `options.appRoot ?? root`; `createWorkspacePackageAliases(workspaceRoot)`。
  - `packages/integrations/honox/src/workspace_packages.ts`, `vite_runner.ts`（`configRoot` から app root 探索）。
- **実装方針**:
  1. 共通 root resolver を定義し、`{ projectRoot, configRoot, appRoot, contentRoot }` を一度に解決（`contentRoot` は `config.content.directory` 解決に使用）。
  2. `RiebeckiteProject` に `appRoot`/`contentRoot` を追加し、`projectRoot` の定義を固定。
  3. `workspace_packages`（monorepo dev 用）は通常 consumer では package.json 解決へフォールバックし、`workspaceRoot` を必須にしない。
  4. CLI 側 `load_config.ts` と HonoX 側 `config_loader.ts`/`vite_plugin.ts` が同一 resolver を import。
- **完了条件**: `workspaceRoot` を指定しない外部 consumer で `check/doctor/inspect/build` が通り、cwd 依存が消える。
- **検証**: `test:e2e:external`（fixture は standalone npm）、`pnpm build`、docs/en configuration・architecture の更新。
- **注意**: Core に HonoX/Vite を持ち込まない（resolver は Core か Integration の適切な層に置く）。
- **成果**: `@riebeckite/honox` の `resolveHonoxApplication` が `configRoot`、`appRoot`、絶対 `contentRoot`、resolve 済み config を一度に決定する。CLI の `RiebeckiteProject` はこの結果を保持し、全 command が同じ root を使う。Vite plugin の既定値は `configRoot = appRoot` で、通常の npm consumer は `workspaceRoot` 不要。monorepo の source package alias は明示指定または `pnpm-workspace.yaml` を持つ config root のみで利用する。

### #13 A4.5: External HonoX/SSG境界を安定化（✅ 完了 / A系 / Medium / 依存: A3/A4）
- **概要**: `@hono/vite-ssg` patch が npm consumer に伝播しない問題と cwd 依存を解消。
- **対象**: `packages/integrations/honox/src/ssg_plugin.ts`、apps/web と external-site fixture の Vite 設定。
- **実装**: `riebeckiteSsg` が解決済み Vite の `root` と `define` を内部 SSG server へ明示的に渡す。`@hono/vite-ssg` と pnpm patch を削除し、SSG 呼び出しを integration 内で完結。
- **完了条件**: patch 無し（または同梱）で外部 consumer が build 可能、別 cwd から実行しても同一結果。
- **検証**: `test:e2e:external` は `site/app` から実行して cwd 非依存を確認。

### #14 A5: External Content Source / Vault対応を保証（✅ 完了 / A系 / Medium / 依存: A3/A4）
- **概要**: Site 外の Obsidian Vault を正式サポート。`contentRoot` が project 外でも成立させる。
- **対象**: `packages/core/src/content/file_system_content_source.ts`、`content_source.ts`、`attachment.ts`、`plugins/attachment`, `plugins/media`
- **実装方針**: content source が `contentRoot`（vault）と `projectRoot` を分離して扱う。attachment/media のパス解決を content source 基準へ統一。doctor/check の root 表示を調整。
- **完了条件**: 絶対/相対の外部 `contentRoot` で build が通る。
- **検証**: `test:e2e:external` に site root 外の Vault、attachment のサイズ読み込み、media embed のケースを追加。
- **成果**: A3/A4 の解決済み絶対 `contentRoot` を filesystem content source と attachment plugin が共有する既存境界を、公開 tarball の E2E で保証。fixture は site 外の相対 Vault を指定し、attachment と media の logical path・attachment size を検証する。英日 configuration docs に外部 Vault の基準と例を明記。

### #15 A5.5: Pluginのfilesystem直接依存を除去（✅ 完了 / A系 / Medium–Large / 依存: A3/A4）
- **概要**: プラグインからの `node:fs`/`node:path` 直接依存を ContentSource/Asset 境界へ移行。
- **現状の直接依存**: `plugins/diagnostics/src/vault.ts:1-2`, `diagnostics/bin.ts:1`, `excalidraw/index.ts:1-2`, `attachment/index.ts:1-2`, `media/index.ts:1`, `diff/index.ts:1`, `mermaid/src/render-static.ts:1,3`, `diff/src/git/history_reader.ts:2`
- **実装方針**: Core の content source / asset / build-time API 経由に置換し、Node 専用処理は build-time contract として明示。`diagnostics/bin.ts` は CLI 側へ移す等の層整理も検討。
- **完了条件**: プラグイン本体から `node:fs` 直接 import が消える（または境界 API 経由に限定）。
- **検証**: build、`test:e2e:external`、diagnostics/excalidraw/attachment の実動作。
- **成果**: Core の `ContentSource` を plugin/render/Markdown pipeline context へ渡し、論理パスから安全に entry を検索・読み込みできる API を公開。attachment は source metadata からサイズを取得し、excalidraw と diagnostics は source 経由の read/scan に移行。media/diff/diagnostics CLI は path 直接依存を除去。Mermaid の一時ファイル処理は、Puppeteer を必要とする明示的な build-time renderer contract の実装に隔離した。

### #16 R2: ContentManager責務分割（Phase 3 / Medium / 依存: A5.5）
- **概要**: `packages/core/src/content/content_manager.ts`（443行）を責務分割。**公開 API は不変**。
- **現状**: `class ContentManager` の公開メソッド `getAllPosts/scan/getPost/getContentIndex/getProcessedContent/getManifest/build/getBacklinks/getContentGraph/getDiagnostics/inspect/dispose/getContentLocations`、private `getContentEntries/getPermalinks/populateRedirects/readTextEntry/readContentEntry/getBuildPreparation/enableBuildTime/prepareBuild/commitBuildState/observability`。
- **実装方針**:
  1. build 準備/状態確定（`getBuildPreparation`/`prepareBuild`/`commitBuildState`/`enableBuildTime`）を協調オブジェクト（例: `ContentBuildCoordinator`）へ抽出。
  2. permalink/redirect 解決（`getPermalinks`/`populateRedirects`）を helper へ。
  3. entry 読み込み（`readTextEntry`/`readContentEntry`）を helper へ。
  4. facade として `ContentManager` の公開シグネチャを維持。
- **完了条件**: 公開メソッド・戻り値・状態ファイル（`.riebeckite/build/content-state.json`）の形式が不変。
- **検証**: build → `check`/`doctor`/`inspect` → `test:e2e:external`。
- **成果**: `ContentEntryReader` に source scan とテキスト読込キャッシュ、`ContentLocationResolver` に canonical location/permalink/redirect 解決、`ContentBuildCoordinator` に増分 build-state の準備・保存を移設。`ContentManager` は既存の公開 API を維持する facade としてこれらを協調させる。

### #17 R10: seoプラグイン分割（Phase 3 / Small–Medium / 依存なし）
- **概要**: `packages/plugins/seo/index.ts`（454行）を `src/` 配下へ分割し、`index.ts` は re-export のみに。
- **現状の公開 API**: `seo`, `buildArticleSeo`, `buildWebsiteSeo`, `buildAbsoluteUrl`, `buildPostUrl`, `getDescription`, `filterFeedEntries`, `renderSitemap`, `renderRobots`, `renderRssFeed`, `renderAtomFeed`, `renderJsonFeed`, `getEntryPublishedTime`, `getEntryUpdatedTime`, `getHtmlLanguage`, `calculateReadingTime`、型 `FeedOptions`/`SeoPluginOptions` 等。
- **実装方針**: 責務別ファイル（metadata builders / feeds / sitemap・robots / schema / url / xml-escape）に移動し、`index.ts` で re-export。`createSeoEndpoints` は endpoints モジュールへ。
- **完了条件**: 公開 API が不変、`index.ts` が薄い re-export。
- **検証**: build → apps/web（sitemap/robots/feed 出力）→ `test:e2e:external`。
- **注意**: `#9 R12` で `calculateReadingTime` を Core へ移した場合は re-export 対象から除外する。
- **成果**: `src/` に plugin composition、endpoint、metadata、feed、sitemap/robots、URL、content、schema/XML、型を責務別に分割。`index.ts` は公開 API の re-export のみとし、`calculateReadingTime` は既存どおり Core の公開 API とした。

### #18 R11: diagnostics analyze分割（Phase 3 / Small–Medium / 依存なし）
- **概要**: `packages/plugins/diagnostics/src/analyze.ts`（472行）を `checks/` 配下へ分割。
- **現状の関数**: `analyzeContent`（オーケストレータ）、`checkWikilinks`, `checkMarkdownReferences`, `checkFrontmatter`, `checkSlugCollisions`, `checkDuplicateTitles`, `checkOrphans`, `checkUnusedAssets`, `checkExcludedPublic`、補助 `addIncoming`/`push`/`severityFor`/`normalizeOptions`。
- **実装方針**: 各 `check*` を個別ファイルへ移動し、`analyzeContent` はチェックを集約するオーケストレータとして残す。`AnalysisState` 型は共有モジュールへ。
- **完了条件**: 診断結果（件数・severity・message）が不変。
- **検証**: `riebeckite check` の出力 diff → `test:e2e:external`。
- **成果**: `checks/` に Wikilink・Markdown参照・frontmatter・note metadata・orphan・asset・excluded public の各診断を分割し、共有する状態・option正規化・diagnostic生成を `checks/shared.ts` に集約。`analyzeContent` は既存の実行順序を保つオーケストレーターにした。

### #19 A2: Plugin間の直接依存を排除（✅ 完了 / A系 / Medium / 依存: P1 と関連）
- **概要**: `garden-explorer → plugin-search` の直接依存を切る。
- **現状**: `packages/plugins/garden-explorer/src/garden-explorer.ts:1` が `import type { SearchItem } from "@riebeckite/plugin-search"`。
- **実装方針**: `SearchItem` 相当の型を Core の contract へ移すか garden-explorer 側でローカル定義。連携は `provides`/`requires` capability 経由の任意依存にする。
- **完了条件**: `garden-explorer/package.json` の依存から `@riebeckite/plugin-search` が消え、型の重複/循環がない。
- **検証**: build、`test:e2e:external`。
- **成果**: `GardenExplorerNote` が検索プラグインの `SearchItem` を参照しないローカルの表示データ型を定義し、`@riebeckite/plugin-search` を package dependency と lockfile から削除した。検索機能との実行時連携は存在しないため、capability 依存は導入していない。

### #20 A6: HonoX UI primitiveの境界固定（✅ 完了 / A系 / Small）
- **概要**: Integration が Component Framework 化するのを防ぎ、公開 primitive の境界を固定。
- **対象**: `packages/integrations/honox/src/ui/primitives.tsx`
- **実装方針**: 公開 primitive 一覧を確定し docs 化。apps/web がそれのみを使うよう整理。
- **完了条件**: 公開 primitive が文書化され、apps/web・外部 Site が同一 contract を使用。
- **検証**: `pnpm build`、docs 更新。
- **成果**: `@riebeckite/honox/ui` の公開 component を `Article`、`ArticleLayout`、`ArticleHeader`、`ArticleContent`、`ArticleMeta`、`ArticleFooter`、`Sidebar` に固定し、対応する props 型を公開。Integration は semantic な構造と class 合成だけを提供し、表示内容・ページ構成・style・island は Site Application が所有することを英日 docs に明記した。external tarball の NodeNext typecheck で全 component と props 型を検証する。

### #21 A7: Site Application拡張contract（✅ 完了 / A系 / Medium）
- **概要**: 外部 Site の `routes`/`components`/`islands`/`style` の所有・override 方法を正式化。
- **成果**: `@riebeckite/honox` の英日 integration docs に、`routes`/`components`/`islands`/style の Site 所有を明文化した。`_renderer`、manifest location route、公開 UI primitive、生成 style、client entry の境界と最小例を記載。external-site fixture は Site shell、primitive を合成する article component、local island、Site CSS を持ち、tarball E2E が各 marker と primitive composition を検証する。
- **検証**: `pnpm test:e2e:external`、`pnpm build`。

### #22 A8: Local Plugin / Local Theme対応保証（✅ 完了 / A系 / Medium）
- **概要**: Site 内 extension と npm 版を同一 contract で扱えることを E2E 保証。
- **実装方針**: fixture に local plugin/theme を追加し、npm 版と同様に解決・適用されることを検証。
- **完了条件**: local/npm 双方が同一 API で動作。
- **成果**: external-site fixture に site 内 `definePlugin`/`defineTheme` の plugin/theme を追加。`definePlugin` の `extendHtmlPipeline` marker、`assets` の local stylesheet、`defineTheme` の `data-*` 属性・local stylesheet が build 出力と dist CSS に反映され、`inspect plugins`/`inspect config` が local extension 名を報告することを tarball E2E で検証。合否は build 出力・CSS・inspect 出力・Bundler/NodeNext typecheck。英日 plugin/theme docs に site 内 extension の書き方（未 publish 時の `assets` module specifier 明示）を追記。
- **検証**: `pnpm test:e2e:external`、`pnpm build`、`pnpm exec biome lint .`。

### #23 C1/C2: Content Query API（Medium）
- **概要**: tag/folder/date/frontmatter 等の共通問い合わせ基盤。
- **対象**: `packages/core/src/content/content_manager.ts`、`types/content_manifest.ts`
- **実装方針**: manifest/graph 上でフィルタ・ソート・グルーピングする Query API を Core に追加。プラグインはこれを使ってページ生成。
- **完了条件**: 代表クエリ（tag 一覧、期間、フォルダ）が API で表現可能。
- **検証**: build、利用プラグインの出力。

### #24 F1: Taxonomy / Collection / Archive（Medium / 依存: C1/C2）
- **概要**: Query API を利用して tag/archive 等を汎用化。
- **実装方針**: collection 抽象（taxonomy→URL→一覧ページ）を Core/Plugin 契約として定義し、既存 tag ページを移行。
- **完了条件**: tag/archive が同一メカニズムで生成される。

### #25 P1: provides/requires規約整備（Medium）
- **概要**: capability system を実 Plugin で利用可能にする。
- **対象**: `packages/core/src/plugin/plugin_dependency.ts`、`types/plugin.ts`
- **実装方針**: provides/requires/optional の解決・診断・エラー（`plugin_dependency_error.ts`）を実利用に耐える形へ。A2 の連携基盤にする。
- **完了条件**: 依存解決とエラー表示が E2E で確認できる。

### #26 S1: Publish Boundary / Leak Check（Medium）
- **概要**: 非公開 note/attachment が公開 artifact に漏れないことを保証。
- **対象**: `packages/core/src/types/publish_strategy.ts`、build 出力、`plugins/diagnostics`
- **実装方針**: publish 判定を一貫適用し、出力/マニフェスト/検索インデックス/添付へ非公開物が混入しないことを検査する diagnostics を追加。
- **完了条件**: 混入を検出するチェックが存在し、E2E で漏れなしを保証。

### #27 C3: Incremental build依存改善（Medium）
- **概要**: asset 依存・build state API を整理。
- **対象**: `content_build_state.ts`, `content_build_state_store.ts`, `content_fingerprint.ts`, `affected_content.ts`, `content_change_set.ts`
- **実装方針**: asset/URL の依存を fingerprint に取り込み、変化時の再生成範囲を正しく算出。
- **完了条件**: 増分ビルドの結果がフルビルドと一致。

### #28 P2: Plugin CSS contract（Medium）
- **概要**: `rb-<plugin>-*` 等の stable styling hook を定義。
- **対象**: `apps/web/app/.riebeckite/plugin-styles.css` 生成、各 plugin `style.css`、themes
- **実装方針**: 命名規約を確定し docs 化。生成 CSS とテーマの適用順を安定化。
- **完了条件**: hook 名が安定し、テーマ側からスタイル可能。

### #29 R4: `startBuild` lifecycle整理（Small / 依存なし）
- **概要**: `PluginRuntime.startBuild` が複数経路から呼ばれる問題を整理。
- **現状**: `packages/core/src/plugin/plugin_runtime.ts:48` の `startBuild`（`buildStarted` ガード、`runSetup → runBuildStart → onBuildStart → onConfigResolved`）。呼び出し元は `content_manager.ts:156`（`getProcessedContent`）と `:318`（`getContentLocations`）の2経路。
- **実装方針**: ライフサイクル段階（setup/configResolved/buildStart/…）を明示し、どの公開メソッドから呼ばれても同一順序で一度だけ実行されることを保証。必要なら状態機械またはテスト可能なフックに。
- **完了条件**: 両経路でフック順序が同一、重複実行なし。
- **検証**: `check`/`doctor`、`test:e2e:external`。

### #30 C4: HonoX高レベルhelper（Medium）
- **概要**: Vite/HonoX/SSR externals 等の内部知識を consumer から隠す。
- **対象**: `packages/integrations/honox/src/vite_plugin.ts`, `vite_runner.ts`, `ssg.ts`
- **実装方針**: 設定一体型の higher-level helper を提供し、内部オプションを不要に。
- **完了条件**: consumer が詳細オプション無しで build/dev 可能。

### #31 D1: `create-riebeckite` / `riebeckite init`（Large / 依存: A7 等）
- **概要**: 完成した Site Application contract から starter を生成。
- **実装方針**: CLI に `init` を追加し、テンプレートから最小 Site を生成。`create-riebeckite` パッケージも提供。
- **完了条件**: 生成物がそのまま `check/build` を通る。

### #32 D1.5: Cloudflare deployment template（Medium）
- **概要**: GitHub Actions + Workers Static Assets の標準構成。
- **実装方針**: テンプレートと wrangler 設定、CI を提供。
- **完了条件**: テンプレートでデプロイが再現。

### #33 D2: CLI config/scan重複削減（Medium）
- **概要**: command 間の config/source 解決重複を整理。
- **対象**: `packages/cli/src/application_root.ts`, `load_config.ts`, `commands/*`
- **実装方針**: 解決処理を共通化。A3/A4 の resolver と統合。
- **完了条件**: commands から重複コードが消える。

### #34 D3: `inspect build`強化（Small）
- **概要**: invalid reason 等を表示。
- **対象**: `packages/cli/src/inspect/collectors.ts`, `renderer.ts`, `types.ts`
- **完了条件**: 無効化理由が出力される。

### #35 D4: `doctor` build-state検証強化（Medium）
- **概要**: fingerprint 不一致等を検出。
- **対象**: `packages/cli/src/doctor/checks/build_state.ts`
- **完了条件**: 不一致を検出して報告。

### #36 D5: `profile` diagnostics対応（Small）
- **概要**: profile 観測範囲を拡張。
- **対象**: `packages/cli/src/profile/*`, `core/src/observability.ts`

### #37 D6: CLI error renderer強化（Small）
- **概要**: error code/file/hint 等を表示。
- **対象**: `packages/cli/src/error_renderer.ts`

### #38 D7: Dependency hygiene E2E（Small–Medium）
- **概要**: `apps/web` 等の undeclared/hoisted 依存を検出。
- **実装方針**: 宣言外 import を検出するチェックを E2E に追加。

### #39 D8: 公開パッケージのREADME整備（Small / 依存なし）
- **概要**: 公開パッケージ `packages/core`, `packages/cli`, `packages/integrations/honox` に `README_en.md`/`README_ja.md` が無い（他25パッケージは両方保有）。npm のパッケージページに説明が表示されず、外部 consumer の入口が無い状態。
- **対象**:
  - `packages/core/README_en.md`（新規）, `packages/core/README_ja.md`（新規）
  - `packages/cli/README_en.md`（新規）, `packages/cli/README_ja.md`（新規）
  - `packages/integrations/honox/README_en.md`（新規）, `packages/integrations/honox/README_ja.md`（新規）
  - 必要に応じて各 `package.json` の `files` に README を追加（現状3パッケージの `files` は `LICENSE`/`dist`（`cli` は `+bin`）のみで README 未記載）
- **実装方針**:
  1. 既存パッケージ README（例: `packages/plugins/backlinks/README_en.md`）の構成・トーンに合わせる。
  2. 内容は「役割 / インストール / 最小使用例 / 公開API概要 / 関連docsへのリンク」。`core` は framework contract、`cli` はコマンド、`honox` は統合の説明。
  3. `README_ja.md` を対応させる（見出し構成を揃える）。
  4. `files` に README を追加する場合は `pnpm --filter <pkg> pack --dry-run` で同梱を確認。
- **完了条件**: 3パッケージに `README_en.md`/`README_ja.md` が存在し、内容が公開APIと一致。`pnpm pack` の同梱可否が意図どおり。
- **検証**: 対象3パッケージで `pnpm pack`（または `pack --dry-run`）確認 → `pnpm run build:packages` に影響がないこと。

### #40 F2: Pagination（Small / 依存: C1/C2）
- **概要**: Query API へ offset/limit 等を追加。

### #41 Related Posts Plugin（Small–Medium）
- **概要**: `ContentGraph` を利用して関連記事を算出。
- **対象**: 新規 `packages/plugins/related-posts`、`core/src/content/content_graph.ts`

### #42 OG Image Plugin（Medium）
- **概要**: build 時に OG image を生成。
- **実装方針**: build-time API（Node）で画像生成し、asset として公開。

### #43 Citation Plugin（Medium）
- **概要**: 引用・参考文献管理。
- **実装方針**: remark 段階で citation を収集し、HTML パイプラインで参考文献を描画。

### #44 Scheduled Publish表示Plugin（Small）
- **概要**: `PublishStrategy` を UI/diagnostics へ表示。
- **対象**: `core/src/types/publish_strategy.ts`、`plugins/diagnostics`
