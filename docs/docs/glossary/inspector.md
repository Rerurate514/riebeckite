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

## Related terms

- [[check|Check]]
- [[doctor|Doctor]]
- [[build|Build]]

## Learn more

- [Inspector](../framework/inspector.md)
