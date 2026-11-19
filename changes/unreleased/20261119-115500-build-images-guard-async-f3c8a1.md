---
packages: []
type: fixed
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

Fix the website's content asset build script so its prebuild step actually runs: the direct-execution guard compared the helper module's own path instead of the entry script, so `prebuild` silently did nothing. The image build also moves out of `predev` into a background task started by the Vite dev server, so `pnpm dev` no longer waits about 14 seconds for it.
