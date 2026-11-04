---
packages:
  - "@riebeckite/plugin-excalidraw"
type: changed
breaking: true
migration: 'Call `excalidraw()` without options, and run `puppeteer browsers install chrome-headless-shell` if the build reports a missing browser.'
pr: ""
issue: ""
adr: ""
---

Render Excalidraw drawings to inline SVG during the build and remove the client-side renderer and the `lazy` option.
