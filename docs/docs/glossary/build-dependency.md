---
date: 2026-10-14
title: Build Dependency
sidebar:
  hidden: true
---

# Build Dependency

The contract between Core and plugins that declares how processed content and emitted files depend on inputs between builds.

## Content dependency

Plugin declares `dependencyMode` (none, tracked, global, unsafe) on `processedContentCache`.
Core records reads made through Core's content APIs as dependencies with stable identities.
Content, file, and link dependencies are recorded and compared on later builds.

## Output dependency

Output dependencies are separate from content dependencies. Each type reacts to a different part of the change set.

| Type | Affected when |
| --- | --- |
| `content { slug }` | That content changed. |
| `tag { tag }` | Content carrying that tag changed. |
| `folder { folder }` | Content in that folder changed. |
| `global` | Any content changed. |
| `unknown` | Always. Core also requests full output regeneration. |

## Dependency Declaration Sites

Output dependencies can be declared in the following places:

- `pageTypes[].outputDependencies` for a plugin page.
- Root `outputDependencies` for a plugin that updates existing manifest entry HTML in `onManifestCreated`. Core adds them to every content output.
- `context.output.emit(..., { dependencies })` for a generated output. Without declared dependencies, a generated output is `unknown`, which triggers full output regeneration.

The dependency types and their effects are:

| Type | Description |
| --- | --- |
| `content { slug }` | Triggers regeneration when specific content slug changes. |
| `tag { tag }` | Triggers regeneration when any content carrying that tag changes. |
| `folder { folder }` | Triggers regeneration when content in that folder changes. |
| `global` | Triggers regeneration when any content changes, regardless of source. |
| `unknown` | Triggers full output regeneration always; used when scope cannot be stated. |

Use `content`, `tag`, or `folder` when the scope is known, and `global` for a manifest-wide collection transform. Use `unknown` only when the input cannot be represented completely. An incorrect output declaration can preserve a stale file, so `unknown` deliberately trades incremental SSG for a full output render.

## Related terms

- [[cache-invalidation|Cache Invalidation]]
- [[output-dependency|Output Dependency]]
- [[fingerprint|Fingerprint]]
- [[plugin-dependency|Plugin dependency]]

## Learn more

- [Build Dependency](../framework/build-dependency.md)
