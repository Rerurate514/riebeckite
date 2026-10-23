---
date: 2026-10-14
title: Check
sidebar:
  hidden: true
---

# Check

Plugin依存の循環やpermalinkの重複など、Buildを壊す問題がないか、サイトの設定とコンテンツを検証するCLIコマンドです。

## 検証する内容

Pluginの依存関係の循環、提供capabilityの重複、permalinkの衝突、公開設定の誤りなどを調べます。Buildの前に実行し、失敗につながる問題を早く見つけます。

## `check`コマンドの詳細

`riebeckite check`は以下を検証します。

- **設定形式** ：設定ファイルの構造が妥当か（型、必須フィールド）
- **Plugin設定** ：各pluginの`validateOptions`が通過したか
- **必要なcapability** ：すべてのpluginの`provides`と`requires`が循環なく解決されているか

コマンドは検証に失敗すると非ゼロの終了コードで終了しますが、buildを実行したり出力を出したりしません。

### 例

```sh
# 設定の検証前にビルドを実行
npm exec riebeckite check

# 結果：妥当であれ「✓ Configuration」と「✓ Content directory」が表示、
# 設定に問題があれエラーメッセージが表示されて検出されます
```
## 関連用語

- [[doctor|Doctor]]
- [[glossary/inspector|Inspector]]
- [[build|Build]]

## さらに詳しく

- [Check](../reference/cli.ja.md)
