# Official Plugin catalog checklist

- [ ] Write the capability and affected content/route in one sentence.
- [ ] Inspect `riebeckite.config.ts` and `package.json` for existing Plugins and overlap.
- [ ] Search the official catalog with `riebeckite_plugin_catalog` or the docs site.
- [ ] Read the current documentation for every serious candidate.
- [ ] Compare input format, output stage, configuration, companions, routes, assets, and cache impact.
- [ ] Confirm the package supports the project's Riebeckite version.
- [ ] Choose the narrowest Plugin; reject broad bundles for a single feature.
- [ ] Install only the required package and register it in the existing configuration style.
- [ ] Run `npm run check`.
- [ ] Run `npm run build` and inspect the affected page, route, feed, or asset.
- [ ] If no Plugin fits, report the gap and the recommended boundary instead of duplicating one.
- [ ] Report the chosen package, version, configuration, and remaining risk.
