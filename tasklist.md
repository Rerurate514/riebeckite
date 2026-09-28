| 順番 | ID | 作業 | 状態 | 規模 | 理由 |
|---:|---|---|---|---|---|
| 1 | A1 | Package公開境界を作る | ✅ 完了 | Large | 外部Plugin/Theme ecosystemの前提 |
| 2 | A1.5 | npm配布形式を完成させる | ✅ 完了 | Medium–Large | ESM + `.d.ts` + NodeNext + LICENSE + `pnpm pack` + external consumer検証済み |
| 3 | A1.6 | External Site Build E2E | ✅ 完了 | Medium | tarballのみで`check/doctor/inspect/build`、Bundler/NodeNext typecheckを保証 |
| **4** | **A3/A4** | **Root / Config resolutionを一本化** | 🔧 次 | Medium–Large | `projectRoot/appRoot/configRoot/contentRoot`を明確化。`workspaceRoot`の通常consumer依存を除去しCLI/HonoXでresolverを共有 |
| **5** | **A4.5** | **External HonoX/SSG境界を安定化** | 未着手 | Medium | `@hono/vite-ssg` patchがnpm consumerへ伝播しない問題、cwd依存を解消 |
| **6** | **A5** | **External Content Source / Vault対応を保証** | 未着手 | Medium | Site外のObsidian Vaultを正式サポート。`contentRoot`がproject外でも成立させる |
| **7** | **A5.5** | **Pluginのfilesystem直接依存を除去** | 未着手 | Medium–Large | attachment/excalidraw/diff等をContentSource/Asset境界へ移行 |
| **8** | **A2** | **Plugin間の直接依存を排除** | 未着手 | Medium | `garden-explorer → plugin-search`を切りPlugin独立性を確保 |
| 9 | R1 | Graph layout重複解消 | 未着手 | Medium | `local-graph` / `garden-explorer`の共通実装を抽出 |
| 10 | R2 | ContentManager責務分割 | 未着手 | Medium | 約490行の責務整理。A5.5後の境界を反映 |
| **11** | **A6** | **HonoX UI primitiveの境界固定** | 未着手 | Small | IntegrationがComponent Framework化するのを防ぎ、Site側の拡張境界を固定 |
| **12** | **A7** | **Site Application拡張contract** | 未着手 | Medium | 外部Siteの`routes/components/islands/style`の所有・override方法を正式化 |
| **13** | **A8** | **Local Plugin / Local Theme対応保証** | 未着手 | Medium | Site内extensionとnpm版を同一contractで扱えることをE2E保証 |
| 14 | C1/C2 | Content Query API | 未着手 | Medium | tag/folder/date/frontmatter等の共通問い合わせ基盤 |
| 15 | F1 | Taxonomy / Collection / Archive | 未着手 | Medium | Query APIを利用してtag/archive等を汎用化 |
| 16 | P1 | provides/requires規約整備 | 未着手 | Medium | capability systemを実Pluginで利用可能に |
| **17** | **S1** | **Publish Boundary / Leak Check** | 未着手 | Medium | Private Vaultから非公開note/attachmentが公開artifactへ漏れないことを保証 |
| 18 | C3 | Incremental build依存改善 | 未着手 | Medium | asset依存・build state APIを整理。外部Vault CIにも重要 |
| 19 | P2 | Plugin CSS contract | 未着手 | Medium | `rb-<plugin>-*`等のstable styling hookを定義 |
| 20 | R4 | `startBuild` lifecycle整理 | 未着手 | Small | 複数経路から呼ばれる問題を整理 |
| 21 | R5 | Backlink走査共通化 | 未着手 | Small | Core ContentGraphへ寄せる |
| 22 | R6 | clientEntries/endpoints規約 | 未着手 | Small | 外部Plugin author向けの正解パターンを固定 |
| **23** | **C4** | **HonoX高レベルhelper** | 未着手 | Medium | Vite/HonoX/SSR externals等の内部知識をconsumerから隠す |
| **24** | **D1** | **`create-riebeckite` / `riebeckite init`** | 未着手 | Large | 完成したSite Application contractからstarterを生成 |
| **25** | **D1.5** | **Cloudflare deployment template** | 未着手 | Medium | GitHub Actions + Workers Static Assetsの標準構成 |
| 26 | D2 | CLI config/scan重複削減 | 未着手 | Medium | command間のconfig/source解決重複を整理 |
| 27 | D3 | `inspect build`強化 | 未着手 | Small | invalid reason等を表示 |
| 28 | D4 | `doctor` build-state検証強化 | 未着手 | Medium | fingerprint不一致等を検出 |
| 29 | D5 | `profile` diagnostics対応 | 未着手 | Small | profile観測範囲を拡張 |
| 30 | D6 | CLI error renderer強化 | 未着手 | Small | error code/file/hint等を表示 |
| **31** | **D7** | **Dependency hygiene E2E** | 未着手 | Small–Medium | `apps/web`等のundeclared/hoisted dependency依存を検出 |
| 32 | F2 | Pagination | 未着手 | Small | Query APIへoffset/limit等を追加 |
| 33 | — | Related Posts Plugin | 未着手 | Small–Medium | ContentGraphを利用 |
| 34 | — | Reading Time Plugin | 未着手 | Small | 本文から読了時間算出 |
| 35 | — | OG Image Plugin | 未着手 | Medium | build時OG image生成 |
| 36 | — | Citation Plugin | 未着手 | Medium | 引用・参考文献管理 |
| 37 | — | Scheduled Publish表示Plugin | 未着手 | Small | PublishStrategyをUI/diagnosticsへ表示 |
