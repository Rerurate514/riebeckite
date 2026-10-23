---
date: 2026-10-14
title: Doctor（プロジェクト診断コマンド）
sidebar:
  hidden: true
---

# Doctor（プロジェクト診断コマンド）

プロジェクト全体を診断するCLIコマンドで、環境、設定、プラグイン、コンテンツ、ビルド状態を確認します。

## 確認する内容

環境、設定、プラグイン、コンテンツソース、ビルド状態を確認します。
可能な範囲で独立したチェックを続行し、健全性チェックが失敗すると非ゼロで終了します。

## 役割

ビルドの代わりにはなりません。doctorの結果が失敗であれば非ゼロで終了します。
1つの診断に失敗しても、安全に続行できる独立した診断は可能な限り継続します。

## チェックの詳細

`riebeckite doctor`は次の領域で独立したチェックを行います。

- **環境** — プロジェクトのルートディレクトリが存在し、設定ファイルが読み取れる
- **設定** — 設定の検証（`check`と同じ）、プラグインの依存解決
- **プラグイン** — 登録されたすべてのプラグインを読み込め、オプションが有効
- **コンテンツ** — コンテンツソースを走査でき、無効または重複した論理パスがない
- **ビルド状態** — 増分ビルドの状態が有効で、フィンガープリントが現在のコンテンツと一致する

各チェックは独立して実行されるため、ある領域の失敗がほかの領域のチェックを妨げることはありません。いずれかのチェックがエラーを報告すると、コマンドは非ゼロの終了コードで終了します。

### 例

```sh
# Doctor diagnoses project health
npm exec riebeckite doctor

# Output reports per-area status, e.g.:
# ✓ Environment
# ✓ Config
# ✓ Plugins (3 resolved)
# ✓ Content (12 entries)
# ⚠ Build State: stale, will fall back to full build
```
## 関連用語

- [[check|Check]]
- [[glossary/inspector|Inspector]]
- [[build|Build]]

## さらに詳しく

- [CLI](../reference/cli.ja.md)
