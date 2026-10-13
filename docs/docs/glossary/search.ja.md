---
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

## 関連用語

- [[content-index|Content Index]]
- [[content-query|Content Query]]
- [[manifest|Manifest]]

## さらに詳しく

- [../plugins/search.ja.md]