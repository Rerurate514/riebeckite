# Riebeckite analytics Cloudflare templates

Deploy analytics as an independent Worker; leave the static Riebeckite site's
Worker configuration and entry point unchanged.

Choose **one** template:

- [`d1`](./d1/): aggregate-only, atomic page-view increments and read APIs.
- [`kv`](./kv/): minimal best-effort event capture, with no reporting APIs.

Both templates require replacing the example allowed origin with the site that
will send browser events. Configure that Worker URL plus `/events` as
`@riebeckite/plugin-analytics`'s public `collectorUrl`.

The D1 template also wires an optional per-IP rate limiter. It is a mitigation
for forged events, not authentication, and does not fully prevent page-view
pollution.
