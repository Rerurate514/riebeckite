---
date: 2026-10-08
title: 記事の書き方ガイド
---
# 記事の書き方ガイド

Riebeckite で公開する記事の基本的な書き方を説明します。

Markdown に慣れていなくても、

```text
記事ファイルを作る
      ↓
タイトルを書く
      ↓
本文を書く
      ↓
ブラウザで確認
      ↓
公開
```

まで進められる内容です。

## このページの構成

- [基本](./writing-content/setup.ja.md)
- [Markdown](./writing-content/markdown.ja.md)
- [ワークフロー](./writing-content/workflow.ja.md)

## 最初はこれだけ覚えればよい

Riebeckite で記事を書くために、最初からすべての機能を覚える必要はありません。

まずは、

```md
---
title: 記事のタイトル
publish: true
---

# 記事のタイトル

本文を書きます。
```

という形だけ覚えておけば記事を公開できます。

その後、必要に応じて、

```text
Markdown
WikiLink
画像
frontmatter
プラグイン
多言語対応
```

などを追加していけば十分です。

## まとめ

Riebeckite で記事を書く基本的な流れはシンプルです。

```text
content/ に .md を作る
        ↓
title を付ける
        ↓
publish: true を付ける
        ↓
Markdown で本文を書く
        ↓
dev で確認
        ↓
check / doctor
        ↓
build
```

公開する記事と下書きを分けるために、まず覚えておきたいのは、

```yaml
publish: true
```

です。

また、記事の公開 URL は最終的に Riebeckite が解決した **Public Location** で決まります。通常の記事を書く段階では URL の仕組みを意識しすぎる必要はありません。

### 次に読むもの

- [サイト公開までの最短ガイド](../getting-started/deployment.ja.md)
- [Obsidian のノートをサイトにするガイド](./obsidian.ja.md)
- [多言語サイト](./localization.ja.md)
- [Configuration](../reference/configuration.ja.md)
