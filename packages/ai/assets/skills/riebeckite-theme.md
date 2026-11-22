---
name: riebeckite-theme
description: Use when creating or changing a Riebeckite theme or its presentation.
riebeckiteVersion: "{{riebeckite-version}}"
---

# Theme workflow

Read `references/guide.md` and complete `assets/checklist.md`.

1. Inspect the active Theme, site CSS, layout, and representative pages. Create a local Theme with `npm exec riebeckite create theme <name> --register`; never edit `node_modules`.
2. Use `defineTheme` and typed `defineThemeSettings`. Define semantic `--rb-*` tokens before styling components.
3. Keep Theme work presentational. Do not add Plugin behaviour or copy a Plugin's internal CSS.
4. Preserve `rb-*` structural hooks; add only `rr-*` extension hooks. Put project-specific overrides in unlayered site CSS intentionally.
5. Test token changes in light, dark, and system modes, and every affected component state. Do not infer accessibility from colour values alone.
6. Check semantic HTML, keyboard focus, contrast, long content, narrow layouts, and reduced motion.
7. Run `npm exec riebeckite theme preview <name>` and inspect mobile and desktop views.
8. Run `npm run check` and `npm run build` when the Theme is registered in the site.
9. Report affected tokens and hooks, tested modes/viewports, and remaining visual or accessibility risk.
