# 開発サーバー起動時間計画

## 目的

開発者が `pnpm dev` を実行してから、ブラウザで localhost のページを表示できるまでの時間を短縮する。

対象は次の二つである。

1. 既存の cache を消さない状態での初回プロセス起動
2. プロセス停止直後、同じ cache を使う二回目の起動

Markdown変更後の reload、HMR、実行中の `ContentManager` 差し替えは対象外である。

## 計測条件

- 実際のルートコマンド `pnpm dev --host 127.0.0.1 --port <free-port> --strictPort` を起動する。
- 対象サイトは `website/`、コンテンツは通常どおり `docs/` を使う。
- ブラウザは測定前に一度だけ起動し、起動時間は計測に含めない。
- Vite の cache、`.riebeckite`、docs、ユーザーデータは削除しない。
- 一回目を停止した後、同じ条件で二回目を起動する。
- 各回で次を記録する。
  - process spawn から Vite の `Local:` 出力まで
  - process spawn から最初の document HTTP 応答まで
  - process spawn から `main#main-content` が表示されるまで

## Phase 0: ベースライン

`pnpm benchmark:development-startup` で実サイトを二回起動し、初回と二回目を別行で記録する。

結果には Node、OS、CPU、実行コマンド、port、計測日時を含める。結果 JSON は `benchmarks/results/` に出力し、コミットしない。

### 完了条件

- 初回と二回目の Vite ready、HTTP、表示完了の時間を取得する。
- 二回目が既存の cache を利用した測定であることを確認する。
- 起動後の最初の表示を支配する区間を数値で特定する。

### 実行記録（2026-11-17）

実サイトを、既存の cache を削除せずに二回起動した。ブラウザは測定前に起動し、同じ page を利用した。

環境は Node `v24.22.1`、Windows x64、AMD Ryzen 7 7730U、16 logical CPUs、14,188 MB RAM。

| 起動 | Vite ready | 最初の document HTTP | `main#main-content` 表示 |
| --- | ---: | ---: | ---: |
| 初回 | 22,886.5 ms | 41,422.0 ms | 41,501.1 ms |
| 二回目 | 23,206.2 ms | 41,462.6 ms | 41,478.5 ms |

結果ファイル: `benchmarks/results/2026-11-16T22-59-19-443Z-development-startup.json`（gitignore）。

初回・二回目とも Vite ready 後から最初の document 応答までが約18秒を占める。`folderPages` が development route cache 契約を宣言していなかったため、route cache は保存されなかった。契約を追加後、route cache hit 時の request manifest は約0.8秒だった。

調査用計測では SSR module load が約12秒、request manifest が約0.8秒だった。次の調査対象は content manifest ではなく、起動後に初めて読み込む SSR module graph とアプリの初回 render である。

## Phase 1: 改善候補の選定

Phase 0 の値を見て、最も長い区間だけを調査する。

- Vite ready 以前が支配的なら、`predev`、config 読み込み、plugin 初期化を確認する。
- HTTP から表示完了が支配的なら、最初の SSR module graph、renderer、client asset を確認する。
- 二回目が改善しないなら、利用できる既存 cache と無効化条件を確認する。

改善前後は同じ手順で二回起動を測る。改善がない変更は採用しない。

## Phase 2: 規模別の補助測定

`pnpm benchmark:development-startup-scaling` は、実サイトと同じ `website/` の設定・plugin 構成を一時コピーし、realistic profile の synthetic vault を使う。指定件数には homepage を含める。各件数について、同じ一時サイトを停止・再起動して二回計測する。

この測定はコンテンツ件数の傾向を比べるためのものであり、実サイトの `docs/` を使う Phase 0 の絶対値と混同しない。ブラウザは測定前に起動し、Vite cache とユーザーデータは削除しない。一時サイトとその cache だけを削除する。

### 実行記録（2026-11-17）

環境は Node `v24.22.1`、Windows x64、AMD Ryzen 7 7730U、16 logical CPUs、14,188 MB RAM。各セルは process spawn からの経過秒であり、各条件1回の測定である。

| Markdown | 初回 Vite ready | 初回 HTTP | 初回 表示 | 二回目 Vite ready | 二回目 HTTP | 二回目 表示 |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 10 | 22.11 | 37.46 | 37.53 | 21.98 | 35.24 | 35.25 |
| 100 | 22.23 | 42.93 | 42.96 | 21.23 | 35.99 | 36.01 |
| 1,000 | 21.49 | 62.85 | 62.88 | 21.24 | 37.47 | 37.48 |
| 2,000 | 21.65 | 85.99 | 86.02 | 21.45 | 39.64 | 39.65 |
| 4,000 | 22.38 | 135.32 | 135.35 | 21.80 | 43.41 | 43.43 |
| 5,000 | 21.84 | 156.30 | 156.33 | 21.47 | 43.88 | 43.89 |
| 10,000 | 22.06 | 271.34 | 271.37 | 23.31 | 52.81 | 52.82 |

結果 JSON は `benchmarks/results/*-development-startup-scaling.json`（gitignore）に出力した。

二回目は development route cache により大きく短縮されるが、cache 照合の全件 fingerprint 読み込みは必要である。5,000件で無制限並列読み込みが `EMFILE` を起こしたため、照合と保存の fingerprint 読み込みは既存の content processing と同じ16並列へ制限した。

## 非対象

- Markdown変更時の watcher、reload、HMR の最適化
- 実行中の `ContentManager` の部分更新または差し替え
- benchmark のためだけの通常運用ログ
