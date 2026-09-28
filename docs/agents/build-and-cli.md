# Build and CLI Rules for Agents

Use the CLI from the application directory:

```text
dev | check | doctor | build [--full] | profile [--full]
inspect [config | plugins | content [--list] | graph | build]
```

`check` validates resolved configuration, enabled plugins, and capabilities; it is not a build. `doctor` reports environment/config/plugin/content/diagnostic/build-state health and continues independent checks where possible. A failed doctor result must produce a failing exit status.

Inspector is strictly read-only. Never use it to build, write state/cache/assets, run Vite/HonoX build work, render artifacts solely to inspect them, or auto-fix problems. Use an explicit `build` for mutation.

Incremental state is `.riebeckite/build/content-state.json`, application-scoped and saved after success only. It is an optimization, not truth: missing/incompatible/unsafe inputs require initial or full processing. Plugin caches are separate, plugin-scoped, regenerable JSON build-time data. Neither belongs to request runtime.

When implementing a command, keep parsing, reporting, exit behavior, and mutation boundaries explicit. Report failures safely; do not swallow errors or leave a successful exit code after a known failed health check.
