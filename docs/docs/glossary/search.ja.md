---
date: 2026-10-14
title: Search
sidebar:
  hidden: true
---

# Search

manifestからビルド時に作成される検索indexとプラグインで、読み手がコンテンツをクエリリングできるようにします。

## 検索index

検索indexはmanifestからビルド時に生成され、slug、permalink、title、body、tags、headingsを持つentryを含みます。読み手はsearchプラグインを使用してテキスト検索やtag、言語、pathによるフィルタリングを行えます。

```ts
import { searchItems } from "@riebeckite/plugins/search";

const results = searchItems(manifest.entries, "plugin");
```

## 検索indexの生成
検索indexはビルド時にsearch plugin (`packages/plugins/search/`)によって生成されます。manifestから作成され、各entryの`slug`、`permalink`、`title`、`body`、`tags`、および`headings`を含みます。indexは`searchItems`関数を使用して生成され、以下をサポートします：

- **テキスト検索**: entryのbodyとheadingsに対してフルテキスト検索
- **tagフィルタ**: frontmatterで指定されたタグで結果をフィルタリング
- **言語フィルタ**: エントリのlocaleによって結果をフィルタリング
- **pathフィルタ**: URLパスによって結果をフィルタリング

```ts
import { searchItems } from "@riebeckite/plugins/search";
// Example: tag "plugin" で検索
const results = searchItems(manifest.entries, "plugin", { tags: ["plugin"] });
// Example: 日本語で検索
const results = searchItems(manifest.entries, "plugin", { lang: "ja" });
```

search pluginはサイトセットアップ時に登録され、search UI統合を提供します。結果は関連性でソートされ、tagマッチ、言語優先度、path接近性を考慮します。

## 関連用語
- [[content-index|Content Index]]
- [[content-query|Content Query]]
- [[manifest|Manifest]]
































## さらに詳しく

- [../plugins/search.ja.md]