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

Declared in `pageTypes[].outputDependencies` for a plugin page, root `outputDependencies`, or `context.output.emit(..., { dependencies })`.
Use narrow dependencies when possible; use `unknown` only when scope cannot be stated.

## Related terms

- [[glossary/build-dependency|Build Dependency]]
- [[fingerprint|Fingerprint]]
- [[output-inventory|Output Inventory]]
- [[glossary/cache|Cache]]

## Learn more

- [Output Dependency](../framework/build-dependency.md)
