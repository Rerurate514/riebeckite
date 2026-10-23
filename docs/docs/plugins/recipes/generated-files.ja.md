---
date: 2026-10-20
title: "ファイルを生成する"
sidebar:
  label: "13. ファイルを生成する"
  order: 13
---
# ファイルを生成する

`planGeneratedOutputs` は、ビルド前に、生成するファイルと、そのファイルが古いかどうかを判断する依存関係を宣言します。増分ビルドで追跡できるため、静的ファイルを出すときはこの方法を優先します。

このレシピは公開エントリから `llms.txt` を書き出します。

```ts
import { definePlugin } from "@riebeckite/core";

export function llmsTxtPlugin() {
  return definePlugin({
    name: "llms-txt",
    planGeneratedOutputs: ({ manifest }) => [
      {
        path: "llms.txt",
        content: [
          "# Riebeckite site",
          "",
          ...manifest.discoverableEntries.map(
            (entry) => `- <${entry.permalink}> ${entry.title}`,
          ),
        ].join("\n"),
        dependencies: [{ type: "global" }],
      },
    ],
  });
}
```

パスはビルド出力からの相対パスです。`/` で始めたり、`..` を使ったり、`assets/` や `.riebeckite/` を指定したりはできません。`attachments/` はコンテンツの添付ファイル用なので使わないでください。

ビルドの終盤にすでに動いているインテグレーション形式のプラグインなら、`buildEnd` から直接書き出せます。

```ts
buildEnd: ({ output }) => {
  output.emit({
    path: "build-info.json",
    content: JSON.stringify({ generated: true }),
    dependencies: [{ type: "global" }],
  });
}
```

通常のビルド出力は `output.emit`、`assets/` 配下に置く生成アセットは `output.emitAsset` を使います。どちらもビルドのライフサイクル外では利用できません。`emit` は `assets/`、`emitAsset` は `attachments/` には書き込めません。計画した出力には少なくとも 1 つの依存関係が必要です。空配列を「常に再ビルド」の意味にはしないでください。

---

[プラグイン機能別レシピに戻る](./README.ja.md) · [Plugin API](../../reference/plugin-api.ja.md)
