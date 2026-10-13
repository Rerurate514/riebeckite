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

## 関連用語

- [[check|Check]]
- [[doctor|Doctor]]
- [[build|Build]]

## さらに詳しく

- [Inspector](../framework/inspector.ja.md)
