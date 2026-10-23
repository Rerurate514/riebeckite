---
date: 2026-10-14
title: インスペクタ（Inspector）
sidebar:
  hidden: true
---

# インスペクタ（Inspector）

解決済みの状態（設定、プラグイン、コンテンツ、グラフ、ビルド状態など）を閲覧する読み取り専用のCLIコマンドです。

## 読み取り専用の保証

ビルドの実行、キャッシュ・アセット・状態への書き込み、アセットの出力、特別な成果物の描画、設定の自動修正を行ってはいけません。
求めた情報が存在しない場合は、その状況をそのまま報告します。

## コマンド

`riebeckite inspect config` — 解決済みの設定。
`riebeckite inspect plugins` — 有効なプラグイン。
`riebeckite inspect content --list` — 公開されたコンテンツとURL。
`riebeckite inspect graph` — コンテンツグラフの関係。
`riebeckite inspect build` — 増分ビルドの状態。

## 検査の内容

各inspectコマンドは、ビルドの処理を一切起こさずに解決済みの状態を読み取ります。

- **`riebeckite inspect config`** は、既定値と処理が適用されたあとにRiebeckiteが実際に使う解決済みの設定を表示します。設定ファイルに書かれた生の値ではありません。

- **`riebeckite inspect plugins`** は、現在有効なプラグインを表示します。追加したつもりのプラグインが本当に読み込まれているかの確認に使います。

- **`riebeckite inspect content --list`** は、Riebeckiteが認識しているコンテンツを、各エントリの解決済みの正規パーマリンクとともに一覧表示します。ある記事がファイルシステム上のどこにあっても、どのURLとして認識されているかを確認するのに役立ちます。

- **`riebeckite inspect graph`** は、コンテンツ間の関係を表示します。WikiLink、バックリンク、グラフの拡張の調査に役立ちます。

- **`riebeckite inspect build`** は、増分ビルドで使われる状態を表示します。有効な状態があればその情報を表示します。状態が利用できない場合は、その理由（状態ファイルが存在しない、JSONが不正、状態のバージョンが一致しない、構造を認識できないなど）を表示します。Inspectorが新しい状態を作成したり、既存の状態を書き換えたりすることはありません。

### 読み取り専用の保証の実際

Inspectorは意図的に読み取り専用です。ビルドの実行、増分ビルドの状態やプラグインキャッシュへの書き込み、アセットの出力、特別な成果物の描画、Vite/HonoXのビルド処理の呼び出し、問題の自動修正を行いません。この性質により、Inspectorは開発中だけでなくCIでも安全に使えます。

### 例

```sh
# Inspect the current build state
riebeckite inspect build

# Output shows whether incremental state exists and its validity,
# without modifying any state or triggering a build.
```
## 関連用語

- [[check|Check]]
- [[doctor|Doctor]]
- [[build|Build]]

## さらに詳しく

- [Inspector](../framework/inspector.ja.md)
