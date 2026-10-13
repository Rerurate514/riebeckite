---
title: Generated Output
sidebar:
  hidden: true
---

# Generated Output

Output produced by a plugin, distinct from content outputs. Generated outputs have owners and dependencies, and their regeneration is driven by output dependency declarations.

## Ownership and dependencies

Each generated output has a `producer` (e.g., `plugin:${output.owner}`) and a list of `dependencies` of type `OutputDependency`.
Without declared dependencies, a generated output is `unknown`, which triggers full output regeneration.

## Comparison with content outputs

Content outputs are owned by content entries and have `content` type dependencies.
Generated outputs are owned by plugins and can have arbitrary dependency types.

## Related terms

- [[ssg|SSG]]
- [[output-cache|Output Cache]]
- [[output-dependency|Output Dependency]]

## Learn more

- [Build System](../framework/build-system.md)
