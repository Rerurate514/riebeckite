---
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

Output dependencies are separate from content dependencies.
Types include `content`, `tag`, `folder`, `global`, and `unknown`.
Used to decide which emitted files Core writes again after a change.

## Related terms

- [[cache-invalidation|Cache Invalidation]]
- [[output-dependency|Output Dependency]]
- [[fingerprint|Fingerprint]]
- [[plugin-dependency|Plugin dependency]]

## Learn more

- [Build Dependency](../framework/build-dependency.md)
