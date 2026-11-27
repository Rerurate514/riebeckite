# Riebeckite v0.3.1

Released 2026-11-27.

### Fixed

- Try both IPv4 and IPv6 loopback addresses when waiting for the development server, so sites bound only to `::1` no longer report a false startup failure after five minutes.
  Packages: `@riebeckite/cli`, `@riebeckite/honox`

### Security

- Webmention receive endpoints no longer trust client-supplied proxy headers for rate limiting: the plugin applies a best-effort limit per handler instance, and `@riebeckite/webmention-cloudflare` adds a D1-backed rate limiter for durable per-client limits. Cloudflare deployments must apply `migrations/0002_webmention_rate_limits.sql`.
  Packages: `@riebeckite/webmention-cloudflare`, `@riebeckite/plugin-webmention`

---

Full changelog: https://github.com/Rerurate514/riebeckite/blob/v0.3.1/CHANGELOG.md
Compare: https://github.com/Rerurate514/riebeckite/releases/tag/v0.3.1
