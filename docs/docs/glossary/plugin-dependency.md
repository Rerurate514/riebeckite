---
title: Plugin Dependency
sidebar:
  hidden: true
---

# Plugin Dependency

A capability-based relationship between plugins. Each plugin declares provides, requires, and optional capabilities, and Core resolves the order by topological sort, failing when a required capability is missing.

## Role

- Orders plugins and reports missing capabilities.
- Uses declared capabilities rather than import order.

## Related terms

- [[plugin|Plugin]]
- [[lifecycle-hook|Lifecycle Hook]]
- [[content-hook|Content Hook]]
- [[glossary/diagnostics|Diagnostics]]

## Learn more

- [Plugin API](../reference/plugin-api.md)
- [Plugin System](../framework/plugin-system.md)
