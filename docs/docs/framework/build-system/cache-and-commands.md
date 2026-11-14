---
date: 2026-10-06
title: Cache and commands
sidebar.label: Cache and commands
sidebar.order: 30
---
# Cache and commands

## Plugin cache

[[glossary/plugin-cache|Plugin cache]] is a mechanism for a plugin itself to store intermediate results
temporarily.

For example, when the same computation does not need to run on every build, a
plugin can store the result and reuse it on the next build.

[[glossary/plugin|Plugin]] cache has the following characteristics:

- stored separately per plugin
- handles data that can be stored as JSON
- can be regenerated after deletion
- used to speed up the build

A site must still build correctly even without the plugin cache.

Plugin cache and incremental build information are used only at build time; they
are not data that Workers read and write after publication.

## The `.riebeckite` directory

`.riebeckite` stores the data Riebeckite uses for builds, such as caches and the
previous build information.

This is not content created by the user. Riebeckite therefore does not scan the
`.riebeckite` directory when it looks for content such as Markdown.

## Commands and lifecycle

```sh
pnpm build                 # configured project build
pnpm exec riebeckite build # content/application build
pnpm exec riebeckite build --full
pnpm exec riebeckite profile --full
```

Use `check` for validation and `doctor` for health diagnostics; neither substitutes for a build. Use `inspect` to view existing state, never to manufacture it. See [CLI](../../reference/cli.md), [Inspector](../inspector.md), and [Content system](../content-system.md).

### Build vs. other commands

`check`, `doctor`, and `inspect` each have a role distinct from `build`.

| Command | Main role |
| --- | --- |
| `build` | Generate the web site |
| `build --full` | Generate the web site without the previous build information |
| `profile` | Measure build processing time |
| `check` | Validate the configuration and plugin composition |
| `doctor` | Diagnose whether the project has problems |
| `inspect` | View stored build information |

A successful `check` or `doctor` does not guarantee that an actual build will
succeed.

Also, `inspect` is a command for viewing information that already exists. It is
not a command for creating new build information.
