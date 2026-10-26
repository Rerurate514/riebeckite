---
date: 2026-10-14
title: Generated Output
sidebar:
  hidden: true
---

# Generated Output

Output produced by a plugin, distinct from content outputs. Generated outputs have owners and dependencies, and their regeneration is driven by output dependency declarations.

## Ownership and dependencies

Each generated output has a `producer` (e.g., `plugin:${output.owner}`) and a list of `dependencies` of type `OutputDependency`. Without declared dependencies, a generated output is `unknown`, which triggers full output regeneration.

## Dependency Types for Generated Output

Each generated output has a `producer` (e.g., `plugin:${output.owner}`) and a list of `dependencies` of type `OutputDependency`. The dependency types and their meanings are:

- `content { slug }` — That content changed.
- `tag { tag }` — Content carrying that tag changed.
- `folder { folder }` — Content in that folder changed.
- `global` — Any content changed.
- `unknown` — Always triggers full output regeneration. Without declared dependencies, a generated output is `unknown`.

## Comparison with content outputs

Content outputs are owned by content entries and have `content` type dependencies.
Generated outputs are owned by plugins and can have arbitrary dependency types. This distinction is important for incremental SSG: content outputs can be selectively invalidated based on their `content` dependencies, while generated outputs with `unknown` dependencies force full output regeneration.

Examples of generated output dependency declarations:

```json
// Generated output with content dependency
{
  "kind": "generated",
  "path": "/js/bundle.js",
  "producer": "plugin:remark-gfm",
  "dependencies": [{ "type": "content", "slug": "blog-post-1" }]
}

// Generated output with unknown dependency (triggers full regeneration)
{
  "kind": "generated",
  "path": "/api/data.json",
  "producer": "plugin:custom-plugin",
  "dependencies": [{ "type": "unknown" }]
}

## Related terms

- [[ssg|SSG]]
- [[output-cache|Output Cache]]
- [[output-dependency|Output Dependency]]

## Learn more

- [Build System](../framework/build-system.md)
