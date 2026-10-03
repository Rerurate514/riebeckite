# Tasklist

実装対象を優先度順に並べたバックログ。エージェントが着手するときは、下の「実装メモ（agents 用）」を参照し、着手したら「状態」を `実施中` に更新する。

## 実装対象（優先度順）

| 順番 | ID | 作業 | 状態 | 規模 | 優先理由 |
|---:|---|---|---|---|---|
| 1 | OC1 | `@hono/vite-build` の node アダプタが `@hono/node-server` を宣言していない問題を解消する | 未着手 | Small | テスト用途で `apps/web` に devDependency を追加して回避している。恒久的にはアダプタ側で依存を宣言するか、テスト側のビルド設定で external にして回避すべき |
| 2 | OC2 | SSG 管轄外の出力（`dist/index.js`・クライアントのハッシュ付きアセット）と `public` の衝突を扱う | 未着手 | Medium | 本番の public 優先是 SSG が出力するパスだけが対象。ワーカーやクライアントアセットが `public` と同名になると上書きが残る |
| 3 | OC3 | `public` ファイル削除時に発生するフル再生成を最適化する | 未着手 | Medium | 現在は常に安全側で一度フル再生成する。`public` を頻繁に増減する運用では再生成コストが増える |
| 4 | OC4 | `pnpm build` の前提（`pnpm build:packages` の先行）を明文化・自動化する | 未着手 | Small | dist 未生成のクリーン環境では `prebuild` が失敗する。CI や手順の明示、タスク依存の自動化が必要 |
| 5 | I18N1 | docs プラグインの前後ナビが `Previous` / `Next` 固定で、ja ページでも英語表示になる問題を解消する | 未着手 | Small | 前後リンクの文言がロケールを見ずに英語固定。l10n の解決済み言語を利用して ja/en を切り替える必要がある |
| 6 | I18N2 | taxonomy-term の SEO 説明文が `config.site.description` の単一言語値へフォールバックする問題を解消する | 未着手 | Medium | タグ一覧を生成する pageType が `description` を返さないため、ja ページでも英語のサイト説明が meta description になる。term ごとのロケール別説明文を生成する |
| 7 | I18N3 | 静的な `themes.tsx`（`/themes` ギャラリー）の日英混在を解消する | 未着手 | Small | l10n コンテンツではない固定ページ内でサンプル文が日英混在している。テキスト整理かロケール別表示を検討する |
| 8 | DN1 | daily-notes が Obsidian のカスタム日付フォーマットを解釈できない問題を解消する | 未着手 | Medium | slug の日付抽出が `YYYY-MM-DD` 形式のみで、Obsidian 側を `YYYY/MM/DD` 等に設定していると日付が空になる。frontmatter の date/created が無いノートで顕在化する |
| 9 | CACHE1 | コンテンツパイプラインの fingerprint が外部ヘルパー関数のソース変更を検知しない問題を解消する | 未着手 | Medium | `computePipelineFingerprint` は plugin オブジェクトの関数を文字列化するが、別ファイルのヘルパー（例 `remarkObsidianWikilink`）の変更を検知しない。変更時は `processedContentCache.version` の手動更新が必要 |
| 10 | I18N4 | code-enhance のコピーラベル（`copyLabel` / `copiedLabel`）をプラグイン設定から渡せるようにする | 未着手 | Small | `CodeEnhanceClientOptions` は存在するが `codeEnhance()` と `createClientEntry` に publicConfig の経路が無く、既定の `Copy` / `Copied` を上書きできない |
| 11 | TEST1 | tsx 実行時に `.tsx` のテストが classic React ランタイムで変換される問題を解消する | 未着手 | Small | `node --import tsx --test` は root の `jsxImportSource: hono/jsx` を反映せず `React.createElement` を使う。コンポーネントを描画するテストは global React シムで回避している |

規模の目安: Small = 半日以内 / Medium = 1〜2 日 / Large = 複数日・複数パッケージ。

## 完了済み

| ID | 作業 | 規模 | 実装結果・備考 |
|---|---|---|---|
| OC0 | 本番ビルドで `public` 配下の静的アセットを生成物より優先する | Medium | `collectSiteOwnedOutputPaths` を追加し、SSG の emit・unchanged 再利用・removed 削除と `canUseIncremental` の条件からサイト所有パスを除外。`shadowedOutputCount` メトリクスと警告を追加。`output_collision.test.ts` を新設し、既存 Incremental SSG テストは維持。commit `3741dae`、main へマージ `1fb3f6e` |

## 実装メモ（agents 用）

共通ルール:

- 着手時は「状態」を `実施中` に更新する。
- 完了時は実装内容を 1 行で「完了済み」表へ移し、ID は引き継ぐ。

項目別メモ（OC1〜OC4 / I18N1〜I18N4 / DN1 / CACHE1 / TEST1）:

- OC1: `@hono/vite-build` の node アダプタ（`dist/adapter/node/index.mjs`）は `@hono/node-server/serve-static` を import するが、`@hono/vite-build` は依存として宣言していない。pnpm はこれを `apps/web` へ link しないため、統合テストのビルドが解決に失敗する。`apps/web` に `@hono/node-server: 1.19.17` を devDependency として追加して回避している。対応案は、(a) 上流アダプタが依存を宣言する、(b) テスト側の Vite 設定で `@hono/node-server/serve-static` を external にする、(c) node アダプタではなく cloudflare 系アダプタをテストで使う、のいずれか。本番の `apps/web` ビルドは cloudflare-workers アダプタなので影響しない。
- OC2: 現在の public 優先是 `packages/integrations/honox/src/ssg_plugin.ts` が出力するパスだけに適用される。`@hono/vite-build` が出力する `dist/index.js` と、クライアントビルドのハッシュ付きアセットは対象外で、`public/` に同名があると上書きされ得る。Vite は `renderStart` で `publicDir` を `outDir` へコピーし、その後の書き込みが優先される点を踏まえて対策する。
- OC3: `public` ファイルを削除すると、対応する生成物が `nextOutputCache` に存在しないため `canUseIncremental` が成立せず、一度フル再生成して生成物を復元する。安全側の設計だが、`public` を頻繁に増減するとコストが増える。キャッシュに「public により shadow された」状態を記録するなど、フル再生成を避ける方法を検討する。
- OC4: `pnpm build` は `apps/web` の `prebuild`（`tsx scripts/build_images.ts`）で `@riebeckite/core/dist/client.js` などを要求するため、事前に `pnpm build:packages` が必要。クリーン環境や CI で失敗しないよう、root の `build` スクリプトに依存を組み込むか、手順を docs に明記する。
- I18N1: `packages/plugins/docs/src/render.ts` の `renderPrevNextLink` が `Previous` / `Next` を固定で使う。l10n の解決済み言語（ページの `l10n.lang`）を渡し、ja では「前/次」等へ切り替える。Plugin 側の変更なので `apps/web` の locale ヘルパーとは分離して設計する。
- I18N2: `packages/plugins/taxonomy/index.ts` の pageType `taxonomy-term` が `description` を返さないため、`apps/web/app/routes/[slug{.+}].tsx` の `route.kind === "page"` 分岐で `config.site.description`（英語）へフォールバックする。term とロケールに応じた説明文を pageType 側で生成する。
- I18N3: `apps/web/app/routes/themes.tsx` は固定のテーマギャラリーで、サンプル記事が日英混在。l10n コンテンツではないため、テキスト整理かロケール別表示を検討する。
- DN1: daily-notes の `resolveDailyNoteDate` は frontmatter `date` → `created` → slug の `YYYY-MM-DD` の順で日付を決める。`pathPattern` は slug の絞り込み用で日付源ではない。Obsidian の日付フォーマットを既定以外（`YYYY/MM/DD`、`YYYY.MM.DD`、`DD-MM-YYYY`、`YYYYMMDD` など）にしているノートは、frontmatter に date/created が無いと日付が空になる。Obsidian のフォーマット設定を取り込むか、複数形式を解釈する。
- CACHE1: `packages/core/src/content/content_persistent_cache.ts` の `computePipelineFingerprint` / `sanitizeForFingerprint` は plugin オブジェクトの関数を `Function.prototype.toString` で指紋化するが、plugin が import する別ファイルのヘルパー関数のソースは対象外。ヘルパーだけを変更しても指紋が変わらず、キャッシュ済み HTML が再利用される。変更時は該当 plugin の `processedContentCache.version` を上げる運用で回避している。
- I18N4: `packages/plugins/code-enhance/src/types.ts` の `CodeEnhanceClientOptions`（`copyLabel` / `copiedLabel`）と `initCodeEnhance(options)` は存在するが、`code-enhance/index.ts` の `codeEnhance(options)` は `CodeEnhanceOptions` のみを受け取り、`clientEntries` も `createClientEntry("code-enhance", "initCodeEnhance")` で publicConfig を渡していない。lightbox / text-fragment と同様に publicConfig 経由で公開する。
- TEST1: root `tsconfig.json` は `"jsx": "react-jsx"` / `"jsxImportSource": "hono/jsx"` だが、package の test script `node --import tsx --test "test/*.test.ts"` は classic React ランタイム（`React.createElement`）で `.tsx` を変換する。`TSX_TSCONFIG_PATH` も効かない。`.tsx` コンポーネントを描画するテストは `import { createElement, Fragment } from "hono/jsx"` を `globalThis.React` に入れて回避している。tsx の jsx 設定を明示するか、テスト基盤を Vite/Vitest 等へ寄せる。
