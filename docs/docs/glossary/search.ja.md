---
date: 2026-10-14
title: 検索（Search）
sidebar.hidden: true
---

# 検索（Search）

マニフェストからビルド時に作られる検索インデックスと、読み手がコンテンツを検索できるようにするプラグインです。

## 検索インデックス

検索インデックスはビルド時に `buildSearchItems` がマニフェストの検出可能エントリから生成します。各項目は slug、permalink、title、aliases、headings、body、excerpt、tags、language、date を持ちます。`searchItems` で照会でき、テキスト検索と `tag:`、`lang:`、`path:` フィルタに対応します。

```ts
import { buildSearchItems, searchItems } from "@riebeckite/plugin-search";

const items = buildSearchItems({ manifest, config });
const results = searchItems(items, "plugin");
```

## 検索インデックスの生成
検索インデックスはビルド時に検索プラグイン（`packages/plugins/search/`）が `manifest.discoverableEntries` から生成します。インデックスは `buildSearchItems` で構築し、`SearchItem[]` を返します。`searchItems` はその配列を照会し、次のことができます。

- **テキスト検索**：slug、title、aliases、tags、headings、body に対する照合
- **タグフィルタ**：クエリ文字列の `tag:plugin`
- **言語フィルタ**：クエリ文字列の `lang:ja`、または `language` オプション
- **パスフィルタ**：クエリ文字列の `path:notes`

```ts
import { buildSearchItems, searchItems } from "@riebeckite/plugin-search";

const items = buildSearchItems({ manifest, config });
const tagged = searchItems(items, "plugin tag:plugin");
const japanese = searchItems(items, "plugin", { language: "ja" });
```

検索プラグインはサイトのセットアップ時に登録され、検索 UI との統合を提供します。結果はインデックスされた各フィールドの関連性で並べ替えられます。

## 関連用語

- [[content-index|Content Index]]
- [[content-query|Content Query]]
- [[manifest|Manifest]]

## さらに詳しく

- [../plugins/search.ja.md]
