# Tasklist

実装対象を優先度順に並べたバックログ。各項目は ID・作業・状態・規模・優先理由・完了条件を持つ。エージェントが着手するときは、下の「実装メモ（agents 用）」を参照し、着手したら「状態」を `実施中` に更新する。

## 実装対象（優先度順）

| 順番 | ID | 作業 | 状態 | 規模 | 優先理由 | 完了条件 |
|---:|---|---|---|---|---|---|
| 1 | DN1 | daily-notes が Obsidian のカスタム日付フォーマットを解釈できない問題を解消する | 未着手 | Medium | slug の日付抽出が `YYYY-MM-DD` 形式のみで、Obsidian 側を `YYYY/MM/DD` 等に設定していると日付が空になる。frontmatter の date/created が無いノートで顕在化する。Obsidian 互換性の問題 | Obsidian の日付フォーマットを明示設定として取り込み、その形式の slug から日付を解決できる<br>frontmatter date/created が無くても設定形式に一致すれば日付が空にならない<br>複数形式の推測（ヒューリスティック）に依存しない |
| 2 | I18N1 | docs プラグインの前後ナビが `Previous` / `Next` 固定で、ja ページでも英語表示になる問題を解消する | 未着手 | Small | 前後リンクの文言がロケールを見ずに英語固定。l10n の解決済み言語を利用して ja/en を切り替える必要がある。UX 上の契約不一致 | docs prev/next のラベルがページの解決済み言語（ja/en）に応じて切り替わる<br>ja ページで日本語ラベル、en ページで英語ラベルになることを検証するテストがある |
| 3 | I18N4 | code-enhance のコピーラベル（`copyLabel` / `copiedLabel`）をプラグイン設定から渡せるようにする | 未着手 | Small | `CodeEnhanceClientOptions` は存在するが `codeEnhance()` と `createClientEntry` に publicConfig の経路が無く、既定の `Copy` / `Copied` を上書きできない。公開 API 契約の不足 | `copyLabel` / `copiedLabel` が publicConfig 経由でクライアントへ渡り、既定値を上書きできる<br>lightbox / text-fragment と同じ client config 契約に整合する |
| 4 | UI4 | plugin-api.md が bodySlots / appendContentBodySlot を説明していない | 未着手 | Small | `docs/en/docs/plugins/docs.md` や各プラグイン README が「Plugin API の standard article body slot」を参照しているが、参照先の plugin-api.md に記述がない（ja も同様）。公開契約ドキュメントの乖離 | plugin-api.md（en/ja）に bodySlots / appendContentBodySlot / 標準 slot の契約が記述される<br>記述が現行実装・他 doc の参照先と一致する |

規模の目安: Small = 半日以内 / Medium = 1〜2 日 / Large = 複数日・複数パッケージ。

## 再監査で対象外とした項目

実装対象から除外した項目と理由。再度バックログへ戻す場合は、下記の前提が崩れた根拠を示すこと。

- OC1: 本番は cloudflare-workers アダプタで影響しない。テスト用途は `apps/web` が `@hono/node-server` を明示宣言しており通過する。上流 `@hono/vite-build` の依存宣言漏れであり Riebeckite 側の実装対象外。
- OC3: `public` 削除時は常にフル再生成して生成物を正しく復元する。測定された性能問題はなく、shadow-state を persistent cache に足すのは投機的複雑化。
- I18N2: サイト全体の単一言語 `description` 契約であり taxonomy 固有の不具合ではない。taxonomy だけ locale 化すると責務境界が不自然になる。
- I18N3: `/themes` は固定のテーマギャラリー（デモ）で、l10n コンテンツ契約の違反ではない。
- CACHE1: `processedContentCache.version` の手動更新が正式な invalidation 契約として機能し、テストと docs で裏付けられている。外部ヘルパーソースの自動解析は投機的。
- TEST1: React シムは 3 テストファイルの局所回避に留まり増殖していない。テスト基盤を Vitest へ移す理由が無く、広がった時点で再検討する。

## 完了済み

| ID | 作業 | 規模 | 実装結果・備考 |
|---|---|---|---|
| OC0 | 本番ビルドで `public` 配下の静的アセットを生成物より優先する | Medium | `collectSiteOwnedOutputPaths` を追加し、SSG の emit・unchanged 再利用・removed 削除と `canUseIncremental` の条件からサイト所有パスを除外。`shadowedOutputCount` メトリクスと警告を追加。`output_collision.test.ts` を新設し、既存 Incremental SSG テストは維持。commit `3741dae`、main へマージ `1fb3f6e` |
| UI1 | recent-posts / daily-notes を単独で使うと incremental SSG で出力が stale になり得る問題を解消する | Medium | recent-posts に `outputDependencies: [{ type: "global" }]`、daily-notes に既定ディレクトリ `Daily` の `folder` 依存（空ディレクトリ指定時は `global`）を宣言。`collectChangedFolders` を祖先フォルダまで含めるよう修正し、ネストした Daily ノートの追加・`date` 変更でも index が再生成されるようにした。core / 両プラグインのテストに再生成と狭い依存を検証するケースを追加 |
| OC4 | `pnpm build` の前提（`pnpm build:packages` の先行）を明文化・自動化する | Small | root の `build` を `pnpm build:packages && pnpm --filter @riebeckite/web build` に変更し、packages → apps/web の順を保証。`build:packages` が cli を含む公開 package を build するため個別の cli build は不要。クリーン checkout で `pnpm install` 後に `pnpm build` のみがパッケージビルドを先行させて成功することを確認 |
| UI2 | daily-notes の Plugin 設定がウィジェットに反映されない問題を解消する | Medium | `getDailyNotes` が `options` 未指定時に `resolveDailyNotesOptionsFromConfig(config)` で登録済み `dailyNotesPlugin(options)` の options を解決するようにした。プラグイン名は `DAILY_NOTES_PLUGIN_NAME` に集約。apps/web と scaffold は `getDailyNotes({ manifest, config })` のままで config の `source` / `extract` / `widget.limit` / `dateFormat` / `locale` を反映し、明示 `options` は上書きとして優先する。設定解決と config 反映を検証するテストを追加（daily-notes 26 pass） |
| OC2 | SSG 管轄外の出力（`dist/index.js`・クライアントのハッシュ付きアセット）と `public` の衝突を扱う | Medium | Vite 8 は `vite:prepare-out-dir` の `renderStart` で `publicDir` を `outDir` へコピーした後に Rollup/Vite のバンドル出力を書く。SSG 生成物は `collectSiteOwnedOutputPaths` で public 優先、`@hono/vite-build` の `dist/index.js` はバンドル出力のため public より後に書かれ public 側が無言で上書きされる。`findBuildOutputSiteCollisions` を追加し `generateBundle` でバンドル出力と public の衝突を検出して警告（ownership は「ビルド出力が public に優先、衝突は警告」）。クライアントのハッシュ付きアセットは内容ハッシュ名のため public と同名になるのは手動配置時のみで実害なしと判断。`ssg_plugin.test.ts` と `output_collision.test.ts` に検出・所有のテストを追加 |
| UI3 | showcase の生成コードがコンパイル・実 build で検証されない問題を解消する | Medium | `scaffold_contracts.test.ts` に Contract 11 を追加し、全 preset の生成 TSX（`app/**` + `riebeckite.config.ts` / `vite.config.ts`）を esbuild（`bundle` / `write:false` / `packages:"external"`）でコンパイル検証するようにした。これにより showcase の `footerContent` が壊れていた実バグを検出し、`app-templates.ts` の slugRoute を `<LocalGraph>` の条件式と `<Backlinks>` を個別 child にし外側 brace を外す形（indexRoute の `afterContent` と同型）へ修正。実 build と生成 HTML の検証は Contract 1（starter）が担い、`scaffold_presets.test.ts` の文字列 assert は維持 |

## 実装メモ（agents 用）

共通ルール:

- 着手時は「状態」を `実施中` に更新する。
- 完了時は実装内容を 1 行で「完了済み」表へ移し、ID は引き継ぐ。
- 各項目の完了条件は実装対象表の「完了条件」列を参照する。

項目別メモ（DN1 / I18N1 / I18N4 / UI4）:

- DN1: daily-notes の `resolveDailyNoteDate` は frontmatter `date` → `created` → slug の `YYYY-MM-DD` の順で日付を決める。`pathPattern` は slug の絞り込み用で日付源ではない。Obsidian の日付フォーマットを既定以外（`YYYY/MM/DD`、`YYYY.MM.DD` など）にしているノートは、frontmatter に date/created が無いと日付が空になる。Obsidian のフォーマット設定を取り込む。複数形式を当てずっぽうで解釈するヒューリスティックは採用しない。
- I18N1: `packages/plugins/docs/src/render.ts` の `renderPrevNextLink` が `Previous` / `Next` を固定で使う。l10n の解決済み言語（ページの `l10n.lang`、`packages/plugins/docs/index.ts` で取得済み）を渡し、ja では「前/次」等へ切り替える。Plugin 側の変更なので `apps/web` の locale ヘルパーとは分離して設計する。
- I18N4: `packages/plugins/code-enhance/src/types.ts` の `CodeEnhanceClientOptions`（`copyLabel` / `copiedLabel`）と `initCodeEnhance(options)` は存在するが、`code-enhance/index.ts` の `codeEnhance(options)` は `CodeEnhanceOptions` のみを受け取り、`clientEntries` も `createClientEntry("code-enhance", "initCodeEnhance")` で publicConfig を渡していない。lightbox（`packages/plugins/lightbox/index.ts` の `initLightboxFromOptions`）と同様に publicConfig 経由で公開する。
- UI4: `docs/en/docs/reference/plugin-api.md` と `docs/ja/docs/reference/plugin-api.md` に bodySlots / appendContentBodySlot / 標準 slot の記述がない。一方 `docs/en/docs/plugins/docs.md` は「standard article body slot mechanism described in Plugin API」として plugin-api.md を参照し、properties / changelog / l10n も同契約を利用する。`ContentBodySlot`（`packages/core/src/types/content_manifest.ts`）の標準 slot、`appendContentBodySlot`、Site が描画を決める境界を一次参照先へ追記する。`34ec8d6` で scaffold が標準 slot を消費するようになったため、記述内容は現行実装に合わせる。
