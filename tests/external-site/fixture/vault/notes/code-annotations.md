---
title: Code Annotations Demo
description: A note that exercises the code-annotations plugin at build time.
publish: true
---

# Code Annotations Demo

The block below highlights its second line from the fence meta.

```js {2}
const first = 1;
const second = 2;
const third = 3;
```

The block below exercises the diff markers. The removed marker is stripped from
the rendered text.

```js
const kept = true;
const added = "RIEBECKITE_EXTERNAL_CODE_ANNOTATIONS_MARKER"; // [!code ++]
const removed = false; // [!code --]
```

The block below focuses a line with an inline marker.

```js
const focused = 1; // [!code focus]
const plain = 2;
```
