# Local Plugin checklist

- [ ] Confirm the feature belongs in a Plugin, not a Theme, component, or config.
- [ ] Create or locate the Plugin; never edit `node_modules`.
- [ ] Use `definePlugin` with a stable name and typed options.
- [ ] Validate options at the trust boundary.
- [ ] Choose the narrowest extension point.
- [ ] Declare `processedContentCache.version` and the correct `dependencyMode`: `none`, `tracked`, `global`, or `unsafe`.
- [ ] Track content reads through `context.contentSource`; do not read the filesystem directly for tracked input.
- [ ] Declare `outputDependencies` for emitted content-derived output.
- [ ] Use `rr-*`/`--rr-*` for extension CSS; leave `rb-*`/`--rb-*` unchanged.
- [ ] Add tests for output, options, cache mode, and output dependencies.
- [ ] Run `npm exec riebeckite plugin verify <path> --level full`.
- [ ] Run `npm run check`; run `npm run build` when registered in the site.
- [ ] Inspect the affected output and diagnostics.
- [ ] Report extension points, cache mode, dependencies, tests, and remaining risk.
