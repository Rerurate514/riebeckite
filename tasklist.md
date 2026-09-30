# Tasklist

実装対象を優先度順に並べたバックログ。エージェントが着手するときは、下の「実装メモ（agents 用）」を参照し、着手したら「状態」を `実施中` に更新する。

## 実装対象（優先度順）

| 順番 | ID | 作業 | 状態 | 規模 | 優先理由 |
|---:|---|---|---|---|---|
| 1 | R | plugin-taxonomy: タグ/フォルダ単位の索引ページとタグ別フィードを生成する | 完了（未マージ task/r-taxonomy） | Medium | `query`/`dataview` は記事内の一覧のみ。`/tags/<tag>`・`/folders/<path>` の固定ページとタグ別 RSS/Atom/JSON Feed、関連タグ導線を `resolveContentLocations` と `endpoints` で提供する。回遊性と SEO に効く |
| 2 | S | plugin-pdf: 添付 PDF をインラインビューアで表示する | 完了（未マージ task/s-pdf） | Small | `attachment` はダウンロードリンク中心。`kind: "pdf"` を renderer で埋め込み表示に変える。既定はブラウザ標準 viewer、必要な場合だけ client を足す |
| 3 | T | plugin-share: 記事の共有ボタン群を追加する | 完了（未マージ task/t-share） | Small | `text-fragment`・`qr-code` は近いが共有 UI がない。SSR でリンクを生成し client は最小限。site 設定で対象サービスを選べるようにする |
| 4 | U | plugin-map: `map` ブロック / frontmatter 座標から地図埋め込みを表示する | 完了（未マージ task/u-map） | Medium | geo 系が皆無。タイル地図はクライアント前提なので markmap と同様に遅延ロードし、静的フォールバック（座標・リンク）を先に出す |
| 5 | V | plugin-changelog: git 履歴から記事/サイトの変更履歴ページを生成する | 完了（未マージ task/v-changelog） | Medium | `diff` は記事内の差分表示。こちらは「いつ何を更新したか」の一覧。git を読む点は diff と共有し、ページ生成は application route に委ねる境界を守る |
| 6 | W | plugin-webmention: Webmention 受信 endpoint と「言及」表示を実装する | 完了（未マージ task/w-webmention） | Large | 読者参加系で唯一の空白。送信元検証・保存・描画が必要。`endpoints` と独立 Worker（analytics-cloudflare と同型）を使い、comments 系の土台にもなる |

規模の目安: Small = 半日以内 / Medium = 1〜2 日 / Large = 複数日・複数パッケージ。

## 完了済み

| ID | 作業 | 規模 | 実装結果・備考 |
|---|---|---|---|
| A | 安定 Content ID を Core に導入する（最小限） | 要調査 | `resolveContentStableId` を Core に実装し、manifest entry の `contentId` と `byContentId` 索引として公開。analytics プラグインが参照 |
| B | plugin-analytics を全面改修する（既存外部プロバイダ注入と置き換え） | 要調査 | provider/query/event の新設計に統一。plausible/umami/GA/custom の旧注入は除去済み |
| C | 単体テストランナーは導入しない | Small | 依存を増やさず E2E ハーネス＋golden で代替。需要が出れば recon Q3 の方針で再検討 |
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

## 実装メモ（agents 用）

共通ルール:

- 着手時は「状態」を `実施中` に更新する。
- 完了時は実装内容を 1 行で「完了済み」表へ移し、ID は引き継ぐ。
- 変更前に `docs/en/development.md` を読み、依存方向のルールを守る（Core にアプリ固有の import を置かない等）。
- 新規プラグインは `packages/plugins/related-posts` をテンプレートにする。

（実装メモはすべて解決済み。次にプラグインを追加する際は `plugin-breadcrumbs` / `plugin-sidenotes` を新しいテンプレートにすると良い。）