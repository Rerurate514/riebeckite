---
date: 2026-10-14
title: 検索（Search）
sidebar:
  hidden: true
---

# 検索（Search）

マニフェストからビルド時に作られる検索インデックスと、読み手がコンテンツを検索できるようにするプラグインです。

## 検索インデックス

検索インデックスはビルド時にマニフェストから生成され、slug、permalink、title、body、tags、headingsを持つエントリを含みます。読み手は検索プラグインでインデックスを照会でき、テキスト検索と、タグ、言語、パスによる絞り込みに対応します。

```ts
import { searchItems } from "@riebeckite/plugins/search";

const results = searchItems(manifest.entries, "plugin");
```

## 検索インデックスの生成
検索インデックスはビルド時に検索プラグイン（`packages/plugins/search/`）が生成します。マニフェストから作られ、各エントリの `slug`、`permalink`、`title`、`body`、`tags`、`headings` を含みます。インデックスは `searchItems` 関数で生成され、次のことができます。

- **テキスト検索**：エントリのbodyとheadingsに対する全文検索
- **タグフィルタ**：frontmatterで指定されたタグによる結果の絞り込み
- **言語フィルタ**：エントリのロケールによる結果の絞り込み
- **パスフィルタ**：URLパスによる結果の絞り込み

```ts
import { searchItems } from "@riebeckite/plugins/search";
// Example: search for entries with tag "plugin"
const results = searchItems(manifest.entries, "plugin", { tags: ["plugin"] });
// Example: search in Japanese
const results = searchItems(manifest.entries, "plugin", { lang: "ja" });
```

検索プラグインはサイトのセットアップ時に登録され、検索UIとの統合を提供します。結果は関連性で並べ替えられ、タグの一致、言語の優先度、パスの近さが考慮されます。

## 関連用語

- [[content-index|Content Index]]
- [[content-query|Content Query]]
- [[manifest|Manifest]]

## さらに詳しく

- [../plugins/search.ja.md]
