# Dependency patches

## @hono/vite-ssg@0.3.3

`@hono/vite-ssg` creates an internal Vite server during SSG but does not
forward the resolved Vite `root` and `define` options.

Riebeckite/HonoX requires the correct Vite root so that HonoX expressions
such as:

`import.meta.glob('/app/routes/**')`

are transformed correctly.

Without this patch, SSG fails with:

`TypeError: (intermediate value).glob is not a function`

The patch forwards:

- `config.root`
- `config.define`

to the internal `createServer()` call.

Do not remove this patch unless the upstream implementation starts
forwarding these options or provides an equivalent API.
