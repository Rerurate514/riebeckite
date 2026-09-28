# Phase 0 Recon — Riebeckite 追加プラグイン設計の前提調査

対象: `Rerurate514/riebeckite`（base commit `2beb25c`）
調査者: ORC（A0 相当）
本書は設計書 §3 の「提案 API」を実 API に突き合わせた結果である。**食い違いがある場合は本書を正とする。**

---

## 0. R1〜R8 への回答（結論）

| # | 確認事項 | 回答 | 影響 |
|---|---|---|---|
| R1 | プラグイン型・フック、`emit` 相当 | フックは実在（§1）。**ただし `BuildContext`/`emit(path, content)` は存在しない**。プラグインから任意ファイルは出力できない（§2）。 | 全体・P5/P6/P7 |
| R2 | ビルド時の共有状態 | 共有は `ContentManifest` と `context.cache`（KV）経由のみ。検索インデックス等は各プラグインが build-time に生成。 | P0/P6/P7 |
| R3 | ノートの安定 ID | **存在しない。** permalink は frontmatter/hash/エイリアス由来。`id`/`uid` frontmatter は任意（標準なし）。 | P2 |
| R4 | クライアント JS 配布・SPA | `clientEntries` が実在（グローバル、オプション非伝達）。`apps/web` は通常の HonoX SSG で **SPA 遷移機構は無い**。 | P3 |
| R5 | diagnostics の外部受け口 | `addDiagnostics` + 共有 `context.diagnostics` は実在。**`DiagnosticsSink.report()` は無い**。`Diagnostic` の形も異なる（§3）。 | P4 |
| R6 | 実行環境 | Node + pnpm + TS + Biome。git 利用可（`plugin-diff` に `execFile("git")` 前例）。ヘッドレス Chrome は mermaid が puppeteer を動的 import（任意・未必至）。 | P2/P4 |
| R7 | 実行時環境 | 静的 SSG が基本。Cloudflare Workers 対応（`apps/web/wrangler.jsonc`）だが、**plugin endpoint は GET 固定**（§2）。 | P5/P7 |
| R8 | seo との衝突 | seo が feed / sitemap / robots を所有（**単一プロバイダ、最初の `seo` 実装が勝つ**）。P1 の feed パス・P6 の robots は要調整。 | P1/P6 |

---

## 1. 実プラグイン contract（`RiebeckitePlugin`）

`packages/core/src/types/plugin.ts` と `docs/ja/plugin-system.md` より。

| 領域 | API |
|---|---|
| Identity | `name`, `enabled`, `order`, `options` |
| Dependency | `provides`, `requires`, `optional` |
| Validation | `validateOptions` |
| Cache | `cacheVersion`, `context.cache` |
| Lifecycle | `setup`, `buildStart`, `buildEnd`, `dispose` |
| Content hooks | `onConfigResolved`, `onContentLoaded`, `onPostParsed`, `onPostProcessed`, `onManifestCreated` |
| Public Location | `resolveContentLocations`（＋未マージの `extendContentLocations`） |
| Legacy build hooks | `onBuildStart`, `onBuildEnd` |
| Pipeline | `remarkPlugins`, `rehypePlugins`, `extendMarkdownPipeline`, `extendHtmlPipeline` |
| Graph | `extendContentGraph` |
| Diagnostics | `addDiagnostics` |
| Rendering | `renderers` |
| Browser | `assets`, `clientEntries` |
| HTTP | `endpoints` |
| SEO | `seo` |

### フック実行順（実装より）
1. `setup` → `buildStart` → `onBuildStart` → `onConfigResolved`
2. post ごと: Markdown pipeline → `onPostParsed` → `onPostProcessed`
3. manifest 生成時: 全 post 収集 → `contentIndex` → 位置解決（`resolveContentLocations` → `extendContentLocations`）→ entry 生成 → `extendContentGraph` → manifest 構築（`bySlug`/`byPermalink`/`byTag`/`byAsset`/`outgoingLinks`/`incomingLinks`/`redirects`/`graph`）→ `onManifestCreated` → `assets` 収集 → diagnostics 収集 → `onBuildEnd`
4. `dispose`

### 主なデータ型
- `ContentManifestEntry = { slug, permalink, publicLocation, title, frontmatter, html（可変）, tags, links, backlinks, assets }`
- `ContentManifest = { entries, bySlug, byPermalink, byTag, byAsset, outgoingLinks, incomingLinks, contentIndex, redirects, graph, assets, diagnostics }`
- `ContentPublicLocation = { slug, permalink, redirects?: readonly ContentRedirect[], metadata? }`
- `ContentRedirect = { path, status: 301 | 302 | 307 | 308 }`
- `Diagnostic = { code, severity, message, pluginName?, filePath?, slug?, target?, suggestion?, meta? }`（severity は error/warning/info 系）

---

## 2. 出力機構（重要：`emit` は存在しない）

プラグインが生成できる成果物は次のみ。

| 出力 | API | 備考 |
|---|---|---|
| ページ本文 HTML | `entry.html`（`onManifestCreated` で可変） | SSG が permalink ごとに 1 HTML を出力 |
| head タグ | `entry.headTags`（discord-embed で新設、**未マージ**） | サイトシェルが描画 |
| CSS | `assets`（`createStyleAsset`） | |
| ブラウザ JS | `clientEntries`（`createClientEntry`） | `virtual:riebeckite/client`、**オプション非伝達** |
| HTTP endpoint | `endpoints` | **静的 GET のみ**。`mountRiebeckiteEndpoints` は `endpoint.method` を無視して `app.get()` で登録する |
| SEO | `seo` | 単一プロバイダ |
| 任意ファイル | **不可** | `emit`/`writeFile` に相当する公開 API は無い |

`dist/` への書き込みは `apps/web` の Vite/SSG と `apps/web/scripts/*`（例: `build_images.ts`）のみ。プラグインが直接書けるのは `.riebeckite` 系キャッシュ（`PluginCache`）に限られる。

→ **P5（`_redirects`/`vercel.json` 等）、P6（`llms.txt`/`*.md`/`mcp-index.json`）、P7（MCP サーバ）、P1（`/daily/*` 等の新規ページ）は、現状のままでは実装できない。**

---

## 3. 設計書 §3 契約との差分と推奨読み替え

| 設計書 | 実 API | 推奨 |
|---|---|---|
| `BuildContext` + `emit(path, content)` | 無い | Core に build-time emit フック＋CLI でのファイル書き出しを新設する（Q1）。または apps/web/CLI 側で生成。 |
| `note: ReadonlyMap<NoteId, NoteInfo>` | `manifest.entries`/`bySlug`/`byTag`/`byAsset`/`contentIndex` | そのまま読み替え。安定 `id` は新設要。 |
| `RedirectRegistry` | `ContentPublicLocation.redirects` + `manifest.redirects` + `resolveContentRoute`（request 時解決） | 既存機構を利用。`410` は現状の `ContentRedirect` に無いので拡張要。ファイル出力は Q1 依存。 |
| `DiagnosticsSink.report(d)` | `addDiagnostics(context)` + 共有 `context.diagnostics` | `Diagnostic{code, severity, message, pluginName}` に合わせる。`source`→`pluginName`、`level`→`severity`、`rule`→`code`。 |
| `CacheApi.memo(key, deps, compute)` | `PluginCache`（`get`/`set`/`delete`/`clear`、JSON、`cacheVersion` で名前空間） | KV は実在。依存宣言型 `memo` は新設要。`.riebeckite/cache` 配下。 |
| `--no-cache` CLI | 無い | CLI フラグ追加要（Q4）。 |

### パッケージ配置の訂正（重要）
設計書は `packages/plugin-<name>/` としているが、実際は **`packages/plugins/<name>/`**（pnpm-workspace globs: `packages/plugins/*`）、パッケージ名 **`@riebeckite/plugin-<name>`**。配置・命名は実態に合わせる。

---

## 4. コマンド / テスト / 公開制御

- ルートスクリプト: `build:packages`（`pnpm -r --filter "./packages/**" run build`）、`lint`（Biome）、`check:packages`（`scripts/check_packages.mjs`）、`test:e2e:external`（`tests/external-site/run.mjs`）。`taskfile.yaml` は `run` のみ。
- **単体テストランナーは存在しない**（vitest/jest なし）。唯一の自動テストは E2E 外部サイトハーネス。設計書 §5.3 の単体テストはランナー追加が前提（Q3）。
- 公開制御は実在: `content.exclude`（既定 `[]`）と `content.filters.publishStrategy`（`"explicit" | "selective"`、既定 `explicit`）。`config.ts` に publish 判定あり。**新規出力でも必ず尊重する。**

---

## 5. 参考ファイル（実装時に読む）

- `packages/core/src/types/plugin.ts`, `types/plugin_context.ts`, `types/plugin_pipeline.ts`, `types/diagnostic.ts`
- `packages/core/src/plugin/plugin_runtime.ts`, `plugin/plugin_cache.ts`
- `packages/core/src/content/*`（`content_manager.ts`, `content_location_resolver.ts`, `file_system_content_source.ts`, `content_source.ts`）
- `packages/core/src/pipeline.ts`, `packages/core/src/config.ts`
- `packages/integrations/honox/src/endpoints.ts`, `client_module.ts`
- 参考プラグイン: `packages/plugins/{toc,recent-posts,search,backlinks,diagnostics,seo,diff,mermaid,query}`
- `docs/ja/plugin-system.md`, `docs/ja/honox-integration.md`
- `tests/external-site/run.mjs`, `scripts/package_metadata.mjs`, `scripts/check_packages.mjs`
