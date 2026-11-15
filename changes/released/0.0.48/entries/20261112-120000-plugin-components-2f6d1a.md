---
packages:
  - "@riebeckite/core"
  - "@riebeckite/honox"
  - "@riebeckite/plugin-code-enhance"
  - "create-riebeckite"
type: added
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

Add declarative Markdown components (`markdownComponents`) that render from Markdown fences and MDX JSX through one registry, with server rendering, JSON-safe props, lazy client hydration, SPA-safe lifecycle cleanup, and automatic MDX integration. Code-enhance's copy button uses the new API, and the starter scaffold includes Markdown and MDX component examples.
