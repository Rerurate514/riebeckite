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

## 非対象

- Markdown変更時の watcher、reload、HMR の最適化
- 実行中の `ContentManager` の部分更新または差し替え
- benchmark のためだけの通常運用ログ
