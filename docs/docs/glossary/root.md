---
title: Root
sidebar:
  hidden: true
---

# Root

A base directory that Riebeckite resolves other paths against, such as the application root and the content root. Resolving against a stable root keeps paths portable across machines.

## Application root and content root
Riebeckite defines two root directories:

| Root | Meaning |
| --- | --- |
| Application root | The directory the site is built from; defaults to the Vite/project root |
| Content root | The directory content is read from; configured via `content.directory` in the config |

The application root is used as the base for resolving relative paths in the config, environment variables, and integration settings. The content root is what the [Content Source](./content-source.md) scans for Markdown files. Relative paths in the config are resolved against the application root, so the same config works on another machine.

## Root resolution in honox integration
The `@riebeckite/honox` integration resolves roots through `resolveHonoxApplication` which determines `appRoot` and `configRoot`. By default, `appRoot` defaults to the Vite root and `configRoot` defaults to `appRoot`. A config path is imported relative to `configRoot`; `content.directory` is resolved relative to `appRoot`.

```ts
// Example: content.directory resolved relative to appRoot
content: {
  directory: "./content",
}
```

## Portable paths
Relative paths in the config are resolved against the application root, so the same config works on another machine. The content root is what the [Content Source](./content-source.md) scans.
