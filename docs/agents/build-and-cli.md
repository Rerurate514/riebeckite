---
title: Build and CLI Rules for Agents
---
# Build and CLI Rules for Agents

Use the CLI from the application directory:

```text
init [directory] [--force] | create [site | plugin | theme | page-type | component]
dev | check | doctor | build [--full] | clean [--output | --all] | profile [--full]
inspect [config | plugins | content [--list] | graph | build | assets | provenance | api]
upgrade --to <version|latest> [--check] [--json] | deploy setup | deploy workflow [--check] | deploy domain
publish plan | status | validate | run | approve | revoke | record | gate
content create | edit | delete | move | plan | apply | recover
migrate list | plan | apply | status | history | rollback | recover
plugin dev <path> | plugin verify <path> [--json] | theme preview <name>
completion <bash | zsh | powershell> [--project]
```

`check` validates resolved configuration, enabled plugins, and capabilities; it is not a build. `doctor` reports environment/config/plugin/content/diagnostic/build-state health and continues independent checks where possible. A failed doctor result must produce a failing exit status.

Inspector is strictly read-only. Never use it to build, write state/cache/assets, run Vite/HonoX build work, render artifacts solely to inspect them, or auto-fix problems. Use an explicit `build` for mutation.

Incremental state is `.riebeckite/build/content-state.json`, application-scoped and committed during the SSG phase after the manifest build; a failure after the commit can leave the new state. It is an optimization, not truth: missing/incompatible/unsafe inputs require initial or full processing. Plugin caches are separate, plugin-scoped, regenerable JSON build-time data. Neither belongs to request runtime.

When implementing a command, keep parsing, reporting, exit behavior, and mutation boundaries explicit. Report failures safely; do not swallow errors or leave a successful exit code after a known failed health check.
