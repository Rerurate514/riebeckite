---
date: 2026-10-20
title: "埋め込みファイルを描画する"
sidebar:
  label: "2. 埋め込みファイルを描画する"
  order: 2
---
# 埋め込みファイルを描画する

`renderers` は、埋め込みコンテンツの既定の出力を置き換えます。レンダラーが受け取るのは、対象の種類、ソースパス、ラベル、公開 URL、そしてリンクか埋め込みかの区別です。担当外の対象では `null` を返し、別のレンダラーに処理を任せます。

このレシピは、埋め込まれた CSV の先頭数行をプレビューします。

```ts
import {
  definePlugin,
  escapeHtml,
  getExtension,
  readContentSourceEntry,
} from "@riebeckite/core";

const PREVIEW_LINES = 8;

export function csvPreview() {
  return definePlugin({
    name: "csv-preview",
    processedContentCache: {
      version: "1",
      dependencyMode: "tracked",
    },
    renderers: [
      {
        name: "csv-preview",
        render: async (context) => {
          if (context.kind !== "attachment" || !context.embed) return null;
          if (getExtension(context.path) !== "csv") return null;
          if (!context.contentSource) return null;

          const source = await readContentSourceEntry(
            context.contentSource,
            context.path,
          );
          if (source === null) return null;

          const text =
            typeof source === "string"
              ? source
              : new TextDecoder().decode(source);
          const preview = text
            .split(/\r?\n/)
            .slice(0, PREVIEW_LINES)
            .join("\n");

          return `<pre class="rr-csv-preview">${escapeHtml(preview)}</pre>`;
        },
      },
    ],
    assets: [
      {
        pluginName: "csv-preview",
        kind: "style",
        moduleSpecifier: "/extensions/plugin.css",
      },
    ],
  });
}
```

スタイルを追加します。

```css
.rr-csv-preview {
  overflow-x: auto;
  border: 1px solid var(--rb-color-border);
  border-radius: 4px;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
}
```

`![[data.csv]]` のように埋め込むとプレビューが表示されます。`[[data.csv]]` のような通常のリンクでは `null` を返すため、既定のリンク表示が残ります。

プレビューをプレーンテキストにしているのは意図的です。カンマで分割すると引用符で囲まれたカンマを壊すため、表にするなら CSV パーサーを使ってください。ソースファイルを読む以上、出力は外部ファイルに依存します。そのため、このレシピでは `dependencyMode` を `"tracked"` にしています。

---

[プラグイン機能別レシピに戻る](./README.ja.md) · [Plugin API](../../reference/plugin-api.ja.md)
