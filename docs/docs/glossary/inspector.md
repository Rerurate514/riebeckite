---
title: Inspector
sidebar:
  hidden: true
---

# Inspector

A read-only CLI command for viewing already-resolved state, including config, plugins, content, graph, and build state.

## Read-only guarantee

Must not run a build, write caches/assets/state, emit assets, render special artifacts, or auto-fix configuration.
If the requested information does not exist, report that condition plainly.

## Commands

`riebeckite inspect config` — resolved configuration.
`riebeckite inspect plugins` — enabled plugins.
`riebeckite inspect content --list` — published content and URLs.
`riebeckite inspect graph` — content graph relationships.
`riebeckite inspect build` — incremental build state.

## Inspection Details

Each inspect command reads resolved state without triggering any build work:

- **`riebeckite inspect config`** shows the resolved configuration that Riebeckite actually uses after defaults and processing are applied. This is not the raw values written in the config file.

- **`riebeckite inspect plugins`** shows the plugins that are currently enabled. Use this to check whether a plugin you intended to add is really being loaded.

- **`riebeckite inspect content --list`** lists the content Riebeckite recognizes, with each entry's resolved canonical permalink. This is useful for confirming which URL a particular article is recognized as, regardless of the filesystem location.

- **`riebeckite inspect graph`** shows the relationships between content, useful for investigating WikiLinks, backlinks, or graph extensions.

- **`riebeckite inspect build`** shows the state used by incremental builds. If a valid state exists, its information is displayed. If the state is unavailable, the reason is shown (e.g., state file does not exist, JSON is malformed, state version does not match, structure is unrecognized). Inspector never creates a new state or rewrites the existing one.

### Read-only guarantee in practice

Inspector is deliberately read-only: it must not run a build, write incremental state or plugin cache, emit assets, render special artifacts, invoke Vite/HonoX build work, or auto-fix problems. This property makes Inspector safe to use not only during development but also in CI.

### Example

```sh
# Inspect the current build state
riebeckite inspect build

# Output shows whether incremental state exists and its validity,
# without modifying any state or triggering a build.
```
## Related terms

- [[check|Check]]
- [[doctor|Doctor]]
- [[build|Build]]

## Learn more

- [Inspector](../framework/inspector.md)
