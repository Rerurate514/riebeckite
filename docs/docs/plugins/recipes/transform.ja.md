---
date: 2026-10-20
title: "Markdown / HTML を変換する"
sidebar:
  label: "1. Markdown / HTML を変換する"
  order: 1
---
# Markdown / HTML を変換する

既製の unified プラグインを使うなら `remarkPlugins`、自分で `pipeline.use` を呼ぶなら `extendMarkdownPipeline` を使います。HTML 側は `rehypePlugins` と `extendHtmlPipeline` です。

`:::tip` ディレクティブを一から作る手順は [はじめてのプラグイン作成](../writing-a-plugin.ja.md#3-markdown--html-を変換する) にあります。ここでは既製の変換を最短で組み込む形だけ示します。

パッケージをインストールします。

```bash
npm install remark-math rehype-katex
```

```ts
import { definePlugin } from "@riebeckite/core";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

export function mathPlugin() {
  return definePlugin({
    name: "math",
    processedContentCache: {
      version: "1",
      dependencyMode: "none",
    },
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
    assets: [
      {
        pluginName: "math",
        kind: "style",
        moduleSpecifier: "katex/dist/katex.min.css",
      },
    ],
  });
}
```

`processedContentCache` は、出力がソース、frontmatter、オプション、このバージョンだけで決まることを Riebeckite に伝えます。変換の内容を変えたら `version` を上げてください。宣言がなくてもプラグインは動きますが、サイトは処理済みコンテンツを再利用できません。

---

[プラグイン機能別レシピに戻る](./README.ja.md) · [Plugin API](../../reference/plugin-api.ja.md)
