---
name: riebeckite-plugin
description: Use when creating or changing a local Riebeckite Plugin.
riebeckiteVersion: "{{riebeckite-version}}"
---

# Local Plugin workflow

Read `references/guide.md` and complete `assets/checklist.md`.

1. Inspect `riebeckite.config.ts`, existing Plugins, and `package.json`. Confirm the feature belongs in a Plugin rather than a Theme, application component, or configuration.
2. Create or locate the Plugin with `npm exec riebeckite create plugin <name> --features transform` when a scaffold is appropriate. Never edit `node_modules`.
3. Implement a named factory around `definePlugin`. Type the options, set a stable `name`, and validate user input at the boundary.
4. Choose the narrowest extension point: direct `remarkPlugins`/`rehypePlugins`, a pipeline extension, a lifecycle hook, or an explicitly needed endpoint or renderer.
5. Declare `processedContentCache` honestly. Use `none`, `tracked`, `global`, or `unsafe` according to what the transform actually reads; do not invent local incremental invalidation.
6. Declare output dependencies when the Plugin emits content-derived output. Use `content`, `tag`, `folder`, `global`, or `unknown` as appropriate.
7. Use `rr-*` hooks and `--rr-*` tokens for extension-owned CSS. Leave `rb-*` and `--rb-*` framework contracts unchanged.
8. Add a focused test for the transform, option validation, cache declaration, and any output dependency. Test a real content fixture, not only a unit stub.
9. Run `npm exec riebeckite plugin verify <path> --level full`, then `npm run check` and `npm run build` when the Plugin is registered in the site.
10. Use `npm exec riebeckite plugin dev <path>` for an isolated development loop. Inspect diagnostics and the affected output.
11. Report the Plugin API used, cache mode, output dependencies, tests and verification, and any unresolved compatibility risk.
