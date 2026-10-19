---
title: "Log and Trace"
sidebar:
  label: "15. Log and Trace"
  order: 15
---
# Log and Trace

Use `context.logger` for operational messages and `context.tracer` for timing that the profiler can consume. Logger context values must be strings, numbers, booleans, or null.

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

Do not write your own timer and print the result. The profiler reads structured spans, and ad-hoc output bypasses the normal log levels.

---

[Back to Plugin Recipes](./README.md) · [Plugin API](../../reference/plugin-api.md)
