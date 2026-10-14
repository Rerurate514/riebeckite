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

## Integration responsibilities in detail
The integration acts as the bridge between Riebeckite Core and the host framework (e.g., HonoX + Vite). Its key responsibilities include:

- **Route resolution**: Resolves incoming request paths to pages using `resolveRiebeckiteRoute` (`@riebeckite/honox`). The resolution order is: plugin page check → content resolution via `publicLocation` → redirect check → 404.
- **Output generation**: Renders page HTML and writes generated files (sitemap, robots, feeds) through the SEO plugin.
- **Deployment connection**: Connects the built output to a hosting target, such as Cloudflare Workers. The integration does not own content interpretation — Core handles content processing and location resolution, while the integration connects to delivery.

```ts
import { resolveRiebeckiteRoute } from "@riebeckite/honox";
const result = resolveRiebeckiteRoute(content, requestPath);
```

Swapping the integration does not change how content is interpreted, because Core's content processing and manifest resolution remain independent of the integration choice.

## Related terms

## Boundary

Core owns content processing and location resolution. The integration owns rendering and delivery, so swapping the integration does not change how content is interpreted.
