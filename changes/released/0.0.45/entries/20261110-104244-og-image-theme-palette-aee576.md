---
packages:
  - "@riebeckite/core"
  - "@riebeckite/plugin-og-image"
  - "@riebeckite/theme-rerurate"
type: added
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

Themes can declare an optional `palette` of `light` and `dark` background, foreground, and accent colors. The og-image plugin now uses the active theme's palette instead of a fixed navy default, so generated images match the site. `appearance` still overrides individual colors, and themes without a palette keep the previous default.
