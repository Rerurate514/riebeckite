---
title: SSG
sidebar:
  hidden: true
---

# SSG

Static site generation in Riebeckite, where the build renders the site to files ahead of time. Core handles content and locations, and the integration connects to HonoX and Vite to render routes and write output.

## Role

- Renders the site to static files before deployment.
- Uses the output cache to reuse unchanged routes.

## Related terms

- [[build|Build]]
- [[output-inventory|Output Inventory]]
- [[glossary/deployment|Deployment]]
- [[incremental-build|Incremental Build]]

## Learn more

- [HonoX Integration](../framework/honox-integration.md)
- [Build System](../framework/build-system.md)
