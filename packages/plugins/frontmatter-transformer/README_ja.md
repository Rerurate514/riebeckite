# @riebeckite/plugin-frontmatter-transformer

Riebeckite のフロントマターを安全に一括変換するプラグインです。名前空間付きの CLI コマンドを追加し、既存の Content Migration の計画、ミューテーションジャーナル、履歴、ロールバックをそのまま利用します。独自のマイグレーションエンジンは実装していません。

[English](./README.md)

```ts
import { frontmatterTransformer } from "@riebeckite/plugin-frontmatter-transformer";

plugins: [frontmatterTransformer()];
```

```sh
riebeckite frontmatter presets
riebeckite frontmatter plan --preset normalize-tags
riebeckite frontmatter apply --preset normalize-tags --apply
riebeckite frontmatter history
riebeckite frontmatter rollback <plan-id> --apply
```

`plan` と `apply` は `--apply` を渡さない限りドライランです。`--preset` を複数回指定するとプリセットを組み合わせられます。

## プリセット

- `normalize-tags` は文字列またはカンマ区切りのタグを分割し、重複を除いた配列にします。
- `trim-text` は `title` と `description` の前後の空白を削除し、空になったフィールドを削除します。
- `remove-empty-fields` は空の `description`、`image`、`tags`、`aliases` を削除します。

保存済みの計画は `--plan <path>` で適用できます。計画ファイルと状態は既定でコンテンツディレクトリの `.riebeckite/migrations` に保存されます。すべての書き込みはミューテーションジャーナルを保持し、ロールバックできます。
