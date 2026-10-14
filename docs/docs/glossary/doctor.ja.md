---
title: Doctor
sidebar:
  hidden: true
---

# Doctor

サイトの構成と環境を確認し、Integration、Theme、デプロイ先が整っているかを検証するCLIコマンドです。Checkよりも周囲の構成について多くを報告します。

## 確認する内容

環境とサイトの構成を確認します。Integration、Theme、デプロイの準備状況を検証します。

## Check Details

`riebeckite doctor`は以下の領域で独立した診断を実行します。

- **環境** ：プロジェクトルートディレクトリの存在、設定ファイルの読み取り可能性
- **設定** ：設定検証（`check`と同様）、plugin依存解決
- **Plugin** ：登録されているすべてのpluginが読み込め、オプションが妥当か
- **Content** ：コンテンツソースがスキャン可能、無効または重複する論理パスがないか
- **Build State** ：インクリメンタルビルドステートの有効性、fingerprintが現在のコンテンツと一致しているか

各チェックは独立して実行されます。ある領域で失敗しても、他の領域のチェックは妨げられません。何らかのチェックがエラーを報告した場合、コマンドは非ゼロの終了コードで終了します。

### 例

```sh
# Doctorでプロジェクトの健全性を診断
npm exec riebeckite doctor

# 出力は領域ごとのステータスを報告します。例：
# ✓ 環境
# ✓ 設定
# ✓ Plugin (3個確認)
# ✓ Content (12エントリ)
# ⚠ Build State: 古い、full buildフォールバックになる可能性あり
```
## 関連用語

- [[check|Check]]
- [[glossary/inspector|Inspector]]
- [[build|Build]]

## さらに詳しく

- [CLI](../reference/cli.ja.md)
