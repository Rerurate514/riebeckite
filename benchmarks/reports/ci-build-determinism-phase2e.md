# Riebeckite Phase 2E レポート: ビルド決定性と l10n 依存関係

| 項目 | 内容 |
| --- | --- |
| 対象ブランチ | `perf/phase2e-build-determinism` |
| 調査開始ベース | `08e7ae075141ac34caa5bd951cb2bda1d2ee8a8c` |
| l10n 修正 | `152141c9` (`l10nのMarkdownリンク依存解析をASTと統一`) |
| 計測環境 | Windows 11 / Node.js v24.11.1 / pnpm / Intel Core i7-14700KF / 32 GB |

## 判定

### 2E-1: l10n の文字参照リンク

完了。Markdown リンクの描画と依存 fingerprint を同じ Markdown AST の `link` URL から解釈するよう統一した。従来の生文字列正規表現では、`&sol;en&sol;target` が AST で `/en/target` に正規化されることを追跡できなかった。この差により、翻訳追加後も既存ページを再利用し、増分出力が Cold Build と異なる可能性があった。

`extractMarkdownLinkUrls()` は実際にローカライズ対象となる `link` ノードだけを集める。画像と link definition 単体は除外し、percent encoded URL、日本語 URL、query、fragment は保持する。回帰テストは、英語 target のみを参照する日本語ページへ日本語 target を追加し、永続キャッシュを使う増分出力と独立 Cold Build の HTML が一致して `/target#section` へローカライズされることを確認する。

### 2E-2: D2/Marp と検索出力

この環境では、Phase 2D の Showcase/1000 で一度だけ観測された検索データ差異を再現できなかった。D2/Marp の遅延 import、D2 queue、timeout、fallback 契約には変更を加えていない。原因は未特定であり、D2/Marp 全般の決定性完了は宣言しない。

ただし、D2、Marp、search を同時に使う最小 SSG fixture を追加した。次を byte 単位で比較する。

- A: state と dist を削除した二つの独立 Cold Build
- B: no-change incremental build と Cold Build
- C: D2/Marp を含むノート編集後の incremental build と、その後の独立 Cold Build

各比較では `notes/note-0.html`、`search-data.json` を含む dist 全体と、`ssg-output-cache.json` が一致した。fixture は D2 SVG、Marp の `rb-marp` 出力、検索 JSON に D2 テキストが含まれることも確認する。

## 調査結果

### 検索データの入力

`search-data.json` は `buildSearchItems({ manifest, config })` で生成される。各 discoverable entry の `html` から heading、本文、excerpt を抽出するため、ページ HTML と検索データは同じ処理済み HTML を入力とするが、検索 JSON 側だけに差異が現れることはあり得る。Phase 2D で差異が headings/body に限定されたことと整合する。

### 非同期・fallback 監査

- Core の Unified pipeline と ContentManager は plugin transform を await する。
- D2 の lazy transformer は import と transformer 実行を await する。D2 renderer は module global queue で直列化され、compile/render は 30 秒 timeout を持つ。renderer error は診断を記録して client fallback (`data-d2="pending"`) へ変換する。
- Marp の lazy transformer も import と transformer 実行を await する。Marp block は順次 render され、error 時は診断を記録して元の code block を残す。
- よって成功と fallback が同一入力で混在すれば出力は変わり得るが、今回の fixture、既存の統合テスト、直接レンダリングでは error/timeout を観測していない。

同一 id と入力で16件同時に呼び出した直接レンダリングは、D2 と Marp とも16/16成功かつ出力1種類だった。D2 は id を salt に使うため、異なる id の SVG は異なることが仕様どおりであり、比較対象ではない。

## Cold Build 計測

実行コマンド:

```text
pnpm benchmark:presets -- --presets showcase --sizes 1000 --scenarios cold --runs 2 --out benchmarks/results/phase2e-baseline.json
```

| 指標 | 値 |
| --- | --- |
| Cold Build wall time 中央値 | 175,592.5 ms |
| Clean Build wall time 中央値 | 151,703 ms |
| contentProcessed | 1,036 |
| contentReused | 0 |
| rendered | 2,016 |
| outputCacheMiss | 2,124 |
| full regeneration | true |

このベンチマークは各試行内の clean 比較であり、二つの出力ツリーを保存して比較する決定性ハーネスではない。そのため、性能計測を非決定性がない根拠には用いない。

## 検証

- `pnpm --filter @riebeckite/core test`: 304 passed
- `pnpm --filter @riebeckite/plugin-l10n test`: 30 passed
- `pnpm --filter @riebeckite/core build`
- `pnpm --filter @riebeckite/plugin-l10n build`
- `pnpm --filter @riebeckite/plugin-d2 build`
- `pnpm --filter @riebeckite/plugin-marp test`: 6 passed
- `pnpm --filter @riebeckite/plugin-marp build`
- `pnpm --filter @riebeckite/plugin-search test`: 36 passed
- `pnpm --filter @riebeckite/plugin-search build`
- `pnpm --filter @riebeckite/honox test`: 165 passed
- `node --import tsx --test test/visual_renderers_determinism.test.ts`（`packages/integrations/honox`）
- `RIEBECKITE_PRESET_FAST_PATH_PRESETS=showcase pnpm test:e2e:preset-fast-path`: PASS。Showcase の no-change と recovery は `plugin-build-end` により fast path 非適用だが、plugin option change 後の出力安定性と incremental/full 出力の byte 一致を確認した。
- `pnpm typecheck`: 146 projects OK
- `pnpm check:docs`: 762 Markdown files OK
- `pnpm check:plugin-docs`: plugin parity 70、README parity 140
- `pnpm exec biome check`（2E 変更ファイル）

## 残課題と次段階

Phase 2D の元の条件で renderer error/timeout と成功が混在する再現は未達で、根因も未特定である。今回の fixture を回帰診断として維持し、再現時は HTML、`search-data.json`、D2 SVG、Marp CSS、Output Cache、Registry、Build State の差分を分けて採取する。その時点でのみ、fallback を成功ビルドへ変換する契約を含めた最小修正を判断する。

2E-1 は完了し、次 phase へ進める。2E-2 は「未再現・原因未特定」の監視項目として継続する。
