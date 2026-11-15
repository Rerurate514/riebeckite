# Riebeckite v0.0.49

Released 2026-11-15.

### Fixed

- The development inspector registers its bridge middleware before other Vite plugins, so the bridge endpoint answers first when another plugin also handles the same request.
  Packages: `@riebeckite/dev-inspector`

- Rebuilding a package removes its previous output directory first, so a published package no longer carries build files left behind by earlier builds. `@riebeckite/cli` 0.0.48 shipped hundreds of unreferenced chunk files that made the unpacked package about 25 MB larger than the built output.
  Packages: `@riebeckite/cli`

- The graph renderer no longer throws while it is created. Its camera, drawing, and animation controllers now receive the renderer context when they are created, so resizing, updating, zooming, and drawing use that context instead of a missing argument. Local graphs and the garden explorer draw again instead of leaving an empty canvas.
  Packages: `@riebeckite/graph`

---

Full changelog: https://github.com/Rerurate514/riebeckite/blob/v0.0.49/CHANGELOG.md
Compare: https://github.com/Rerurate514/riebeckite/releases/tag/v0.0.49
