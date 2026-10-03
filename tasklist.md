# Tasklist

実装対象を優先度順に並べたバックログ。各項目は ID・作業・状態・規模・優先理由・完了条件を持つ。エージェントが着手するときは、下の「実装メモ（agents 用）」を参照し、着手したら「状態」を `実施中` に更新する。

## 実装対象（優先度順）

| ID | 作業 | 状態 | 規模 | 優先理由 | 完了条件 |
|---|---|---|---|---|---|
| CACHE2 | l10n 有効時の Persistent Per-Content Cache 全面 bypass を再監査し、安全にキャッシュ可能な単位へ縮小できるか検証する | 未着手 | Large | bypass は `isPersistentlyCacheable`（`content_persistent_cache.ts:306-316`, "Phase 1: l10n enabled -> bypass"）で l10n 有効時に無条件 `cacheable:false`。l10n は `outputDependencies: [{ type: "global" }]` を持ち global content metadata を使うため、実サイト構成でキャッシュ効果を失う | 現行 bypass 条件と l10n の実依存を起点に、content・locale・translation group・route/location を既存 dependency 契約で表現できるか検証する。安全に縮小可能なら実装と cold/incremental 同値テストを追加し、不可能または効果が小さい場合は根拠と計測値を残して対象外へ移す |
| HMR1 | visibility 変更と private→public 公開境界の変更伝播を横断検証する | 未着手 | Small | dependency ベースの incremental invalidation は実装・テスト済みで、note edit・transitive dependency・embed・asset・add/delete/rename・alias は `incremental_content_processing.test.ts` が網羅している。残るは visibility と公開境界の横断確認のみ | visibility 変更（draft↔published・private↔public）で、公開側 manifest・ページ・sitemap/feed 等の依存先が必要十分に invalidation されることを確認する。publication boundary を越えて private content が公開側へ漏れないことも確認し、不整合があれば修正と回帰テストを追加する |
| CI1 | Persistent Cache / Incremental SSG の CI キャッシュ再利用を再監査する | 未着手 | Small | `.github/workflows/ci.yml` は pnpm store のみをキャッシュし、build state / persistent cache の save/restore は無い。typecheck・test・scaffold は毎回フル。ただし CI は毎回クリーンチェックアウトのため再利用効果は要計測 | cold build と cache hit build の成果物同値性を保証できる state のみを対象に、実測上の効果が確認できる場合に限り cache save/restore を追加する。効果が無ければ計測値を残して対象外へ移す |
| DEV1 | custom HonoX dev server entry 使用時の content asset 配信を監査する | 未着手 | Small | content asset ミドルウェアが entry を `appRoot()/app/server.ts` にハードコードしており（`content_assets.ts:62`）、custom dev entry では manifest 解決に失敗して画像 / 添付の dev 配信が 404 になり得る。標準契約は default entry 前提 | dev 配信が default `app/server.ts` entry 前提であることを確認済み。entry を設定から解決するか、この制約を docs に明記する。修正する場合は custom entry での回帰テストを追加する |
| DX1 | `doctor` / `inspect` / build diagnostics の説明能力を再監査する | 未着手 | Small | doctor は build state の有効性・不一致内訳・invalid 理由を、inspect は build state・config exclude 件数・plugin provides/requires・content・graph を既に説明する。不足は doctor の `content.exclude` パターン数・除外理由と persistent cache / invalidation 状態 | 既存出力で説明できている項目は維持し、不足する除外理由と cache/invalidation 状態だけを doctor/inspect に追加する。除外パターン数・除外理由、persistent cache の有効/無効、build state の再利用可否を説明でき、通常出力を過剰に増やさないことをテストする |
| GRAPH1 | 大規模 Vault における Graph 描画の性能境界を計測する | 未着手 | Small | 500 nodes guard は `shouldGuardForceLayout`（`graph_layout.ts:37-39`）として実装・テスト済み（`garden-explorer.test.ts:170-231`）。global force layout が ≥500 nodes で radial へフォールバックし凍結を防止するため、計測の実益は限定的 | 500 / 1000 / 2000 nodes で初期描画・layout・zoom/pan・drag を計測するハーネスを用意し、明確な問題が確認された場合のみ最適化する。Canvas/WebGL 等への置換は計測根拠なしでは行わない |
| NAV1 | サイト全体ナビゲーションの authored 設定モデルを Core に追加する | 未着手 | Small | 生成ヘッダはホームリンク1本のみで、作者が設計するグローバルナビを表現する設定が Core に無い。Web サイト用途の土台 | `navigation`（header/footer・ラベル・リンク・子項目・外部リンク）の型と既定値、`riebeckite check` の検証、resolve/validate の単体テストを追加する。描画は対象外。依存なし |
| NAV2 | 生成アプリで authored navigation をヘッダ・フッタ・モバイルドロワーに描画する | 未着手 | Medium | NAV1 の設定を表示する経路が無く、`siteHeader()` はホームリンクとカラートグルのみ | starter/showcase の生成サイトでヘッダ/フッタのリンクとドロワーが動作し現在ページが強調される。minimal/empty は不変。`check_scaffold` を更新。依存: NAV1 |
| NAV3 | Plugin が navigation item を提供できる任意契約を追加する | 未着手 | Medium | plugin の `pageTypes` は route を登録するがリンク契約が無く、`/explore`・`/tags` 等を app へ直書きすると taxonomy の `tagsBasePath` 変更で drift する。MVP は config のみで成立するため、config 運用で不足が確認できた場合に実施 | plugin がラベル付きリンクを宣言でき、authored nav とマージ・重複診断される。契約テストを追加。依存: NAV1 |
| NAV4 | サイトクロームの構造フックと既定スタイルを整備する | 未着手 | Small | header/footer/drawer の theme styling 点が無く、theme は presentation-only のため構造フックが必要 | `rb-site-header`/`rb-nav`/`rb-site-footer` 等の安定フックを描画側に付与し、既定スタイルと theme 向けドキュメントを追加する。依存: NAV2 |
| NAV5 | ナビゲーションの責務分離と設定方法を docs に記載する | 未着手 | Small | navigation 設定が未文書化。plugin page が body のみ描画される実態と docs の記述に差がある | configuration リファレンスと guide に nav 設定、Site Navigation / Content Discovery / Content Relationship の分離、plugin page のクローム挙動を日英で追記する。依存: NAV1, NAV2 |
| DISC1 | archive を Core の collection 機構を再利用した plugin として提供する | 未着手 | Medium | 月別アーカイブは reference app の `lib/collections.ts` と `archive/[slug{.+}]` にのみ存在し、どの preset も生成しない。`buildContentCollections` は Core にあり plugin 化できる | plugin を有効化すると `/archive/...` が生成され、ページネーションと locale ラベルが動作する。契約/回帰テストを追加。依存なし |
| DISC2 | taxonomy に全タグ・全フォルダの一覧ページを追加する | 未着手 | Small | term ページはあるが一覧が無く `/tags`・`/folders` へ遷移できない。`buildTaxonomyIndex` と `/taxonomy/index.json` が既にあり新規 Core 不要 | `tagsBasePath`/`foldersBasePath` を尊重した一覧ページを pageType として追加し term へリンクする。テストを追加。依存なし |
| DISC3 | series の一覧・ランディングページを追加する | 未着手 | Small | `renderSeriesIndex`/`buildSeriesIndex` は公開済みだが route から使われず、各ノートの nav しか無い | `/series/<name>`（必要なら `/series` 一覧）を pageType で生成し、順序と現在位置を表示する。依存なし |
| DISC4 | folder-pages / breadcrumbs / local-graph を preset と docs に組み込む | 未着手 | Small | section landing と階層ナビの plugin は存在するが starter/showcase に入っておらず発見できない。新規実装は不要 | 採用 plugin を preset に追加し、`check_scaffold` と日英 docs を更新する。依存なし |
| DISC5 | Homepage の発見導線（Featured / All posts / Series index）を既存 plugin のレシピとして文書化する | 未着手 | Small | 生成 homepage は RecentPosts と bodySlots のみ。`query`/`dataview` で表現可能なものを新規 Core にしない方針を確定する | index.md から query/dataview/recent-posts/taxonomy/series を使う具体例を docs に追加する。コード追加はレシピで不足する場合のみ。依存なし |
| DISC6 | 通常記事の Previous / Next ナビゲーションを追加する | 未着手 | Small | prev/next は docs plugin と series 内に限定され、一般的なブログ記事には無い | 公開順（`buildContentCollections` 等）に基づく記事 prev/next を既存 slot/component として提供し、端の記事で非表示にする。依存なし |
| DEP1 | 別 content repository 構成のセットアップ UX を改善する | 未着手 | Small | private content では 2 つの secret と `github/notify-site.yml` の手動コピーが必要で見落としやすい | next-steps と生成物に secret 一覧とコピー手順を明示し、docs のチェックリストを整備する。依存なし |
| DEP2 | deployment/docs の不整合を修正する | 未着手 | Small | `content.directory` の相対/絶対説明の不一致、ja/en のリンク先差分など初回利用者の混乱要因 | 該当記述を実装に合わせて統一し、link check（`check_docs`）を通す。依存なし |

規模の目安: Small = 半日以内 / Medium = 1〜2 日 / Large = 複数日・複数パッケージ。

## 完了済み

| ID | 作業 | 規模 | 実装結果・備考 |
|---|---|---|---|
| PAGE1 | Plugin Page Type の route collision と優先順位契約を監査する | Small | `PluginPageType.priority`（`plugin_page.ts:36-37`）と resolver `resolvePage`（`plugin_runtime.ts:271-283`）が優先度契約を実装済み。同一 route で最高 priority が複数なら throw し、サイレント解決しない。重複 pageType ID も解決時に拒否。`plugin_page.test.ts` に同 priority 衝突・priority 選択・directory-index 衝突・重複 ID のテストあり。追加実装は不要 |

## 再監査で対象外とした項目

実装対象から除外した項目と理由。再度バックログへ戻す場合は、下記の前提が崩れた根拠を示すこと。

- OC1: 本番は cloudflare-workers アダプタで影響しない。テスト用途は `apps/web` が `@hono/node-server` を明示宣言しており通過する。上流 `@hono/vite-build` の依存宣言漏れであり Riebeckite 側の実装対象外。
- OC3: `public` 削除時は常にフル再生成して生成物を正しく復元する。測定された性能問題はなく、shadow-state を persistent cache に足すのは投機的複雑化。
- I18N2: サイト全体の単一言語 `description` 契約であり taxonomy 固有の不具合ではない。taxonomy だけ locale 化すると責務境界が不自然になる。
- I18N3: `/themes` は固定のテーマギャラリー（デモ）で、l10n コンテンツ契約の違反ではない。
- CACHE1: `processedContentCache.version` の手動更新が正式な invalidation 契約として機能し、テストと docs で裏付けられている。外部ヘルパーソースの自動解析は投機的。
- TEST1: React シムは 3 テストファイルの局所回避に留まり増殖していない。テスト基盤を Vitest へ移す理由が無く、広がった時点で再検討する。
- META1: SEO plugin（`packages/plugins/seo/src/metadata.ts`）が title・description・canonical・OG・Twitter をフォールバック付きで一貫生成し、taxonomy は SEO provider へ委譲する。l10n は翻訳を別コンテンツとして扱い各ファイルが自分の frontmatter を持つため、タイトルが「未翻訳」になるのは不整合ではない。今回の調査では実在する drift を確認できなかった。再開条件: 通常記事・Page Type・l10n・custom permalink のいずれかで metadata の drift が具体的に観測されたとき。

## 実装メモ（agents 用）

共通ルール:

- 着手時は「状態」を `実施中` に更新する。
- 実装前に最新 `main` の実コード・テスト・設定を確認し、過去の監査結果だけを根拠に修正しない。
- 問題を再現できない、既に解決済み、または現在の契約として妥当な場合はコードを変更しない。
- 性能改善は変更前後を計測し、実測上の改善が確認できる場合のみ採用する。
- 新しい抽象化・永続 state・独自 cache を、将来必要になるかもしれないという理由だけで追加しない。
- 既存の Core / Plugin / HonoX の責務境界を優先し、局所的な workaround で契約を迂回しない。
- 修正時は対象となる regression / contract test を追加する。
- 完了時は実装内容を 1 行で「完了済み」表へ移し、ID は引き継ぐ。
- 各項目の完了条件は実装対象表の「完了条件」列を参照する。
