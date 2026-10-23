---
date: 2026-10-14
title: チェック（Check）
sidebar:
  hidden: true
---

# チェック（Check）

ビルドの前に、設定、プラグイン、ケイパビリティが正しく構成されているかを検証するCLIコマンドです。

## 検証する内容

設定の形式が有効であること。
プラグインの設定が有効であること。
必要なケイパビリティが解決されていること。

## 目的

プロジェクトの基本的な妥当性を確かめるもので、出力がビルド済みか、デプロイ済みかは確かめません。設定が有効であることを保証します。

## checkコマンドの詳細

`riebeckite check`は次を検証します。

- **設定の形式** — 設定ファイルの構造が有効か（型、必須フィールド）
- **プラグインの設定** — 各プラグインの`validateOptions`が通過しているか
- **必要なケイパビリティ** — すべてのプラグインの`provides`と`requires`が循環依存なしに解決されるか

いずれかの検証に失敗すると、コマンドは非ゼロの終了コードで終了しますが、ビルドは実行せず、出力も書き出しません。

### 例

```sh
# Check validates configuration before building
npm exec riebeckite check

# Output: "✓ Configuration" and "✓ Content directory" if valid,
# or an error message indicating what is misconfigured
```
## 関連用語

- [[doctor|Doctor]]
- [[glossary/inspector|Inspector]]
- [[build|Build]]

## さらに詳しく

- [Check](../reference/cli.ja.md)
