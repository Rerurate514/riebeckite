---
date: 2026-10-14
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

## Route resolution order
The integration resolves routes in this specific order, defined in `@riebeckite/honox`:

1. **Plugin page**: Check if a plugin provides a page type for the path
2. **Content**: Resolve content from the manifest using `publicLocation`
3. **Redirect**: Check for an extra URL pointing to the permalink
4. **404**: Return not-found if no match is found

This resolution order ensures that plugin-provided pages take precedence, followed by content pages, then redirects, with a 404 fallback for unmatched paths. The `resolveRiebeckiteRoute` function handles the full resolution pipeline and returns the resolved route result including the page body and head tags.

## Related terms

- [[page|Page]]
- [[page-type|Page Type]]
- [[public-path|Public Path]]
- [[routable|Routable]]

## Learn more

- [../framework/honox-integration.md]