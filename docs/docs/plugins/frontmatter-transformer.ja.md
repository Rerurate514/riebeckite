---
date: 2026-11-01
title: Frontmatter Transformer
---
# Frontmatter Transformer

名前空間付きの CLI コマンドから、フロントマターを安全に一括変換するプラグインです。既存の Content Migration の計画、ミューテーションジャーナル、履歴、ロールバックをそのまま利用し、独自のマイグレーションエンジンは実装していません。

[English](./frontmatter-transformer.md)

## 概要

```ts
import { defineConfig } from "@riebeckite/core";
import { frontmatterTransformer } from "@riebeckite/plugin-frontmatter-transformer";

export default defineConfig({
  // ...
  plugins: [frontmatterTransformer()],
});
```

`frontmatter` コマンド名前空間を追加します。すべてのコマンドはプロジェクトを必要とし、解決済み設定からコンテンツルートを特定します。

```sh
riebeckite frontmatter presets
riebeckite frontmatter plan --preset normalize-tags
riebeckite frontmatter apply --preset normalize-tags --apply
riebeckite frontmatter history
riebeckite frontmatter rollback <plan-id> --apply
```

`plan` と `apply` は `--apply` を渡さない限りドライランです。`apply` はファイルを書き換えずに計画の要約を表示します。`--preset` を複数回指定すると、1 つの計画にまとめて変換できます。

## プリセット

| プリセット | 説明 |
| ---------- | ---- |
| `normalize-tags` | 文字列またはカンマ区切りのタグを分割し、重複を除く |
| `trim-text` | `title` と `description` の前後の空白を削除し、空になったフィールドを削除する |
| `remove-empty-fields` | 空の `description`、`image`、`tags`、`aliases` を削除する |

プリセットはバージョン付きの Content Migration 定義です。プロジェクトのマイグレーションと同じレジストリとプランナーで解決されます。不明なプリセット名は、ファイルを読み書きする前に失敗します。

## コマンド

| コマンド | 説明 |
| -------- | ---- |
| `frontmatter presets` | 利用できるプリセットを一覧表示する |
| `frontmatter plan --preset <name>` | ファイルを書き換えずに計画する |
| `frontmatter apply --preset <name>` | `--apply` を渡すまでドライラン |
| `frontmatter history` | 最近の実行履歴を表示する |
| `frontmatter rollback <plan-id>` | `--apply` を渡すまでドライラン |

`plan` は `--out <path>` で計画を保存できます。`apply` は `--plan <path>` で保存済み計画を利用できます。エンジンは再計画し、コンテンツまたはプリセット定義が変わっていれば古い計画として拒否します。`history` は `--limit` を受け付けます。`--json` を渡すと JSON を返します。

## 状態と安全性

計画、状態、履歴、ミューテーションジャーナルは、既定でコンテンツディレクトリの `.riebeckite/migrations` に保存されます。書き込みは既存の FileSystem コンテンツミューテーションを使用し、パス検証、シンボリックリンク検査、原子的な書き込み、ロックファイル、SHA-256 フィンガープリント、バックアップ、中断した実行の復旧を行います。ロールバックは対象計画のジャーナルのバックアップを復元します。

選択したプリセットの対象フィールド以外を自動で削除することはありません。プリセットを組み合わせる場合は、適用前に計画を確認してください。

## 関連資料

- [CLI 拡張](../reference/cli-extension.ja.md)
- [コンテンツマイグレーション](../reference/cli.ja.md)
- [プラグインシステム](../reference/plugin-api.ja.md)
