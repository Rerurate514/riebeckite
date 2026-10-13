---
title: Route
sidebar:
  hidden: true
---

# Route

The URL path the integration resolves to a page; produced from the page's public path and rendered by the framework (HonoX).

## Route resolution

The integration resolves routes in this order:

1. **Plugin page**: check if a plugin provides a page type for the path
2. **Content**: resolve content from the manifest using `publicLocation`
3. **Redirect**: check for an extra URL pointing to the permalink
4. **404**: return not-found

```ts
import { resolveRiebeckiteRoute } from "@riebeckite/honox";

const result = resolveRiebeckiteRoute(content, requestPath);
```

## Related terms

- [[page|Page]]
- [[page-type|Page Type]]
- [[public-path|Public Path]]
- [[routable|Routable]]

## Learn more

- [../framework/honox-integration.md]