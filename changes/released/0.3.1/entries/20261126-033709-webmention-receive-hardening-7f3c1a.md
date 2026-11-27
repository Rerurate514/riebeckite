---
packages:
  - "@riebeckite/webmention-cloudflare"
  - "@riebeckite/plugin-webmention"
type: security
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

Webmention receive endpoints no longer trust client-supplied proxy headers for rate limiting: the plugin applies a best-effort limit per handler instance, and `@riebeckite/webmention-cloudflare` adds a D1-backed rate limiter for durable per-client limits. Cloudflare deployments must apply `migrations/0002_webmention_rate_limits.sql`.
