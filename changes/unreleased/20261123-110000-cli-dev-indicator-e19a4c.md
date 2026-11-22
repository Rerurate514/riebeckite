---
packages:
  - "@riebeckite/cli"
  - "@riebeckite/web"
type: changed
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

`riebeckite dev` now shows a progress indicator while the site becomes reachable: the elapsed time of each startup phase (loading the config, starting the Vite dev server, preparing the first page) and a `Ready` line once the development server answers its first request. The first-page request also warms the site, so the browser opens against an already-built page. The indicator only runs for interactive `riebeckite dev`; managed development sessions and `riebeckite ai mcp` keep their existing machine-readable output. The website's `pnpm dev` prints the same phase lines (`riebeckite:`) plus a progress line every five seconds while the first page is being prepared, then the total time until the first response.
