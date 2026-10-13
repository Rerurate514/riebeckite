---
title: Integration
sidebar:
  hidden: true
---

# Integration

The package that connects Core's content and pages to a rendering and deployment stack, such as HonoX and Vite. It renders routes and writes output without owning content logic.

## Responsibilities

- Render [pages](./page.md) and plugin page types through routes.
- Write the generated output.
- Connect the site to a deployment target.

## Boundary

Core owns content processing and location resolution. The integration owns rendering and delivery, so swapping the integration does not change how content is interpreted.
