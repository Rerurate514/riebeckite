---
packages:
  - "@riebeckite/honox"
  - "@riebeckite/plugin-webmention"
  - "@riebeckite/plugin-analytics"
  - "@riebeckite/plugin-rich-embed"
  - "@riebeckite/dev-inspector"
  - "create-riebeckite"
type: security
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

Harden the framework against request and network abuse: cap plugin endpoint request bodies at 1 MiB, make Webmention source verification fail closed and pin the validated DNS address, add a best-effort receive rate limit and a bounded memory store, require HTTPS for analytics collectors except on localhost, sandbox rich-embed iframes, compare the development inspector token in constant time, and pin GitHub Actions to commit SHAs. Update `@hono/node-server` to 2.1.3 and `minimatch` to 11.0.1.
