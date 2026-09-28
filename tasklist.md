| 順番 | ID | 作業 | 状態 | 規模 | 理由 |
|---:|---|---|---|---|---|
| 1 | A1 | Package公開境界を作る | ✅ 完了 | Large | 外部Plugin/Theme ecosystemの前提 |
| 2 | A1.5 | npm配布形式を完成させる | ✅ 完了 | Medium–Large | `dist/*.js` + `.d.ts` + `pnpm pack`。monorepo外のconsumer fixtureから実際にinstall/buildするところまで検証済み |
| 3 | A1.6 | External Site E2Eを作る | ✅ 完了 | Medium | `node_modules/@riebeckite/*`だけで`check/doctor/inspect/build`できることを`pnpm test:e2e:external`で保証 |
| **4** | **A3/A4** | **config/root解決を一本化** | 未着手 | Medium | `workspaceRoot/appRoot/configRoot/projectRoot/contentRoot`を整理。外部Site/Vault対応の前提 |
| **5** | **A5** | **External Content Source / Vault対応を保証** | 未着手 | Medium | `rerurate-site`の外にあるObsidian Vaultを正式サポート。`../articles`等をE2E検証 |
| **6** | **A5.5** | **Pluginのfilesystem直接依存を除去** | 未着手 | Medium–Large | attachment/excalidraw/diff等を`content.directory`直接参照からContentSource/Asset境界へ寄せる |
| **7** | **A2** | **Plugin間の直接依存を排除** | 未着手 | Medium | `garden-explorer → plugin-search`を切りPlugin独立性を確保 |
| 8 | R1 | Graph layout重複解消 | 未着手 | Medium | `local-graph` / `garden-explorer`共通化 |
| 9 | R2 | ContentManager責務分割 | 未着手 | Medium | 約490行の責務整理。A5.5後の境界を反映 |
| **10** | **A6** | **HonoX UI primitiveの境界固定** | 未着手 | Small | Site Applicationが何を利用・overrideできるかの基礎 |
| **11** | **A7** | **Site Application拡張contract** | 未着手 | Medium | 外部Siteの`routes/components/islands/style`の所有・拡張方法を正式化 |
| **12** | **A8** | **Local Plugin / Local Theme対応保証** | 未着手 | Medium | Site内Plugin/Themeとnpm版を同じcontractで扱えることをE2E保証 |
| 13 | C1/C2 | Content Query API | 未着手 | Medium | tag/folder/date/frontmatter問い合わせ基盤 |
| 14 | F1 | Taxonomy / Collection / Archive | 未着手 | Medium | Query API利用 |
| 15 | P1 | provides/requires規約整備 | 未着手 | Medium | capability systemを実Pluginで利用可能に |
| **16** | **S1** | **Publish Boundary / Leak Check** | 未着手 | Medium | Private Vaultから非公開note/attachmentが`dist`へ漏れないことを保証 |
| 17 | C3 | Incremental build依存改善 | 未着手 | Medium | asset依存・build state API整理。外部Vault CIにも重要 |
| 18 | P2 | Plugin CSS contract | 未着手 | Medium | stable styling hook |
| 19 | R4 | `startBuild` lifecycle整理 | 未着手 | Small | 複数経路問題 |
| 20 | R5 | Backlink走査共通化 | 未着手 | Small | Core ContentGraphへ |
| 21 | R6 | clientEntries/endpoints規約 | 未着手 | Small | 外部Plugin author向けcontract |
| **22** | **C4** | **HonoX高レベルhelper** | 未着手 | Medium | 外部SiteからHonoX/Vite内部知識を減らす |
| **23** | **D1** | **`create-riebeckite` / `riebeckite init`** | 未着手 | Large | `rerurate-site`型Applicationを生成。外部consumer contract完成後に着手 |
| **24** | **D1.5** | **Cloudflare deployment template** | 未着手 | Medium | GitHub Actions + Workers Static Assetsの標準構成 |
| 25 | D2 | CLI config/scan重複削減 | 未着手 | Medium | command間の重複削減 |
| 26 | D3 | `inspect build`強化 | 未着手 | Small | invalid reason等 |
| 27 | D4 | `doctor` build-state検証強化 | 未着手 | Medium | fingerprint不一致検出 |
| 28 | D5 | `profile` diagnostics対応 | 未着手 | Small | 観測範囲拡張 |
| 29 | D6 | CLI error renderer強化 | 未着手 | Small | code/file/hint |
| 30 | F2 | Pagination | 未着手 | Small | Query API拡張 |
| 31 | — | Related Posts Plugin | 未着手 | Small–Medium | ContentGraph利用 |
| 32 | — | Reading Time Plugin | 未着手 | Small | 本文から算出 |
| 33 | — | OG Image Plugin | 未着手 | Medium | build時生成 |
| 34 | — | Citation Plugin | 未着手 | Medium | 引用・参考文献 |
| 35 | — | Scheduled Publish表示Plugin | 未着手 | Small | PublishStrategyをUI/diagnosticsへ |
