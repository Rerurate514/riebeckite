---
date: 2026-11-01
title: Frontmatter Transformer
---
# Frontmatter Transformer

Safe bulk frontmatter transformations through namespaced CLI commands. The
plugin reuses the existing Content Migration planner, mutation journal, history,
and rollback; it does not implement a separate migration engine.

[日本語](./frontmatter-transformer.ja.md)

## Overview

```ts
import { defineConfig } from "@riebeckite/core";
import { frontmatterTransformer } from "@riebeckite/plugin-frontmatter-transformer";

export default defineConfig({
  // ...
  plugins: [frontmatterTransformer()],
});
```

The plugin adds the `frontmatter` command namespace. Every command requires a
project and discovers the content root from the resolved configuration.

```sh
riebeckite frontmatter presets
riebeckite frontmatter plan --preset normalize-tags
riebeckite frontmatter apply --preset normalize-tags --apply
riebeckite frontmatter history
riebeckite frontmatter rollback <plan-id> --apply
```

`plan` and `apply` are dry runs unless `--apply` is passed. `apply` without
`--apply` prints the same plan summary without writing files. Repeat
`--preset` to combine presets in one plan.

## Before and after

Given this frontmatter:

```yaml
---
title: "  Writing guide  "
tags: "#guides, setup, guides"
description: "  "
---
```

run:

```sh
riebeckite frontmatter apply --preset normalize-tags --preset trim-text
```

The plan reports one changed file. Re-run with `--apply` to write it:

```sh
riebeckite frontmatter apply --preset normalize-tags --preset trim-text --apply
```

The result is:

```yaml
---
title: Writing guide
tags:
  - guides
  - setup
---
```

`normalize-tags` removes the leading `#`, splits on commas, and removes
duplicates. `trim-text` trims `title` and removes the empty `description`.
YAML key order and formatting may change when the file is rewritten.

Example plan output (the plan ID varies):

```text
Migration plan <plan-id>
Presets: normalize-tags@1, trim-text@1
Changed files: 1
Created: 0, moved: 0, frontmatter: 1
```

Example apply output (the journal path varies):

```text
Applied 1 file change(s); mutation journal .riebeckite/migrations/<plan-id>/journal.json.
```

## Presets

| Preset | Description |
| ------ | ----------- |
| `normalize-tags` | Split string or comma-separated tags and remove duplicates |
| `trim-text` | Trim `title` and `description`, removing fields that become empty |
| `remove-empty-fields` | Remove empty `description`, `image`, `tags`, and `aliases` |

A preset is a versioned Content Migration definition. It is resolved through
the same registry and planner as project migrations. Unknown preset names fail
before any file is read or written.

## Commands

| Command | Description |
| ------- | ----------- |
| `frontmatter presets` | List available presets |
| `frontmatter plan --preset <name>` | Plan changes without writing |
| `frontmatter apply --preset <name>` | Dry run unless `--apply` is passed |
| `frontmatter history` | Show recent migration runs |
| `frontmatter rollback <plan-id>` | Dry run unless `--apply` is passed |

`plan` accepts `--out <path>` to save the plan. `apply` accepts `--plan <path>`
to use a saved plan; the engine re-plans and rejects a stale plan if the content
or preset definitions changed. `history` accepts `--limit`. Commands return JSON
when `--json` is passed.

## State and safety

Plans, state, history, and mutation journals live under the content directory's
`.riebeckite/migrations` by default. Writes use the existing FileSystem content
mutation pipeline: path validation, symlink checks, atomic writes, a lock file,
SHA-256 fingerprints, backups, and recovery of interrupted runs. Rollback
restores the journal backups for the selected plan.

Nothing is deleted automatically outside the selected preset fields. Review a
plan before applying it, especially when combining presets.

## Related

- [CLI extension](../reference/cli-extension.md)
- [Content migrations](../reference/cli.md)
- [Plugin system](../reference/plugin-api.md)
