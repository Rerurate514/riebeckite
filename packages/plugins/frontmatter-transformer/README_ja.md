# @riebeckite/plugin-frontmatter-transformer

<!-- Generated from docs/docs/plugins/frontmatter-transformer.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

名前空間付きの CLI コマンドから、フロントマターを安全に一括変換するプラグインです。既存の Content Migration の計画、ミューテーションジャーナル、履歴、ロールバックをそのまま利用し、独自のマイグレーションエンジンは実装していません。

[English](./README.md)

## インストール

```sh
npm install @riebeckite/plugin-frontmatter-transformer
```

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

## 変更前と変更後

次の frontmatter があるとします。

```yaml
---
title: "  Writing guide  "
tags: "#guides, setup, guides"
description: "  "
---
```

次のコマンドを実行します。

```sh
riebeckite frontmatter apply --preset normalize-tags --preset trim-text
```

計画には変更ファイルが 1 件と表示されます。書き込むには `--apply` を付けます。

```sh
riebeckite frontmatter apply --preset normalize-tags --preset trim-text --apply
```

結果は次のようになります。

```yaml
---
title: Writing guide
tags:
  - guides
  - setup
---
```

`normalize-tags` は先頭の `#` を除き、カンマで分割し、重複を削除します。`trim-text` は `title` の前後の空白を削除し、空になった `description` を削除します。ファイルを書き換えると YAML のキー順や書式が変わる場合があります。

計画の出力例（計画 ID は変わります）。

```text
Migration plan <plan-id>
Presets: normalize-tags@1, trim-text@1
Changed files: 1
Created: 0, moved: 0, frontmatter: 1
```

適用の出力例（ジャーナルのパスは変わります）。

```text
Applied 1 file change(s); mutation journal .riebeckite/migrations/<plan-id>/journal.json.
```

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

- [CLI 拡張](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/cli-extension.ja.md)
- [コンテンツマイグレーション](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/cli.ja.md)
- [プラグインシステム](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.ja.md)
