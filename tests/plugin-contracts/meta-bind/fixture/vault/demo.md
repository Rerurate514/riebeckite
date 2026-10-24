---
title: Meta Bind Demo
publish: true
progress: 2
done: false
secret: RIEBECKITE_META_BIND_SECRET
---

# Meta Bind Demo

RIEBECKITE_META_BIND_DEMO

Progress: `INPUT[slider(minValue(0), maxValue(10), stepSize(1)):progress]`

Mirror: `INPUT[number(minValue(0), maxValue(10)):progress]`

Double progress: `VIEW[{progress} * 2]`

Done: `INPUT[toggle:done]` / `VIEW[{done}]`

[Other page](/other)
