---
name: riebeckite-plugin
description: Use when creating, changing, or debugging a Riebeckite plugin.
riebeckiteVersion: "{{riebeckite-version}}"
---

# Plugin workflow

Read `references/guide.md` and complete `assets/checklist.md`.

1. Inspect the existing extension and configuration before adding code. Generate a new local package with `npm exec riebeckite create plugin <name>` rather than editing a dependency.
2. Define and register a `definePlugin` factory. Keep options explicit and validate every external input at its boundary.
3. Select the narrowest API: Remark/Rehype for one transform; pipeline extensions only for ordering; assets for CSS/client entries; lifecycle hooks or endpoints only when required.
4. Treat content cache dependencies honestly: use `tracked` unless output has no content or file dependency.
5. Keep behavior in the Plugin. Expose `rr-*` hooks and `--rr-*` extension tokens; do not take ownership of framework `rb-*` contracts.
6. Add focused tests for transformations, invalid input, and public behavior. Avoid changing unrelated project configuration.
7. Run `npm exec riebeckite plugin verify <path> --level full`; use `plugin dev` when visual/runtime behavior needs inspection.
8. Report the API selected, cache behavior, configuration change, verification result, and compatibility risk.
