# Tasklist

実装対象を優先度順に並べたバックログ。エージェントが着手するときは、下の「実装メモ（agents 用）」を参照し、着手したら「状態」を `実施中` に更新する。

## 実装対象（優先度順）

| 順番 | ID | 作業 | 状態 | 規模 | 優先理由 |
|---:|---|---|---|---|---|
| 1 | F7 | 依存パッケージの既知脆弱性を修正版へ更新する（`pnpm audit` high 30 / moderate 26） | 未着手 | Medium | ロック済み `hono@4.12.26` 等が SSR 出力の漏えい・XSS・ReDoS・`toSSG()` の出力外書込みの修正未適用。本番の実行時リスク。上流更新が不可なら `pnpm.overrides`、`pnpm audit --prod` を gate 化 |
| 2 | F10 | 型チェックの偽陰性を解消する（strict 化と `apps/web` を含む project references 化） | 未着手 | Large | `pnpm typecheck` は packages を非 strict の個別 Program で検査し `apps/web` を除外するため、`apps/web/tsconfig.json` を直接 strict 実行すると `virtual:riebeckite/client` 宣言欠落・`PipelinePlugin` の型不整合・nullability 等で exit 1。Vite build 成功は型安全を保証しない |
| 3 | F12 | plugin 解決結果を不変化してキャッシュし、plugin name の一意性を必須にする | 未着手 | Medium | `PluginRuntime.plugins()`／`Pipeline.execute()`／`createContentRenderer()` が毎回 `resolvePlugins` を再実行する。cache と output ownership は `plugin.name` キーのため同名 instance で衝突し、依存検証も name 重複を検出しない |
| 4 | F13 | Plugin / ContentSource の build・dev 時キャッシュ失効機構を整理する | 未着手 | Medium | citations などの Plugin が Map<string, Promise<...>> で source 読み込み結果をキャッシュした場合、長時間稼働する dev server 中の source 編集を検知して失効する汎用 lifecycle がない。Citations 固有の仕組みは作らず、既存 Plugin の cache 利用状況を調査した上で framework-wide な invalidation の仕組みを設計する |

規模の目安: Small = 半日以内 / Medium = 1〜2 日 / Large = 複数日・複数パッケージ。

F7 は既存の指摘をコード確認で裏付けたもの、F10・F12 は今回のレビューで追加した項目。F8・F9 は対応済み（完了済み表を参照）。優先順は F7 → F10（型検査の復旧）→ F12 とし、F10 は F7 と同格として扱う。

## 完了済み

| ID | 作業 | 規模 | 実装結果・備考 |
|---|---|---|---|
| A | 安定 Content ID を Core に導入する（最小限） | 要調査 | `resolveContentStableId` を Core に実装し、manifest entry の `contentId` と `byContentId` 索引として公開。analytics プラグインが参照 |
| B | plugin-analytics を全面改修する（既存外部プロバイダ注入と置き換え） | 要調査 | provider/query/event の新設計に統一。plausible/umami/GA/custom の旧注入は除去済み |
| C | 単体テストランナーは導入しない | Small | 依存を増やさず E2E ハーネス＋golden で代替。需要が出れば recon Q3 の方針で再検討（後に node:test + tsx ベースの単体テストを導入し方針転換。Z を参照） |
| D | client config 伝達用の汎用機構を Core に導入する | 要調査 | `clientEntries` + `publicConfig` + `serializePublicClientConfig` を Core に実装。honox の `virtual:riebeckite/client` で配信 |
| E | Analytics Worker は独立デプロイにする（templates/analytics-cloudflare + createWorker API） | 要調査 | `createWorker` API と d1/kv templates を実装、main に統合済み |
| P1 | Generic Analytics 再設計: event model / AnalyticsProvider / Query model / client page_view | Large | event/provider/query/memory provider/init/options/client を実装済み。テストあり |
| P2 | @riebeckite/analytics-cloudflare: createWorker API + D1/KV Storage Adapter | Large | D1/KV storage、migration、worker テストまで実装済み |
| P3 | Analytics の diagnostics・テスト・docs・外部 E2E・全検証 | Large | diagnostics に `analytics-untracked` check を統合（読み取り専用）＋ `duplicate-content-id` / `invalid-content-id` の整合性チェックを追加、テストを拡充、docs（en/ja）を追加、外部 E2E（content-id 一意性検証含む）と Static Assets-only 回帰まで検証済み |
| 9 | ページ遷移時にノートタイトルが消える問題を修正する | 要調査 | h1 を持たないノートでも `getArticleTitle` で合成見出しを表示（`article.tsx` / `[slug{.+}].tsx` / `index.tsx`） |
| 10 | モバイル表示全般の対応を改善する | 要調査 | カラーモードスイッチのタップターゲット拡大、テーブルの横スクロール化など 375px 監査対応 |
| 11 | モバイル表示時にトップ余白が大きすぎる問題を修正する | Small | `shell.css` で `.riebeckite-page` のモバイル上余白を 4rem → 1rem に縮小（`48rem` 境界、他のモバイルブレークポイントと統一） |
| I | リリース手順を一本化する | Medium | `scripts/release.mjs` を新設。bump（`--dry-run` 対応）→ build → check 一括 → 依存グラフのトポロジカル順 publish → commit/tag。root に `release` スクリプト追加 |
| J | メタ情報のドリフトを解消する | Small | `taskfile.yaml` 削除、`create-riebeckite` の README_ja.md 追加と tarball 同梱（`files` 修正）、`apps/web` 依存ソート、`check_packages.mjs` で README_ja を必須化 |
| G | 型チェックを強制する | Medium | `build_package.mjs` が型エラー時に exit 1 するよう変更＋ `scripts/typecheck_packages.mjs`（`tsc --noEmit` 全 66 パッケージ集約）と root `typecheck` スクリプトを追加。`skipLibCheck: true` は維持 |
| 8 | plugin-breadcrumbs: スラッグの階層からパンくずを生成し構造化データ（BreadcrumbList）も出力する | Small | 新規 `packages/plugins/breadcrumbs/`。`onManifestCreated` で記事フラグメント先頭に `<nav data-breadcrumbs>` を挿入し、階層 BreadcrumbList を `entry.headTags` の `application/ld+json` として提供。`[slug{.+}].tsx` では seo プラグインの 2 階層 BreadcrumbList を除去して重複を回避 |
| 9 | plugin-sidenotes: 引用/脚注をマージン注にした Tufte 風サイドノートを実装する（脚注ポップオーバー付き） | Medium | 新規 `packages/plugins/sidenotes/`。GFM 脚注を rehype 変換でマージン注（デスクトップ）/ポップオーバー（モバイル）に書き換え。`rr-sidenotes__note` をブロック先祖の直後に配置、`data-footnotes` の定義と backlink は維持。client は 48rem 以上で無効化 |
| K | honox scaffold の型チェックエラーを確認する | Small | commit 1eda2b2 で既に解消済みと確認。`pnpm run typecheck` 68 packages OK、`check:scaffold` も PASS。変更不要 |
| L | JSON-LD（`<script type="application/ld+json">`）への XSS 対策を入れる | Small | `escapeScriptJson` を Core の `utils/html.ts` に集約し Core public API から export。`_renderer.tsx` と plugin-breadcrumbs の sink を修復、canvas / excalidraw / hover-preview のローカル実装を import に置換。commit 0f85b9e |
| M | レビュー時の `pnpm check --write .` で発生したフォーマット差分を整理する | Small | 作業ツリーはクリーン。ユーザー作業（OPTION_DEPTH / optionContext / renderOptions 等）は 1eda2b2 に保存済みで剰務なし |
| N | ルート `pnpm check` を書き込みモードから分離する（読み取り専用 `check` + 明示 `check:fix`） | Small | `package.json`: `check` → `biome check .`（読み取り専用）、`check:fix` → `biome check --write .` を新設。docs en/ja を更新。commit 7ae8a58 |
| P4 | 外部 E2E の `pnpm pack` フェーズを高速化する | Medium | `runAsync` を追加し並列度 4 の pool で `packPackages` を並列化。pack フェーズ 240 秒超 → ~80 秒に短縮、E2E フル PASS。commit 32d6a64 |
| R | plugin-taxonomy: タグ/フォルダ単位の索引ページとタグ別フィードを生成する | Medium | 新規 `packages/plugins/taxonomy/`。Core `buildContentCollections` で `/tags/<slug>`・`/folders/<path>` を生成、タグ別 RSS/Atom/JSON Feed を `context.output.emit` で静的出力、`/taxonomy/index.json` endpoint・関連タグ導線・`seo` 拡張を実装。`taxonomy({folderIndexes:true})`。commit 3e40585 |
| S | plugin-pdf: 添付 PDF をインラインビューアで表示する | Small | 新規 `packages/plugins/pdf/`。`.pdf` を `<object type="application/pdf">` で埋め込み、フォールバック DL リンクとメタ表示。renderer order:-20 で media/attachment より優先。commit 7a3b0b6 |
| T | plugin-share: 記事の共有ボタン群を追加する | Small | 新規 `packages/plugins/share/`。X/Bluesky/Mastodon/Facebook/LinkedIn/Hatena＋コピー。SSR リンク＋最小 client、`onManifestCreated` で entry.html / PostContent.html に注入。テスト13件。commit 2c59ce0 |
| U | plugin-map: `map` ブロック / frontmatter 座標から地図埋め込みを表示する | Medium | 新規 `packages/plugins/map/`。`map` フェンス/frontmatter を解析し静的フォールバック＋JSON を常時出力、`[data-rr-map]` がある時のみ Leaflet を遅延ロード。commit d106e48 |
| V | plugin-changelog: git 履歴から記事/サイトの変更履歴ページを生成する | Medium | 新規 `packages/plugins/changelog/`。git 履歴から per-note 変更履歴（`article.after-content` スロット）と `buildSiteChangelog` を提供。非 git は降格診断。route 非所有。commit 9bff854 |
| W | plugin-webmention: Webmention 受信 endpoint と「言及」表示を実装する | Large | 新規 `packages/plugins/webmention/`（provider 抽象・送信元検証・SSRF ガード付き fetcher・POST 受信/GET JSON feed・`rr-webmention`）と `packages/integrations/webmention-cloudflare/`（D1/KV storage・createWorker・migration）。Core の endpoint 型に POST を追加。テスト計20件。commit 170ee62 |
| Z | 単体テスト基盤と主要パッケージのテストを追加する | Large | node:test + tsx を継続し、依存ゼロの golden ヘルパー `tests/helpers/golden.ts` と root の `test` / `test:update`（`scripts/run_tests.mjs`）を新設。core＋19 プラグインに約305件のテストと golden を追加（`hasTests` を27プラグインへ拡張、各 package.json に `tsx` devDependency と `test` script、analytics / analytics-cloudflare の `tsx` 宣言漏れも修正）。`docs/en|ja/testing.md` を追加。既知の不具合は F1〜F6 に記録 |
| F1 | Core `extractFrontmatterAliases` が単数形 `alias:` を認識しない問題を修正する | Small | `content_metadata.ts` の正規表現を `alias(?:es)?` に修正し単数形・複数形の両方を認識。`packages/core/test/content_metadata.test.ts` を新設、alias プラグインに単数形ケースを追加。core 47 / alias 14 pass |
| F2 | plugin-code-annotations の HTML コメント形式 `<!-- [!code ...] -->` を解釈できるようにする | Small | インラインマーカーの HTML コメント分岐に欠けていた閉じ `\]` を追加。`focus`/`++`/`--`/`highlight:N` と非末尾 `<!--` のテストを追加。14 pass |
| F3 | plugin-query のタイトルリンクに `frontmatter.title` を反映する | Small | `renderTitleLink` が非空の `frontmatter.title` を優先し `entry.title` へフォールバック（`getManifestTitle` と同条件）。golden 2 件更新、テスト追加。23 pass |
| F4 | plugin-excalibrain の ontology 上書きをマージにし、sibling 推論の条件を整理する | Medium | `resolveOntology` をロール単位のマージ（既定＋上書き、FIELD_ROLE_ORDER 先勝ち維持）に変更。sibling 推論を `infer && siblings` に限定。テスト更新、英日 README 更新。20 pass |
| F5 | plugin-diff の日時表示をロケール/タイムゾーン非依存にする | Small | 共有 `formatDiffDate`（固定月名＋UTC getter）を新設し 2 コンポーネントから使用。TZ 非依存のテストを追加。12 pass |
| F6 | 既存の Biome フォーマット崩れ（`pnpm check` 143 件・既存テスト 7 ファイル）を解消する | Medium | 原因は作業ツリーの CRLF で、`.gitattributes` の `* text=auto eol=lf`（commit `30311c1`）によりクリーン checkout では既に防止済み。クリーン worktree で `pnpm check` が通過することを確認し、残っていた `useTemplate` info 1 件（webmention-cloudflare テスト）も修正して diagnostics 0 にした |
| F8 | plugin-webmention の送信元検証を修正する（リダイレクト SSRF と本文全読みのメモリ枯渇） | Medium | `redirect: "manual"` のループで各ホップを URL 正規化してから検査し、ホスト名に加えて DNS 解決後の IP も拒否リストで判定（解決関数は `resolveHostname` で注入可能、公開 API は維持）。本文は `response.body.getReader()` で上限到達時に即 cancel し、`Content-Length` でも事前確認。テスト 28 件追加。commit 4ea026c |
| F9 | analytics-cloudflare collector のイベント偽装を緩和する | Small | ドメインに `AnalyticsRateLimiter` 境界、infrastructure に D1（原子的な加算）と memory の実装、migration `0002` を追加。`createWorker` の `rateLimit` で IP 単位に固定時間窓の 429 を返し、D1 テンプレートは 60 回/60 秒で接続。KV は原子的加算ができず未対応とし Cloudflare Rate Limiting を案内。テスト 4 件追加。commit 00e3662 |

## 実装メモ（agents 用）

共通ルール:

- 着手時は「状態」を `実施中` に更新する。
- 完了時は実装内容を 1 行で「完了済み」表へ移し、ID は引き継ぐ。
- 変更前に `docs/en/framework/development.md` を読み、依存方向のルールを守る（Core にアプリ固有の import を置かない等）。
- 新規プラグインは `packages/plugins/related-posts` をテンプレートにする。

項目別メモ（F7〜F12）:

- F7: `pnpm audit --json` の実測は info 0 / low 4 / moderate 26 / high 30 / critical 0。`apps/web` の `hono` は `^4.12.25`（lock 4.12.26）で、4.12.34 未満の CORS ReDoS・4.13.5 未満の `toSSG()` 出力外書込みや parseBody メモリ枯渇の影響下。plugin-excalidraw（`@excalidraw/excalidraw` 配下の nanoid/lodash-es）、plugin-marp（`@marp-team/marp-core` 配下の `@xmldom/xmldom` 0.9.10）にも high 多数。開発/ビルド鎖（`brace-expansion` / `sharp` / `undici` / `postcss` / `@hono/node-server`）は切り分ける。
- F10: `scripts/typecheck_packages.mjs` は `strict` 未指定で各 package を個別 Program 化し `apps/web` を意図的に除外する。共通 strict tsconfig＋project references を導入し `tsc -b` を唯一の正とする。`PipelinePlugin` など Core 拡張型を正確化し、`virtual:riebeckite/client` の `.d.ts` を提供する。declaration emit を保つ場合も build と同一 tsconfig を使う。gate だけ先に足す場合は `tsc --project apps/web/tsconfig.json --noEmit` を CI/release に追加（根本解決ではない）。
- F8: 初期 URL のみ `isDisallowedHost` で文字列検査し、`fetch(url, { redirect: "follow" })` の先は未検査。DNS rebinding／ホスト名の私設 IP 解決も防げない。`redirect: "manual"` で各 hop を URL 正規化 → scheme/credential 禁止 → DNS/IP egress 方針で検査してから再取得し、本文は `response.body.getReader()` で上限到達時に即 cancel（圧縮展開後の bytes 含む）。timeout は全 hop の deadline にする。`verifyWebmention` は `parseWebmentionSource(document.html, source)` と元 source を base にしており、最終 URL を使っていない点も仕様化する。Node/Cloudflare 別の DNS/egress 保証を明示し、redirect-to-private・IPv6/IPv4-mapped・DNS rebinding・chunked oversized をテストする。generic plugin から安全でない既定 fetch を外し transport を必須注入にする選択肢もある。
- F9: `create_worker.ts` の POST `/events` は CORS のみ（`allowedOrigins: "any"` も可）。`Origin` は直接リクエストで偽装でき、contentId/occurredAt/path を任意投入できる。analytics を「未検証の best effort」と API/docs で明示し、管理・課金・ランキングの根拠にしない。正確性が要るなら Cloudflare WAF / Rate Limiting（IP・contentId・path）・Bot 対策・異常検知・集計レート制限を Worker 前置で入れる。静的サイトの署名トークン単独では漏えいして偽装を防がない。
- F12: 構成は ContentManager 生成時に固定されるため、constructor で一度だけ `resolvePlugins` して検証済み readonly list をキャッシュする。plugin の options を後から差し替える可変 API をサポートしている場合は破壊的になるため config は変更不可であることを明示する。resolved list で `plugin.name` の一意性を必須にする（cache/output ownership キーの衝突防止）。

（実装メモはすべて解決済み。次にプラグインを追加する際は `plugin-breadcrumbs` / `plugin-sidenotes` を新しいテンプレートにすると良い。）
