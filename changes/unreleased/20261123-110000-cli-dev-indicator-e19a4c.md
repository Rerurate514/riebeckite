---
packages:
  - "@riebeckite/cli"
  - "@riebeckite/honox"
  - "@riebeckite/web"
type: changed
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

`riebeckite dev` now shows a progress indicator while the site becomes reachable: the elapsed time of each startup phase (loading the config, starting the Vite dev server, preparing the first page) and a `Ready` line once the development server answers its first request. The indicator only runs for interactive `riebeckite dev`; managed development sessions and `riebeckite ai mcp` keep their existing machine-readable output.

The warmer is now built into the HonoX integration's Vite plugin and enabled by default (`warmContent` defaults to true). After the dev server listens, the first page is requested so the content graph and SSR render finish during startup. While it is being prepared, `riebeckite:` progress lines appear every five seconds; the Vite URL banner and `printUrls` output are held back until the first response, so the local URL appears only once the site is actually reachable. Sites that run dev servers where no local URL can be resolved fall back to warming the content manifest only. Set `warmContent: false` in `riebeckiteVite()` to opt out.
