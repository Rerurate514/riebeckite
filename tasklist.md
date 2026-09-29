# Tasklist

実装対象を優先度順に並べたバックログ。エージェントが着手するときは、下の「実装メモ（agents 用）」を参照し、着手したら「状態」を `実施中` に更新する。

## 実装対象（優先度順）

| 順番 | ID | 作業 | 状態 | 規模 | 優先理由 |
|---:|---|---|---|---|---|
| 1 | I | リリース手順を一本化する（bump → check:packages → publish を 1 本化） | 決定済み | Medium | version 一括変更が手動で、多数の package.json に未コミット差分を生みやすい |
| 2 | J | メタ情報のドリフトを解消する（`taskfile.yaml` 削除、`create-riebeckite` の README_ja 追加、`apps/web` 依存一覧の自動化 or ソート） | 決定済み | Small | 手書きメンテ由来の不整合が散見される |
| 3 | G | 型チェックを強制する（`tsc --noEmit` の導入と `build_package.mjs` の型エラー失敗化） | 未着手 | Medium | `build_package.mjs` は型エラーをログするだけで exit 1 しない。`skipLibCheck: true` の妥当性も再検討 |
| 4 | — | plugin-breadcrumbs: スラッグの階層からパンくずを生成し構造化データ（BreadcrumbList）も出力する | 未着手 | Small | 階層ナビゲーションの欠落を補う。renderer + seo で実装可能 |
| 5 | — | plugin-sidenotes: 引用/脚注をマージン注にした Tufte 風サイドノートを実装する（脚注ポップオーバー付き） | 未着手 | Medium | remark/rehype + CSS + client で完結。読書体験の差別化。既存の脚注（GFM）と互換 |

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
| P3 | Analytics の diagnostics・テスト・docs・外部 E2E・全検証 | Large | diagnostics に `analytics-untracked` check を統合（読み取り専用）、テストを拡充、docs（en/ja）を追加、外部 E2E と Static Assets-only 回帰まで検証済み |
| 9 | ページ遷移時にノートタイトルが消える問題を修正する | 要調査 | h1 を持たないノートでも `getArticleTitle` で合成見出しを表示（`article.tsx` / `[slug{.+}].tsx` / `index.tsx`） |
| 10 | モバイル表示全般の対応を改善する | 要調査 | カラーモードスイッチのタップターゲット拡大、テーブルの横スクロール化など 375px 監査対応 |
| 11 | モバイル表示時にトップ余白が大きすぎる問題を修正する | Small | `shell.css` の `@media (max-width: 42rem)` で `.riebeckite-page` の padding-block を 4rem → 1.5rem に縮小 |

## 実装メモ（agents 用）

共通ルール:

- 着手時は「状態」を `実施中` に更新する。
- 完了時は実装内容を 1 行で「完了済み」表へ移し、ID は引き継ぐ。
- 変更前に `docs/en/development.md` を読み、依存方向のルールを守る（Core にアプリ固有の import を置かない等）。
- 新規プラグインは `packages/plugins/related-posts` をテンプレートにする。

### 1. I: リリース手順の一本化（Medium）

- **対象**: 既存の `scripts/bump_version.mjs`（公開パッケージ全 version を一括更新）・`scripts/package_metadata.mjs`（PACKAGE_DIRECTORIES が公開対象一覧）・`scripts/check_packages.mjs`、新規 `scripts/release.mjs` または root script、各パッケージの `prepack`
- **前提**: 公開対象パッケージがすべて `package_metadata.mjs` に登録済み（l10n は登録済み）
- **手順**: `pnpm bump:version <v>` → `pnpm build:packages` → `pnpm check:packages && pnpm check:dependencies` → `pnpm -r publish`（ワークスペースのトポロジカル順：core → integrations/honox → plugins/themes → cli → create-riebeckite）→ git tag / commit
- **完了条件**: コマンド 1 本で漏れなく・依存順どおり publish される。`--dry-run` で事前検証できる

### 2. J: メタ情報のドリフト解消（Small）

- **対象**: `taskfile.yaml`（削除）、`packages/create-riebeckite`（`README_ja.md` 追加）、`apps/web/package.json`（dependencies の整列）、必要なら `scripts/check_packages.mjs` で README_ja も強制
- **前提**: なし
- **手順**: `taskfile.yaml` を削除 → `create-riebeckite` の README_ja.md を README.md から翻訳して追加 → `apps/web` 依存をアルファベット順に整理。`check_packages.mjs` で README_ja 必須化を追加するか要判断
- **完了条件**: `pnpm check:packages` 通過。不要ファイルが消え、README が英語/日本語で揃う

### 3. G: 型チェックの強制（Medium）

- **対象**: `scripts/build_package.mjs`（型エラー時に exit 1）、各パッケージまたはルートの `tsc --noEmit` スクリプト、`tsconfig.json`（`include` は現状 `riebeckite.config.ts` のみ）、`skipLibCheck` の扱い
- **前提**: なし（着手前に既存の型エラー数を把握する）
- **手順**: 全ソースに対して `tsc --noEmit` 相当を試行し現状のエラーを列挙 → `build_package.mjs` を `errors.length > 0` で `process.exitCode = 1` に変更 → 既存エラーを順次解消 → 必要ならパッケージ単位の typecheck スクリプトとルート集約を追加
- **完了条件**: 型エラーがビルドを失敗させる。`pnpm build:packages` が型エラー 0 で通る

### 4. plugin-breadcrumbs（Small）

- **対象**: 新規 `packages/plugins/breadcrumbs/`（`index.ts`・`src/`・`style.css`・`package.json`・`README.md`・`README_ja.md`）、`scripts/package_metadata.mjs` への登録、`riebeckite.config.ts` への追加、`apps/web/package.json` への依存追加
- **前提**: 新規プラグイン手順（`related-posts` をテンプレート）。slug 階層からパンくずを生成し、前段の題名解決は `getArticleTitle` 相当を使う
- **手順**: パンくず配列の生成 → 記事上部への `<nav>` 挿入（`onManifestCreated` で `entry.html` に追記、`related-posts` と同パターン）→ BreadcrumbList JSON-LD を seo 出力に追加。README 対訳を作成
- **完了条件**: `pnpm check:packages` 通過。ビルドでパンくず nav と BreadcrumbList が出力される

### 5. plugin-sidenotes（Medium）

- **対象**: 新規 `packages/plugins/sidenotes/`（同上の登録一式）。remark/rehype 変換 + CSS + client（ポップオーバー）
- **前提**: 新規プラグイン手順。既存脚注（GFM / rehype）との互換を先に設計。client 資産の登録は `plugin-toc` や `code-annotations` のパターンを参照
- **手順**: 脚注をマージン注として描画するレイアウト変換 → デスクトップはマージン注、モバイルはポップオーバー/折りたたみの CSS と client を実装。README 対訳を作成
- **完了条件**: `pnpm check:packages` 通過。デスクトップでマージン注、モバイルでポップオーバーが動作する