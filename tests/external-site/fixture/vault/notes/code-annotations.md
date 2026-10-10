---
title: Code Annotations Demo
description: A note that exercises the code-annotations plugin at build time.
publish: true
---

# Code Annotations Demo

The block below exercises the diff fence and retains its markers in the
rendered and copied text.

```diff ts
const kept = true;
+ const added = "RIEBECKITE_EXTERNAL_CODE_ANNOTATIONS_MARKER";
- const removed = false;
```
