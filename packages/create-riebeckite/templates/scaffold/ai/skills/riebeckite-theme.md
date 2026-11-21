---
name: riebeckite-theme
description: Use when creating or changing a Riebeckite theme or its presentation.
riebeckiteVersion: "{{riebeckite-version}}"
---

# Theme workflow

Read `references/guide.md` and complete `assets/checklist.md`.

1. Inspect the active Theme, site CSS, and representative pages. Create a local Theme with `npm exec riebeckite create theme <name> --register`; never edit `node_modules`.
2. Use `defineTheme` and typed `defineThemeSettings`. Define semantic `--rb-*` tokens in `@layer base`, then consume meaning rather than palette values.
3. Keep Theme work presentational. Do not add Plugin behavior or copy Plugin implementation CSS.
4. Preserve `rb-*` structural hooks; add only `rr-*` extension hooks. Put project-specific overrides in unlayered site CSS intentionally.
5. Test token changes in light/dark modes and every affected component state; do not infer accessibility from color values alone.
6. Run `npm exec riebeckite theme preview <name>` and inspect mobile/desktop, keyboard focus, contrast, overflow, and reduced-motion behavior.
7. Report affected tokens/hooks, tested viewports and modes, and remaining visual risk.
