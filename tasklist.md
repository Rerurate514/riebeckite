# Tasklist

実装対象を優先度順に並べたバックログ。各項目は ID・作業・状態・規模・優先理由・完了条件を持つ。エージェントが着手するときは、下の「実装メモ（agents 用）」を参照し、着手したら「状態」を `実施中` に更新する。

## 実装対象（優先度順）

| ID | 作業 | 状態 | 規模 | 優先理由 | 完了条件 |
|---|---|---|---|---|---|
| DISC6 | 通常記事の Previous / Next ナビゲーションを追加する | 実施中 | Small | prev/next は docs plugin と series 内に限定され、一般的なブログ記事には無い | 公開順（`buildContentCollections` 等）に基づく記事 prev/next を既存 slot/component として提供し、端の記事で非表示にする。依存なし |

規模の目安: Small = 半日以内 / Medium = 1〜2 日 / Large = 複数日・複数パッケージ。

## 再監査で対象外とした項目

実装対象から除外した項目と理由。再度バックログへ戻す場合は、下記の前提が崩れた根拠を示すこと。

- OC1: 本番は cloudflare-workers アダプタで影響しない。テスト用途は `apps/web` が `@hono/node-server` を明示宣言しており通過する。上流 `@hono/vite-build` の依存宣言漏れであり Riebeckite 側の実装対象外。
- OC3: `public` 削除時は常にフル再生成して生成物を正しく復元する。測定された性能問題はなく、shadow-state を persistent cache に足すのは投機的複雑化。
- I18N2: サイト全体の単一言語 `description` 契約であり taxonomy 固有の不具合ではない。taxonomy だけ locale 化すると責務境界が不自然になる。
- I18N3: `/themes` は固定のテーマギャラリー（デモ）で、l10n コンテンツ契約の違反ではない。
- CACHE1: `processedContentCache.version` の手動更新が正式な invalidation 契約として機能し、テストと docs で裏付けられている。外部ヘルパーソースの自動解析は投機的。
- TEST1: React シムは 3 テストファイルの局所回避に留まり増殖していない。テスト基盤を Vitest へ移す理由が無く、広がった時点で再検討する。
- META1: SEO plugin（`packages/plugins/seo/src/metadata.ts`）が title・description・canonical・OG・Twitter をフォールバック付きで一貫生成し、taxonomy は SEO provider へ委譲する。l10n は翻訳を別コンテンツとして扱い各ファイルが自分の frontmatter を持つため、タイトルが「未翻訳」になるのは不整合ではない。今回の調査では実在する drift を確認できなかった。再開条件: 通常記事・Page Type・l10n・custom permalink のいずれかで metadata の drift が具体的に観測されたとき。
- DEV1: custom dev entry は未サポートで、HonoX の entry は `app/server.ts` に固定されている（`content_assets.ts:62`、`vite_runner.ts`）。`appRoot` 以外の entry を設定する経路が無く、404 になる custom entry 構成は再現しない。再開条件: custom dev entry をサポートしたとき。
- DEP2: `content.directory` は日英とも一貫して `appRoot` 基準と説明され、`check_docs` の en/ja path parity も通る。README の `_en`/`_ja` 差分は意図的な言語別リンクで不整合ではない。実在する記述不一致を確認できなかった。再開条件: `check_docs` が落ちる、または利用者が具体的な記述不一致を報告したとき。
- CACHE2: l10n 有効時の Persistent Per-Content Cache bypass は維持する。l10n の per-content 変換（`remarkLocalizedLinks`）は translation group に「現在存在する翻訳の集合」で解決先が変わり、新規翻訳ファイルの追加はキャッシュ記録時の依存（`content`/`file`/`link`）に現れない。bypass を外し l10n に `processedContentCache.dependencyMode:"tracked"` を与えた実験では、`source.ja.md` のリンクが `/en/target` のまま stale になり cold build の `/target` と不一致になった。既存 dependency 契約では「まだ存在しない翻訳」を表現できず、安全に縮小するには l10n 固有の global fingerprint を cache key へ導入する（Core が plugin の意味論を知る／新しい global 依存機構＝第二の dependency graph）ことになり方針に反する。よって実装しない。再開条件: 既存契約で translation group の集合変化を表現する手段、または per-content の global 入力契約が導入されたとき。

- NAV3: taxonomy の `tagsBasePath` / `foldersBasePath`、series / archive の `basePath`、garden-explorer の固定 `/explore` を確認した。Plugin は Page Type を登録するだけで header/footer を変更せず、`navigation` が最終的な掲載構成を所有する。可変 route は `const discoveryPaths = { tags: "/topics", folders: "/directories", series: "/guides", archive: "/history" }` のように同一の TypeScript 設定値を Plugin option と `navigation` に渡せるため、二重記述は自然に回避できる。Plugin の無効化時にも authored navigation は意図的に残る通常リンクとして Site が管理できる。navigation contribution、stable ID、placement、重複診断を導入する実害は確認できなかった。再開条件: 同一設定値を共有できない実在 Plugin Page Type で、authored navigation により回避不能な route/link drift が再現されたとき。

- CI1: `.github/workflows/ci.yml` の check / typecheck / test / scaffold はいずれもサイトビルド（`apps/web build`）を実行せず、persistent content cache / build state を生成しない。CI に再利用対象が存在しないため cache 追加は短縮に結びつかない。ローカル実測: `build:packages` 37.3s、`typecheck` 80.2s、`pnpm -r test` 176.9s、check ジョブ計 ~3.4s（biome 993ms / docs 794ms / packages 550ms / dependencies 528ms / templates 514ms）、`check:scaffold` 7.7s。唯一の理論的削減は `packages/*/dist` をキャッシュして 3 ジョブの `build:packages`（37s×3）を省くことだが、これは persistent cache / build state ではなく、ソースハッシュを鍵にしない限り成果物同値性を保証できず save/restore コストも伴うため採用しない。なお `.github/workflows/deploy.yml` は `apps/web/.riebeckite/cache` と `build/content-state.json`（11.7MB）を restore するが、docs サイトは l10n 有効のため `isPersistentlyCacheable("", config).cacheable` が false となり persistent cache への書き込みも build state / manifest 再利用も行われない（`cache/content` は存在せず `cache/rename` のみを確認）。deploy の cache は現状再利用効果が無く約12MB の転送のみだが、deploy 変更は本項目の対象外のため変更していない。計測上の改善効果がないため対象外。再開条件: CI ジョブがサイト / Vault ビルドを実行するようになったとき、または docs サイトの l10n による bypass が解消されたとき。GitHub Actions 固有の実測時間はローカルでは取得できないが、対象ステップが存在しないため結論は環境非依存。
- GRAPH1: `FORCE_LAYOUT_CONFIRM_NODE_COUNT=500` と `shouldGuardForceLayout`（`layout==="force" && mode==="global" && nodeCount>=500 && !approved`）、guard 時の `layoutRadialGraph` フォールバックは実装・テスト済み（`garden-explorer.test.ts`）。Node 実測（純計算）: `layoutRadialGraph` は 500 / 1000 / 2000 nodes で 0.04 / 0.07 / 0.13ms（O(n)）、`layoutForceGraph` は 200 / 350 / 499 nodes で 158.7 / 387.8 / 897.2ms（O(iterations·n²)。外挿で 1000→~3.6s、2000→~14s となり main thread を凍結）。500 以上の global force は guard により radial へ落ちるためこの凍結経路は回避される。実 Chromium（headless, puppeteer, 1280×900）計測: 初期描画は 200 / 350 / 499 / 500 / 1000 / 2000 nodes で 2.3 / 2.4 / 2.3 / 2.3 / 4.9 / 8.5ms、zoom / pan / drag の中央値は 2000 nodes でも 0.1〜0.2ms。明確な性能問題は確認されなかった。再現手段として `scripts/benchmark_graph_render.mjs`（Node で layout を計測し、component と同じ単一 `<g transform>` + `<line>` / `<circle>` 構成の自己完結 HTML を生成、ブラウザで初期描画 / zoom / pan / drag を計測）を追加。Canvas / WebGL / Worker / 仮想化 / 新 layout engine は不要。現状で十分なため対象外。再開条件: 2000 nodes 超の Vault で実描画・操作に明確な遅延が観測されたとき、または guard を外して大規模 global force を許可する仕様変更を行ったとき。

## 実装メモ（agents 用）

共通ルール:

- 着手時は「状態」を `実施中` に更新する。
- 実装前に最新 `main` の実コード・テスト・設定を確認し、過去の監査結果だけを根拠に修正しない。
- 問題を再現できない、既に解決済み、または現在の契約として妥当な場合はコードを変更しない。
- 性能改善は変更前後を計測し、実測上の改善が確認できる場合のみ採用する。
- 新しい抽象化・永続 state・独自 cache を、将来必要になるかもしれないという理由だけで追加しない。
- 既存の Core / Plugin / HonoX の責務境界を優先し、局所的な workaround で契約を迂回しない。
- 修正時は対象となる regression / contract test を追加する。
- 完了時は該当行をタスクリストから削除する（「完了済み」表は残さない）。
- 各項目の完了条件は実装対象表の「完了条件」列を参照する。
