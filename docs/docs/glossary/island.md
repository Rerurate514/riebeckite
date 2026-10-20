---
title: Island
sidebar:
  hidden: true
---

# Island

Islands are client-hydratable components embedded within server-rendered content; they enable interactive UI sections without hydrating the entire page. Island components are defined by the site application, not plugins.

## Island pattern

Islands allow interactive components (e.g., widgets, charts) to be rendered on the server and hydrated only on the client where needed. This reduces JavaScript payload and improves time-to-interactive.

## Site responsibility

The site application owns island placement, routing, and hydration. Plugins may expose server-rendered components, but island logic resides in the app layer.

## Related terms

- [[plugin|Plugin]]
- [[renderer|Renderer]]
- [[page-type|Page Type]]

## Learn more

- [HonoX UI](../framework/honox-integration/ui.md)
- [Plugin API](../reference/plugin-api.md)
