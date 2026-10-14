---
title: Doctor
sidebar:
  hidden: true
---

# Doctor

The CLI command that diagnoses the project broadly, checking environment, config, plugins, content, and build state.

## What it checks

Environment, config, plugins, content sources, and build state.
Continues independent checks where possible; exits unsuccessfully when health checks fail.

## Role

Does not substitute for a build. A failing doctor result exits unsuccessfully.
1つの診断に失敗しても、安全に続行できる独立した診断は可能な限り継続する。

## Check Details

`riebeckite doctor` performs independent checks across these areas:

- **Environment** — project root directory exists, configuration file is readable
- **Config** — configuration validation (same as `check`), plugin dependency resolution
- **Plugins** — all registered plugins can be loaded and their options are valid
- **Content** — content sources are scannable, no invalid or duplicate logical paths
- **Build State** — incremental build state is valid fingerprints match current content

Each check runs independently; a failure in one area does not prevent other areas from being checked. The command exits with a non-zero code if any check reports an error.

### Example

```sh
# Doctor diagnoses project health
npm exec riebeckite doctor

# Output reports per-area status, e.g.:
# ✓ Environment
# ✓ Config
# ✓ Plugins (3 resolved)
# ✓ Content (12 entries)
# ⚠ Build State: stale, will fall back to full build
```
## Related terms

- [[check|Check]]
- [[glossary/inspector|Inspector]]
- [[build|Build]]

## Learn more

- [CLI](../reference/cli.md)
