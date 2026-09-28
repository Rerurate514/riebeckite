| 順番 | ID | 作業 | 状態 | 規模 | 理由 |
|---:|---|---|---|---|---|
| 1 | A1 | Package公開境界を作る | ✅ 完了 | Large | 外部Plugin/Theme ecosystemの前提 |
| 2 | A1.5 | npm配布形式を完成させる | ✅ 完了 | Medium–Large | ESM + `.d.ts` + NodeNext + LICENSE + `pnpm pack` + external consumer検証済み |
| 3 | A1.6 | External Site Build E2E | ✅ 完了 | Medium | tarballのみで`check/doctor/inspect/build`、Bundler/NodeNext typecheckを保証 |
| **4** | **R1** | **Graph layout重複解消** | 🔧 次 | Medium | `local-graph` / `garden-explorer`の共通実装を抽出（Phase 1） |
| 5 | R5 | Backlink走査共通化 | 未着手 | Small | Core ContentGraphへ寄せる（Phase 1） |
| 6 | R6 | clientEntries/endpoints規約 | 未着手 | Small | 外部Plugin author向けの正解パターンを固定（Phase 1） |
| 7 | R7 | 共通ユーティリティをCoreへ集約 | 未着手 | Medium | `uniqueStrings`(7箇所)/`escapeHtml`・`escapeHtmlAttribute`(6箇所)/`normalizeTag`(2箇所)の重複を解消。`@riebeckite/core` indexから公開（Phase 1） |
| 8 | R8 | 空CSS削除とlint warning解消 | 未着手 | Small | 0バイトの`apps/web/app/styles/tag.css`・`tasklist.css`と`style.css`の`@import`を削除。`code-enhance/style.css`のnoDescendingSpecificity解消（Phase 1） |
| 9 | R9 | Package metadata規約の機械検証 | 未着手 | Medium | ~30 package.jsonの定型(exports/files/scripts/publishConfig/repository等)を`scripts/check_packages.mjs`で検証。依存はpnpm catalogへ集約（Phase 2） |
| **10** | **A3/A4** | **Root / Config resolutionを一本化** | 未着手 | Medium–Large | `projectRoot/appRoot/configRoot/contentRoot`を明確化。`workspaceRoot`の通常consumer依存を除去しCLI/HonoXでresolverを共有 |
| **11** | **A4.5** | **External HonoX/SSG境界を安定化** | 未着手 | Medium | `@hono/vite-ssg` patchがnpm consumerへ伝播しない問題、cwd依存を解消 |
| **12** | **A5** | **External Content Source / Vault対応を保証** | 未着手 | Medium | Site外のObsidian Vaultを正式サポート。`contentRoot`がproject外でも成立させる |
| **13** | **A5.5** | **Pluginのfilesystem直接依存を除去** | 未着手 | Medium–Large | attachment/excalidraw/diff等をContentSource/Asset境界へ移行 |
| 14 | R2 | ContentManager責務分割 | 未着手 | Medium | 約443行の責務整理。build調整(prepareBuild/commitBuildState)とpermalink/redirect解決を協調オブジェクト/helperへ抽出し公開APIは不変（Phase 3） |
| 15 | R10 | seoプラグイン分割 | 未着手 | Small–Medium | 454行の`plugins/seo/index.ts`を`src/`へ分割しre-export化。公開API維持（Phase 3） |
| 16 | R11 | diagnostics analyze分割 | 未着手 | Small–Medium | 472行の`plugins/diagnostics/src/analyze.ts`を`checks/`へ分割。`analyzeContent`はオーケストレータ化（Phase 3） |
| **17** | **A2** | **Plugin間の直接依存を排除** | 未着手 | Medium | `garden-explorer → plugin-search`を切りPlugin独立性を確保 |
| **18** | **A6** | **HonoX UI primitiveの境界固定** | 未着手 | Small | IntegrationがComponent Framework化するのを防ぎ、Site側の拡張境界を固定 |
| **19** | **A7** | **Site Application拡張contract** | 未着手 | Medium | 外部Siteの`routes/components/islands/style`の所有・override方法を正式化 |
| **20** | **A8** | **Local Plugin / Local Theme対応保証** | 未着手 | Medium | Site内extensionとnpm版を同一contractで扱えることをE2E保証 |
| 21 | C1/C2 | Content Query API | 未着手 | Medium | tag/folder/date/frontmatter等の共通問い合わせ基盤 |
| 22 | F1 | Taxonomy / Collection / Archive | 未着手 | Medium | Query APIを利用してtag/archive等を汎用化 |
| 23 | P1 | provides/requires規約整備 | 未着手 | Medium | capability systemを実Pluginで利用可能に |
| **24** | **S1** | **Publish Boundary / Leak Check** | 未着手 | Medium | Private Vaultから非公開note/attachmentが公開artifactへ漏れないことを保証 |
| 25 | C3 | Incremental build依存改善 | 未着手 | Medium | asset依存・build state APIを整理。外部Vault CIにも重要 |
| 26 | P2 | Plugin CSS contract | 未着手 | Medium | `rb-<plugin>-*`等のstable styling hookを定義 |
| 27 | R4 | `startBuild` lifecycle整理 | 未着手 | Small | 複数経路から呼ばれる問題を整理 |
| **28** | **C4** | **HonoX高レベルhelper** | 未着手 | Medium | Vite/HonoX/SSR externals等の内部知識をconsumerから隠す |
| **29** | **D1** | **`create-riebeckite` / `riebeckite init`** | 未着手 | Large | 完成したSite Application contractからstarterを生成 |
| **30** | **D1.5** | **Cloudflare deployment template** | 未着手 | Medium | GitHub Actions + Workers Static Assetsの標準構成 |
| 31 | D2 | CLI config/scan重複削減 | 未着手 | Medium | command間のconfig/source解決重複を整理 |
| 32 | D3 | `inspect build`強化 | 未着手 | Small | invalid reason等を表示 |
| 33 | D4 | `doctor` build-state検証強化 | 未着手 | Medium | fingerprint不一致等を検出 |
| 34 | D5 | `profile` diagnostics対応 | 未着手 | Small | profile観測範囲を拡張 |
| 35 | D6 | CLI error renderer強化 | 未着手 | Small | error code/file/hint等を表示 |
| **36** | **D7** | **Dependency hygiene E2E** | 未着手 | Small–Medium | `apps/web`等のundeclared/hoisted dependency依存を検出 |
| 37 | F2 | Pagination | 未着手 | Small | Query APIへoffset/limit等を追加 |
| 38 | — | Related Posts Plugin | 未着手 | Small–Medium | ContentGraphを利用 |
| 39 | — | Reading Time Plugin | 未着手 | Small | 本文から読了時間算出 |
| 40 | — | OG Image Plugin | 未着手 | Medium | build時OG image生成 |
| 41 | — | Citation Plugin | 未着手 | Medium | 引用・参考文献管理 |
| 42 | — | Scheduled Publish表示Plugin | 未着手 | Small | PublishStrategyをUI/diagnosticsへ表示 |

## リファクタリング一掃の実施順（2026-09-28 計画）

優先度順の内訳:

- **Phase 1（低リスク重複解消 / 最優先 #4–#8）**: R1 → R5 → R6 → R7 → R8
- **Phase 2（パッケージ規約 / #9）**: R9
- **Phase 3（大型モジュール分割 / A5.5 の後 #14–#16）**: R2 → R10 → R11

方針:

- 共通ユーティリティは `@riebeckite/core` の index から公開（subpath追加なし）。
- 各フェーズ後に `pnpm -r --filter "./packages/**" run build` → `pnpm build` → `pnpm exec biome lint .` → `pnpm test:e2e:external` で検証。
- Phase 3 は公開APIを凍結したまま内部移動（seo は re-export で互換維持）。
- R2 は `A5.5`（#13）の境界確定後に実施する依存順を採用。
- `constants/paths.ts` / `client.ts`（apps/web ↔ tests/external-site fixture）の重複は意図的なため対象外。
