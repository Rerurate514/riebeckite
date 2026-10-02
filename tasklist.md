# Tasklist

実装対象を優先度順に並べたバックログ。エージェントが着手するときは、下の「実装メモ（agents 用）」を参照し、着手したら「状態」を `実施中` に更新する。

## 実装対象（優先度順）

| 順番 | ID | 作業 | 状態 | 規模 | 優先理由 |
|---:|---|---|---|---|---|
| 1 | OC1 | `@hono/vite-build` の node アダプタが `@hono/node-server` を宣言していない問題を解消する | 未着手 | Small | テスト用途で `apps/web` に devDependency を追加して回避している。恒久的にはアダプタ側で依存を宣言するか、テスト側のビルド設定で external にして回避すべき |
| 2 | OC2 | SSG 管轄外の出力（`dist/index.js`・クライアントのハッシュ付きアセット）と `public` の衝突を扱う | 未着手 | Medium | 本番の public 優先是 SSG が出力するパスだけが対象。ワーカーやクライアントアセットが `public` と同名になると上書きが残る |
| 3 | OC3 | `public` ファイル削除時に発生するフル再生成を最適化する | 未着手 | Medium | 現在は常に安全側で一度フル再生成する。`public` を頻繁に増減する運用では再生成コストが増える |
| 4 | OC4 | `pnpm build` の前提（`pnpm build:packages` の先行）を明文化・自動化する | 未着手 | Small | dist 未生成のクリーン環境では `prebuild` が失敗する。CI や手順の明示、タスク依存の自動化が必要 |

規模の目安: Small = 半日以内 / Medium = 1〜2 日 / Large = 複数日・複数パッケージ。

## 完了済み

| ID | 作業 | 規模 | 実装結果・備考 |
|---|---|---|---|
| OC0 | 本番ビルドで `public` 配下の静的アセットを生成物より優先する | Medium | `collectSiteOwnedOutputPaths` を追加し、SSG の emit・unchanged 再利用・removed 削除と `canUseIncremental` の条件からサイト所有パスを除外。`shadowedOutputCount` メトリクスと警告を追加。`output_collision.test.ts` を新設し、既存 Incremental SSG テストは維持。commit `3741dae`、main へマージ `1fb3f6e` |

## 実装メモ（agents 用）

共通ルール:

- 着手時は「状態」を `実施中` に更新する。
- 完了時は実装内容を 1 行で「完了済み」表へ移し、ID は引き継ぐ。

項目別メモ（OC1〜OC4）:

- OC1: `@hono/vite-build` の node アダプタ（`dist/adapter/node/index.mjs`）は `@hono/node-server/serve-static` を import するが、`@hono/vite-build` は依存として宣言していない。pnpm はこれを `apps/web` へ link しないため、統合テストのビルドが解決に失敗する。`apps/web` に `@hono/node-server: 1.19.17` を devDependency として追加して回避している。対応案は、(a) 上流アダプタが依存を宣言する、(b) テスト側の Vite 設定で `@hono/node-server/serve-static` を external にする、(c) node アダプタではなく cloudflare 系アダプタをテストで使う、のいずれか。本番の `apps/web` ビルドは cloudflare-workers アダプタなので影響しない。
- OC2: 現在の public 優先是 `packages/integrations/honox/src/ssg_plugin.ts` が出力するパスだけに適用される。`@hono/vite-build` が出力する `dist/index.js` と、クライアントビルドのハッシュ付きアセットは対象外で、`public/` に同名があると上書きされ得る。Vite は `renderStart` で `publicDir` を `outDir` へコピーし、その後の書き込みが優先される点を踏まえて対策する。
- OC3: `public` ファイルを削除すると、対応する生成物が `nextOutputCache` に存在しないため `canUseIncremental` が成立せず、一度フル再生成して生成物を復元する。安全側の設計だが、`public` を頻繁に増減するとコストが増える。キャッシュに「public により shadow された」状態を記録するなど、フル再生成を避ける方法を検討する。
- OC4: `pnpm build` は `apps/web` の `prebuild`（`tsx scripts/build_images.ts`）で `@riebeckite/core/dist/client.js` などを要求するため、事前に `pnpm build:packages` が必要。クリーン環境や CI で失敗しないよう、root の `build` スクリプトに依存を組み込むか、手順を docs に明記する。
