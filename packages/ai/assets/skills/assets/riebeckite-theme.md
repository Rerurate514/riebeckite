# Theme checklist

- [ ] Inspect the active Theme, site CSS, layout, and representative pages.
- [ ] Create or locate a local Theme; never edit `node_modules`.
- [ ] Use `defineTheme` and typed `defineThemeSettings`.
- [ ] Declare labels, defaults, and bounds for every setting.
- [ ] Preserve `rb-*`/`--rb-*`; use `rr-*`/`--rr-*` for extension hooks.
- [ ] Scope selectors to `data-rb-theme`.
- [ ] Handle explicit dark mode separately from system dark mode.
- [ ] Check light, dark, and system modes.
- [ ] Check keyboard focus, contrast, long content, and narrow layouts.
- [ ] Check reduced-motion behaviour.
- [ ] Run `npm exec riebeckite theme preview <name>`.
- [ ] Run `npm run check`; run `npm run build` when registered.
- [ ] Report tokens/hooks changed, modes/viewports tested, and remaining risk.
