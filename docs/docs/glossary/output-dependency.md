---
title: Output Dependency
sidebar:
  hidden: true
---

# Output Dependency

Output dependencies decide which emitted files are affected by content changes and need to be regenerated.

## Dependency types

`content { slug}` — That content changed.
`tag { tag }` — Content carrying that tag changed.
`folder { folder }` — Content in that folder changed.
`global` — Any content changed.
`unknown` — Always triggers full output regeneration.

## Declaration

Declared in `pageTypes[].outputDependencies` for a plugin page, root `outputDependencies`, or `context.output.emit(..., { dependencies })`. Use narrow dependencies when possible; use `unknown` only when scope cannot be stated.

## Declaration Details

### Content Dependency (`content { slug }`)

When a content entry identified by `slug` changes, all outputs with a `content` dependency on that slug are marked as affected. The slug matches the content's permalink-derived slug. This is the most common dependency type and enables fine-grained invalidation when specific pages change.

### Tag Dependency (`tag { tag }`)

When any content carrying the specified `tag` changes, all outputs with a `tag` dependency on that tag are marked as affected. This enables regeneration when content with a particular tag is modified, without needing to track individual content slugs.

### Folder Dependency (`folder { folder }`)

When any content in the specified `folder` changes, all outputs with a `folder` dependency on that folder are marked as affected. Folder paths are determined by the directory structure of content slugs (e.g., `blog/post.md` belongs to the `blog` folder).

### Global Dependency (`global`)

When any content changes, all outputs with a `global` dependency are marked as affected. This is the broadest dependency type and should be used when an output depends on content changes that cannot be narrowed to specific slugs, tags, or folders.

### Unknown Dependency (`unknown`)

Without declared dependencies, a generated output is `unknown`, which always triggers full output regeneration. This is the fallback when the input scope cannot be represented by any other dependency type. `unknown` deliberately trades incremental SSG for a full output render, ensuring correctness at the cost of build performance.

## Related terms

- [[glossary/build-dependency|Build Dependency]]
- [[fingerprint|Fingerprint]]
- [[output-inventory|Output Inventory]]
- [[glossary/cache|Cache]]

## Learn more

- [Output Dependency](../framework/build-dependency.md)
