# Localization Policy 検証記録

計測日: 2026-11-04

## 条件

- 比較元: `b918a029`（Localization Policy 導入前の merge-base）
- 比較先: `f50f8678`
- Windows / Node.js v24.22.1 / pnpm 12.15.0
- Ryzen 7 7730U（16 logical CPUs）/ RAM 13.9 GB
- 既存 `benchmarks/core.mjs`、`realistic`、1,000件、l10n有効、各3回。値は中央値
- 生成フィクスチャ、永続キャッシュ有効、seed は `1234 + repeat index`

5,000件・8シナリオ・各3回の測定は比較元で20分のコマンド上限を超えたため、結果を採用しない。下表は同一条件で完走した代表シナリオのみであり、実運用Vaultや5,000件以上を代表するものではない。

## 性能

| シナリオ | 比較元 wall clock | 比較先 wall clock | 差分 | 比較元/比較先 RSS | 処理/再利用（比較先） |
| --- | ---: | ---: | ---: | ---: | --- |
| cold | 20,410 ms | 20,517 ms | +0.5% | 474 / 499 MB | 1,000 / 0 |
| warm | 7,335 ms | 7,058 ms | -3.8% | 478 / 503 MB | 0 / 1,000 |
| single-edit | 7,515 ms | 7,359 ms | -2.1% | 479 / 505 MB | 1 / 999 |
| frontmatter-edit | 12,749 ms | 12,415 ms | -2.6% | 478 / 504 MB | 1,000 / 0 |

cold の差分は3回の範囲内（比較元 20,378–21,596 ms、比較先 20,126–21,098 ms）。明確な処理量・再利用量の退行は観測されなかった。比較先のピークRSSは 21–26 MB 増加しており、継続監視対象とする。

生データは実行時の一時ディレクトリに保存した。

- 比較元: `C:\Users\rerur\AppData\Local\Temp\opencode\riebeckite-benchmark-pre\2026-11-04T07-27-32-481Z-core.json`
- 比較先: `C:\Users\rerur\AppData\Local\Temp\opencode\riebeckite-benchmark-current\2026-11-04T07-33-59-729Z-core.json`

## 開発サーバーと回帰

| 確認 | 結果 | 根拠 |
| --- | --- | --- |
| l10nの翻訳追加・削除・言語変更・translation group変更・移動 | PASS | `@riebeckite/plugin-l10n` 35 tests。増分結果とコールド結果の等価性、競合URLの拒否を含む |
| localized timeline / taxonomy / search | PASS | 各パッケージ 8 / 11 / 28 tests。locale選択・fallback・検索の言語スコープを含む |
| content watch の change/add/unlink とサーバー継続 | PASS | `content_watch.test.ts` 17 tests。フルリロード、runtime invalidation、イベント集約を含む |
| 実Vite開発サーバーのコンテンツ更新 | PASS | `test:plugin-dev:browser` 3 tests。ブラウザ画面とHTTP応答の双方で更新を確認 |
| SPA遷移 | PASS | `test:spa:browser` 7 tests |
| HonoX全体テスト | UNVERIFIED | `@riebeckite/honox test` は、修正済みの旧エラー文言期待と、Node 2GBヒープ上限による既存 visual renderer OOM で完走しなかった。衝突テスト単体は5 testsでPASS |

実運用Vault、実デプロイ、ブラウザからのl10n専用fixture操作、5,000件以上の完走測定は実施していない。
