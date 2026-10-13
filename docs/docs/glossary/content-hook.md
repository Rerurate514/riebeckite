---
title: Content Hook
sidebar:
  hidden: true
---

# Content Hook

A plugin hook that observes or extends a content processing phase, such as onContentLoaded, onPostParsed, onPostProcessed, or onManifestCreated. Post and manifest hooks run even when the content cache hits.

## Role

- Lets plugins observe or adjust content processing.
- Runs for every build at the manifest stage.

## Related terms

- [[plugin|Plugin]]
- [[lifecycle-hook|Lifecycle Hook]]
- [[renderer|Renderer]]
- [[glossary/build-dependency|Build Dependency]]

## Learn more

- [Plugin API](../reference/plugin-api.md)
- [Build Dependency Contract](../framework/build-dependency.md)
