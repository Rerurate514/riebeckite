---
title: Inspector
sidebar:
  hidden: true
---

# Inspector

解決済みの状態（設定、Plugin、content、content graph、Build Stateなど）を閲覧する読み取り専用のCLIコマンドです。

## 読み取り専用の保証

Buildの実行、cacheやasset、stateへの書き込み、assetの書き出し、特別な成果物の描画、設定の自動修正を行いません。求めた情報が存在しない場合は、その条件をそのまま報告します。

## コマンド

- `riebeckite inspect config`は解決済みの設定を表示します。
- `riebeckite inspect plugins`は有効なPluginを表示します。
- `riebeckite inspect content --list`は公開されたcontentとURLを表示します。
- `riebeckite inspect graph`はcontent graphの関係を表示します。
- `riebeckite inspect build`はIncremental Buildの状態を表示します。

## Inspection Details

各inspectコマンドはビルドを実行せず、解決済みの状態のみを読み取ります。

- **`riebeckite inspect config`** ：実際にRiebeckiteが使用する解決済みの設定を表示します。設定ファイルに書かれた生の値ではなく、デフォルトと処理が適用された後の値です。

- **`riebeckite inspect plugins`**：現在有効なPluginを表示します。意図して追加したpluginが本当に読み込まれているか確認するのに役立ちます。

- **`riebeckite inspect content --list`** ：Riebeckiteが認識しているcontentの一覧を表示し、それぞれのresolved canonical permalinkを表示します。記事がファイルシステム上のどこにあろうと、実際にサイトで使われるURLがどのようになるかを確認するのに役立ちます。

- **`riebeckite inspect graph`** ：content間の関係を表示します。WikiLinks、backlinks、graphの拡張機能を調査するのに役立ちます。

- **`riebeckite inspect build`** ：インクリメンタルビルドで使用される状態を表示します。有効な状態が存在すればその情報を表示します。状態が利用できない場合は、その理由を表示します（stateファイルが存在しない、JSONが不正、stateのバージョンが現在のRiebeckiteと合わない、構造が認識されないなど）。Inspectorは新しいstateを作成したり既存のstateを書き換えたりしません。

### 読み取り専用の保証について

Inspectorは意図的に読み取り専用です。buildの実行、incremental stateやplugin cacheへの書き込み、assetの出力、特別な成果物の描画、Vite/HonoXのbuild work、設定の自動修正を行いません。この性質により、Inspectorは開発時だけでなくCIでも安全に使用できます。

### 例

```sh
# 現在のビルド状態を確認
riebeckite inspect build

# 出力はincremental stateの有効性とその詳細を報告します。
# 状態の変更やbuildのトリガーは行いません。
```
## 関連用語

- [[check|Check]]
- [[doctor|Doctor]]
- [[build|Build]]

## さらに詳しく

- [Inspector](../framework/inspector.ja.md)
