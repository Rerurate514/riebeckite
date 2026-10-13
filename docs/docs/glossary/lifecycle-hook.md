---
title: Lifecycle Hook
sidebar:
  hidden: true
---

# Lifecycle Hook

A plugin hook that runs at a build phase, such as setup, buildStart, buildEnd, or dispose. Hooks run in dependency order, and setup and dispose run in reverse order.

## Role

- Runs plugin code at defined build phases.
- Runs in dependency order around the build.

## Related terms

- [[plugin|Plugin]]
- [[content-hook|Content Hook]]
- [[plugin-dependency|Plugin Dependency]]
- [[build|Build]]

## Learn more

- [Plugin Lifecycle](../framework/plugin-system/lifecycle.md)
- [Plugin API](../reference/plugin-api.md)
