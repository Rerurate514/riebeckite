---
date: 2026-10-20
title: "ログとトレースを出す"
sidebar:
  label: "15. ログとトレースを出す"
  order: 15
---
# ログとトレースを出す

運用メッセージには `context.logger`、プロファイラーが集計できる計測には `context.tracer` を使います。ロガーのコンテキスト値は文字列、数値、真偽値、null のいずれかです。

```ts
import { definePlugin } from "@riebeckite/core";

export function timedPlugin() {
  return definePlugin({
    name: "timed",
    buildStart: async ({ logger, tracer }) => {
      const log = logger.child({ plugin: "timed" });
      log.info("Preparing the example plugin");

      await tracer.span("example.prepare", { plugin: "timed" }, async () => {
        log.debug("Running the preparation step");
      });
    },
  });
}
```

自前のタイマーを回して結果を print しないでください。プロファイラーは構造化された span を読み、その場限りの出力は通常のログレベルを迂回します。

---

[プラグイン機能別レシピに戻る](./README.ja.md) · [Plugin API](../../reference/plugin-api.ja.md)
