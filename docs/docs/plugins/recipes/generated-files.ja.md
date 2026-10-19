---
title: "ファイルを生成する"
sidebar:
  label: "13. ファイルを生成する"
  order: 13
---
# ファイルを生成する

`planGeneratedOutputs` は、ビルド前にファイルと、それが古いかどうかを決める依存関係を宣言します。増分ビルドで追跡できるため、静的ファイルを出すときはこの方法を優先します。

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

パスはビルド出力からの相対パスです。`/` で始めたり、`..` を使ったり、`assets/`、`attachments/`、`.riebeckite/` を指したりはできません。

ビルドの終盤にすでに動いている integration 形式のプラグインなら、`buildEnd` から直接書き出せます。

```ts
buildEnd: ({ output }) => {
  output.emit({
    path: "build-info.json",
    content: JSON.stringify({ generated: true }),
    dependencies: [{ type: "global" }],
  });
}
```

テキストやバイト列は `output.emit`、添付ファイルは `output.emitAsset` を使います。どちらもビルドのライフサイクル外では利用できません。計画する出力には少なくとも 1 つの依存関係が必要です。空配列を「常に再ビルド」の意味にはしないでください。

---

[プラグイン機能別レシピに戻る](./README.ja.md) · [Plugin API](../../reference/plugin-api.ja.md)
