# Tasklist

実装対象を優先度順に並べたバックログ。エージェントが着手するときは、下の「実装メモ（agents 用）」を参照し、着手したら「状態」を `実施中` に更新する。

## 実装対象（優先度順）

| 順番 | ID | 作業 | 状態 | 規模 | 優先理由 |
|---:|---|---|---|---|---|
| — | — | （バックログ内の実装対象はすべて完了） | 完了 | — | — |

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

## 実装メモ（agents 用）

共通ルール:

- 着手時は「状態」を `実施中` に更新する。
- 完了時は実装内容を 1 行で「完了済み」表へ移し、ID は引き継ぐ。
- 変更前に `docs/en/development.md` を読み、依存方向のルールを守る（Core にアプリ固有の import を置かない等）。
- 新規プラグインは `packages/plugins/related-posts` をテンプレートにする。

（実装メモはすべて解決済み。次にプラグインを追加する際は `plugin-breadcrumbs` / `plugin-sidenotes` を新しいテンプレートにすると良い。）