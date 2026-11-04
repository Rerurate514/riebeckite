# External and layout E2E

Target commit: `7a031cab` plus audit fixes through `f7328eff`.

## Published-artifact E2E

Command: `$env:RIEBECKITE_E2E_KEEP=1; pnpm test:e2e:external`

Result: PASS. The harness packed all published packages, installed them with
npm into a temporary site, ran `riebeckite check`, `doctor`, `inspect`, and
`build` from `site/app`, verified markers from a site-local plugin and theme,
typechecked with bundler and NodeNext resolution, then generated a second site
with `riebeckite init` and built it.

Kept workspace:
`C:\Users\rerur\AppData\Local\Temp\riebeckite-e2e-5xsGBA`.

## Three layouts

All three layouts used the kept E2E workspace (installed tarball dependencies,
the 44-plugin fixture site, and the 45-note vault) and were built from the
nested `app/` working directory with `riebeckite check` and `riebeckite build`.

| Layout | Shape | Result |
| --- | --- | --- |
| A | Site and content in the same directory (`content/`) | PASS |
| B | `site/` and `vault/` in one Git repository | PASS |
| C | Separate content Git repository and site Git repository | PASS |

Each build produced `dist/index.html` and `dist/notes/example.html`, reported
`No problems found.` from `riebeckite check`, and did not emit
`dist/notes/private-note.html` for the private note.

Layout A result path:
`C:\Users\rerur\AppData\Local\Temp\riebeckite-e2e-5xsGBA\layout-a`

Layout B result path:
`C:\Users\rerur\AppData\Local\Temp\riebeckite-e2e-5xsGBA\layout-b\site`

Layout C result path:
`C:\Users\rerur\AppData\Local\Temp\riebeckite-e2e-5xsGBA\layout-c\site-repo`

## Unverified in this environment

- Real deployment to Cloudflare Workers or GitHub Pages was not performed.
- Real mobile devices and touch input were not used.
- Visual regression baselines require Chrome `155.0.8059.79`; the installed
  browser is `156.0.8078.47`, so the pinned visual suite was not run.
